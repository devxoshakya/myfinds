import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import type { Database } from "@myfinds/db";

import { ENV } from "../env.server";

export class MatchNotFoundError extends Error {
  constructor() {
    super("Match was not found.");
    this.name = "MatchNotFoundError";
  }
}

export class ClaimNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimNotAllowedError";
  }
}

export class ClaimNotFoundError extends Error {
  constructor() {
    super("Claim was not found.");
    this.name = "ClaimNotFoundError";
  }
}

export class ClaimAlreadyDecidedError extends Error {
  constructor() {
    super("This claim was already decided.");
    this.name = "ClaimAlreadyDecidedError";
  }
}

export class ClaimAttemptsExhaustedError extends Error {
  constructor() {
    super("All claim attempts for this match were used.");
    this.name = "ClaimAttemptsExhaustedError";
  }
}

export class InvalidHandoverCodeError extends Error {
  constructor(message = "That handover code is not valid.") {
    super(message);
    this.name = "InvalidHandoverCodeError";
  }
}

const MAX_CLAIM_ATTEMPTS = 3; // BR-17
const HANDOVER_CODE_TTL_MS = 48 * 60 * 60 * 1000;

// AES-256-GCM key derived from the auth secret: one env var instead of a
// dedicated HANDOVER_CODE_KEY, and the plaintext code is never stored (S1).
const codeKey = createHash("sha256").update(ENV.BETTER_AUTH_SECRET).digest();

function encryptCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", codeKey, iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}.${cipher.getAuthTag().toString("hex")}.${ciphertext.toString("hex")}`;
}

function decryptCode(stored: string): string {
  const [ivHex, tagHex, ciphertextHex] = stored.split(".");
  if (!ivHex || !tagHex || !ciphertextHex) throw new InvalidHandoverCodeError();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    codeKey,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

/** Claimant-facing read of the issued code (TLS-only transport, never stored). */
export function readHandoverCode(stored: string): string {
  return decryptCode(stored);
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** One-time 6-digit code: returns plaintext + encrypted form + expiry (S1). */
export function issueHandoverCode(): { code: string; enc: string; expiresAt: Date } {
  const code = generateCode();
  return {
    code,
    enc: encryptCode(code),
    expiresAt: new Date(Date.now() + HANDOVER_CODE_TTL_MS),
  };
}

function constantTimeEquals(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return (
    leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
  );
}

/**
 * Who may review/decide/hand over claims for a found report: the finder who
 * holds the item, station staff of the custody station, or an admin (BR-22).
 */
export function isCustodian(
  foundReport: {
    reporterId: string;
    custodian: "FINDER" | "STATION" | null;
    custodyStationId: string | null;
  },
  actor: { userId: string; role: string; stationIds: readonly string[] },
): boolean {
  if (actor.role === "ADMIN") return true;
  if (foundReport.custodian === "FINDER") return foundReport.reporterId === actor.userId;
  return (
    foundReport.custodian === "STATION" &&
    Boolean(foundReport.custodyStationId) &&
    actor.stationIds.includes(foundReport.custodyStationId!)
  );
}

/**
 * The lost report owner claims a suggested match (BR-15): one attempt per
 * claim, max 3 per match, counted on the Match row in the same transaction.
 */
export async function createClaim(
  database: Database,
  input: {
    matchId: string;
    claimantId: string;
    answers: string[];
  },
) {
  const match = await database.match.findUnique({
    where: { id: input.matchId },
    select: {
      id: true,
      status: true,
      attemptsUsed: true,
      lost: { select: { id: true, reporterId: true, status: true } },
      found: { select: { id: true, status: true } },
    },
  });
  if (!match) throw new MatchNotFoundError();
  if (match.lost.reporterId !== input.claimantId) {
    throw new ClaimNotAllowedError("You can only claim matches on your own reports.");
  }
  if (match.status !== "SUGGESTED" && match.status !== "REJECTED") {
    throw new ClaimNotAllowedError("This match is no longer open for claims.");
  }
  if (match.attemptsUsed >= MAX_CLAIM_ATTEMPTS) throw new ClaimAttemptsExhaustedError();
  if (
    !["SUBMITTED", "MATCHING", "MATCH_FOUND", "RECEIVED_BY_STOP", "CLAIMED"].includes(
      match.found.status,
    )
  ) {
    // Returned, verified, expired or withdrawn items are not claimable; this
    // mirrors canMatch() so any matchable found report accepts a claim.
    throw new ClaimNotAllowedError("This item is not open for claims right now.");
  }

  const attemptNo = match.attemptsUsed + 1;
  const lostStatus = match.lost.status;
  let createdClaimId = match.id;
  await database.$transaction(async (transaction) => {
    const created = await transaction.claim.create({
      data: {
        matchId: match.id,
        claimantId: input.claimantId,
        attemptNo,
        answers: input.answers.map((text) => ({ questionId: null, text })),
      },
    });
    createdClaimId = created.id;
    await transaction.match.update({
      where: { id: match.id },
      data: { status: "CLAIMED", attemptsUsed: { increment: 1 } },
    });
    await transaction.report.update({
      where: { id: match.lost.id },
      data: { status: "CLAIMED" },
    });
    await transaction.statusHistory.create({
      data: {
        reportId: match.lost.id,
        fromStatus: lostStatus,
        toStatus: "CLAIMED",
        actorId: input.claimantId,
        actorRole: "USER",
        action: "CLAIM_SUBMITTED",
      },
    });
  });

  return { claimId: createdClaimId, attemptNo, decision: "PENDING" as const };
}

type ClaimActor = {
  userId: string;
  role: string;
  stationIds: readonly string[];
};

async function loadClaimForActor(
  database: Database,
  claimId: string,
  actor: ClaimActor,
) {
  const claim = await database.claim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      decision: true,
      handoverCodeEnc: true,
      handoverExpiresAt: true,
      handedOverAt: true,
      match: {
        select: {
          id: true,
          attemptsUsed: true,
          lost: { select: { id: true, status: true } },
          found: {
            select: {
              id: true,
              status: true,
              reporterId: true,
              custodian: true,
              custodyStationId: true,
            },
          },
        },
      },
    },
  });
  if (!claim) throw new ClaimNotFoundError();
  if (!isCustodian(claim.match.found, actor)) {
    throw new ClaimNotAllowedError("Only the custodian of this item can do that.");
  }
  return claim;
}

