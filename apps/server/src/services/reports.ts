import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Database } from "@myfinds/db";
import type { z } from "zod";

import {
  createReportSchema,
  type createFoundReportSchema,
} from "@myfinds/shared";

type CreateReportInput = z.infer<typeof createReportSchema>;
type CreateFoundReportInput = z.infer<typeof createFoundReportSchema>;

const REPORT_TTL_DAYS = 60;

export class InvalidReportStationError extends Error {
  constructor(field: "placeStationId" | "handInStationId") {
    super(field);
    this.name = "InvalidReportStationError";
  }
}

export class ReportIdempotencyConflictError extends Error {
  constructor() {
    super("The idempotency key was already used with a different report payload.");
    this.name = "ReportIdempotencyConflictError";
  }
}

type IdempotencyOptions = {
  key: string;
  secret: string;
};

function deriveEncryptionKey(secret: string) {
  return createHash("sha256").update(`myfinds-report-idempotency\0${secret}`).digest();
}

function encryptStatusToken(token: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptStatusToken(value: string, secret: string) {
  const [encodedIv, encodedTag, encodedCiphertext, ...extra] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra.length > 0) {
    throw new Error("Stored report idempotency token is invalid.");
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");
  const ciphertext = Buffer.from(encodedCiphertext, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Stored report idempotency token is invalid.");
  }

  const decipher = createDecipheriv("aes-256-gcm", deriveEncryptionKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function createRequestHash(input: CreateReportInput, secret: string) {
  return createHmac("sha256", secret).update(JSON.stringify(canonicalize(input))).digest("hex");
}

function createKeyHash(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function hashesMatch(left: string, right: string) {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

type ReportIdempotencyReader = Pick<Database, "reportIdempotency">;

async function findIdempotentReport(
  client: ReportIdempotencyReader,
  reporterId: string,
  input: CreateReportInput,
  options: IdempotencyOptions,
) {
  const requestHash = createRequestHash(input, options.secret);
  const record = await client.reportIdempotency.findUnique({
    where: {
      reporterId_keyHash: {
        reporterId,
        keyHash: createKeyHash(options.key),
      },
    },
    select: {
      requestHash: true,
      encryptedStatusToken: true,
      report: {
        select: { id: true, number: true, status: true, statusTokenHash: true },
      },
    },
  });

  if (!record) return null;
  if (!hashesMatch(record.requestHash, requestHash)) throw new ReportIdempotencyConflictError();

  const statusToken = decryptStatusToken(record.encryptedStatusToken, options.secret);
  const storedTokenHash = createHash("sha256").update(statusToken).digest("hex");
  if (!record.report.statusTokenHash || !hashesMatch(record.report.statusTokenHash, storedTokenHash)) {
    throw new Error("Stored report idempotency token failed integrity verification.");
  }

  return {
    reportId: record.report.id,
    reportCode: `MF-${record.report.number}`,
    status: record.report.status,
    statusToken,
  };
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function getIdempotentReport(
  database: Database,
  reporterId: string,
  input: CreateReportInput,
  options: IdempotencyOptions,
) {
  return findIdempotentReport(database, reporterId, input, options);
}

export async function createReport(
  database: Database,
  reporterId: string,
  reporterRole: string,
  input: CreateReportInput,
  idempotency: IdempotencyOptions,
) {
  try {
    return await database.$transaction(async (transaction) => {
      const replay = await findIdempotentReport(transaction, reporterId, input, idempotency);
      if (replay) return replay;

      const statusToken = randomBytes(32).toString("base64url");
      const statusTokenHash = createHash("sha256").update(statusToken).digest("hex");
      const expiresAt = new Date(Date.now() + REPORT_TTL_DAYS * 24 * 60 * 60 * 1000);
      const stationIds = [
        input.placeStationId,
        ...(input.type === "FOUND" && input.custodyChoice === "STATION" && input.handInStationId
          ? [input.handInStationId]
          : []),
      ];
      const activeStations = await transaction.station.findMany({
        where: { id: { in: stationIds }, active: true },
        select: { id: true },
      });
      const activeStationIds = new Set(activeStations.map((station) => station.id));

      if (!activeStationIds.has(input.placeStationId)) {
        throw new InvalidReportStationError("placeStationId");
      }
      if (
        input.type === "FOUND" &&
        input.custodyChoice === "STATION" &&
        input.handInStationId &&
        !activeStationIds.has(input.handInStationId)
      ) {
        throw new InvalidReportStationError("handInStationId");
      }

      const status =
        input.type === "FOUND" && input.custodyChoice === "STATION"
          ? "SUBMITTED_TO_STOP"
          : "SUBMITTED";
      const created = await transaction.report.create({
        data: {
          type: input.type,
          reporterId,
          title: input.title,
          category: input.category,
          description: input.description || null,
          color: input.color || null,
          brand: input.brand || null,
          eventDate: new Date(`${input.eventDate}T00:00:00.000Z`),
          eventTime: input.eventTime || null,
          placeStationId: input.placeStationId,
          placeNote: input.placeNote || null,
          status,
          expiresAt,
          statusTokenHash,
          custodian: input.type === "FOUND" ? input.custodyChoice : null,
          custodyStationId:
            input.type === "FOUND" && input.custodyChoice === "STATION"
              ? input.handInStationId
              : null,
        },
        select: { id: true, number: true, status: true },
      });

      if (input.type === "FOUND" && input.questions.length > 0) {
        const questions: CreateFoundReportInput["questions"] = input.questions;
        await transaction.verificationQuestion.createMany({
          data: questions.map((question, index) => ({
            reportId: created.id,
            position: index + 1,
            question: question.question,
            expectedAnswer: question.expectedAnswer,
          })),
        });
      }

      await transaction.statusHistory.create({
        data: {
          reportId: created.id,
          fromStatus: null,
          toStatus: status,
          actorId: reporterId,
          actorRole: reporterRole,
          action: "CREATED",
        },
      });

      await transaction.reportIdempotency.create({
        data: {
          reporterId,
          keyHash: createKeyHash(idempotency.key),
          requestHash: createRequestHash(input, idempotency.secret),
          reportId: created.id,
          encryptedStatusToken: encryptStatusToken(statusToken, idempotency.secret),
        },
      });

      return {
        reportId: created.id,
        reportCode: `MF-${created.number}`,
        status: created.status,
        statusToken,
      };
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const replay = await findIdempotentReport(database, reporterId, input, idempotency);
    if (replay) return replay;
    throw error;
  }
}