/**
 * Custodian verdict on a claim (BR-18..BR-20). APPROVED verifies both reports
 * and issues the one-time handover code; REJECTED frees the lost report for
 * its other matches and locks the pair after the third rejection.
 */
export async function decideClaim(
  database: Database,
  claimId: string,
  input: { decision: "APPROVED" | "REJECTED" } & ClaimActor,
) {
  const claim = await loadClaimForActor(database, claimId, input);
  if (claim.decision !== "PENDING") throw new ClaimAlreadyDecidedError();

  const { match } = claim;
  const handover =
    input.decision === "APPROVED" ? issueHandoverCode() : null;

  await database.$transaction(async (transaction) => {
    await transaction.claim.update({
      where: { id: claim.id },
      data: {
        decision: input.decision,
        decidedById: input.userId,
        decidedAt: new Date(),
        ...(handover
          ? { handoverCodeEnc: handover.enc, handoverExpiresAt: handover.expiresAt }
          : {}),
      },
    });

    if (input.decision === "APPROVED") {
      await transaction.match.update({
        where: { id: match.id },
        data: { status: "VERIFIED" },
      });
      for (const side of [match.lost, match.found]) {
        await transaction.report.update({
          where: { id: side.id },
          data: { status: "VERIFIED" },
        });
        await transaction.statusHistory.create({
          data: {
            reportId: side.id,
            fromStatus: side.status,
            toStatus: "VERIFIED",
            actorId: input.userId,
            actorRole: input.role,
            action: "CLAIM_APPROVED",
          },
        });
      }
      return;
    }

    // Rejected: the pair is done either way; after three rejections it locks.
    await transaction.match.update({
      where: { id: match.id },
      data: { status: match.attemptsUsed >= MAX_CLAIM_ATTEMPTS ? "LOCKED" : "REJECTED" },
    });
    await transaction.report.update({
      where: { id: match.lost.id },
      data: { status: "MATCHING" },
    });
    await transaction.statusHistory.create({
      data: {
        reportId: match.lost.id,
        fromStatus: match.lost.status,
        toStatus: "MATCHING",
        actorId: input.userId,
        actorRole: input.role,
        action: "CLAIM_REJECTED",
      },
    });
  });

  return { decision: input.decision, handoverExpiresAt: handover?.expiresAt ?? null };
}

/**
 * Custodian confirms the physical handover by entering the claimant's
 * one-time code (S1/S2): both reports return, the match completes.
 */
export async function confirmHandover(
  database: Database,
  claimId: string,
  input: { code: string } & ClaimActor,
) {
  const claim = await loadClaimForActor(database, claimId, input);
  if (claim.decision !== "APPROVED" || !claim.handoverCodeEnc) {
    throw new ClaimNotAllowedError("This claim has no handover code yet.");
  }
  if (claim.handedOverAt) throw new ClaimNotAllowedError("This item was already handed over.");
  if (claim.handoverExpiresAt && claim.handoverExpiresAt.getTime() < Date.now()) {
    throw new InvalidHandoverCodeError("This handover code has expired.");
  }
  if (!constantTimeEquals(decryptCode(claim.handoverCodeEnc), input.code)) {
    throw new InvalidHandoverCodeError();
  }

  const { match } = claim;
  await database.$transaction(async (transaction) => {
    await transaction.claim.update({
      where: { id: claim.id },
      data: { handedOverById: input.userId, handedOverAt: new Date() },
    });
    await transaction.match.update({
      where: { id: match.id },
      data: { status: "COMPLETED" },
    });
    for (const side of [match.lost, match.found]) {
      await transaction.report.update({
        where: { id: side.id },
        data: { status: "RETURNED" },
      });
      await transaction.statusHistory.create({
        data: {
          reportId: side.id,
          fromStatus: side.status,
          toStatus: "RETURNED",
          actorId: input.userId,
          actorRole: input.role,
          action: "HANDOVER_COMPLETED",
        },
      });
    }
  });

  return { handedOverAt: new Date().toISOString() };
}
