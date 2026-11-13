import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import {
  ClaimAttemptsExhaustedError,
  ClaimNotAllowedError,
  createClaim,
  decideClaim,
  confirmHandover,
  InvalidHandoverCodeError,
  issueHandoverCode,
  readHandoverCode,
} from "./claims";

const ownedMatch = {
  id: "match-1",
  status: "SUGGESTED",
  attemptsUsed: 0,
  lost: { id: "lost-1", reporterId: "user-1", status: "MATCH_FOUND" },
  found: {
    id: "found-1",
    status: "MATCH_FOUND",
    reporterId: "user-2",
    custodian: "STATION",
    custodyStationId: "station-9",
  },
};

function fakeClaimsDatabase(match: typeof ownedMatch | null) {
  const calls: { claimCreate?: Record<string, unknown>; matchUpdate?: Record<string, unknown> } =
    {};
  const transaction = {
    claim: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.claimCreate = data;
        return { id: "claim-new", ...data };
      },
    },
    match: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        calls.matchUpdate = data;
        return data;
      },
    },
    report: {
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    statusHistory: {
      create: async ({ data }: { data: Record<string, unknown> }) => data,
    },
  };
  const database = {
    match: {
      findUnique: async () => match,
    },
    claim: {
      findUnique: async () =>
        match
          ? {
              id: "claim-1",
              decision: "PENDING",
              handoverCodeEnc: null,
              handoverExpiresAt: null,
              handedOverAt: null,
              match,
            }
          : null,
    },
    $transaction: async <Result>(
      callback: (tx: typeof transaction) => Promise<Result>,
    ) => callback(transaction),
  } as unknown as Database;
  return { database, calls };
}

describe("create claim", () => {
  it("rejects a claim on someone else's lost report", async () => {
    const { database } = fakeClaimsDatabase(ownedMatch);
    await expect(
      createClaim(database, { matchId: "match-1", claimantId: "stranger", answers: ["blue strap"] }),
    ).rejects.toBeInstanceOf(ClaimNotAllowedError);
  });

  it("stops after three attempts (BR-17)", async () => {
    const { database } = fakeClaimsDatabase({ ...ownedMatch, attemptsUsed: 3 });
    await expect(
      createClaim(database, { matchId: "match-1", claimantId: "user-1", answers: ["blue strap"] }),
    ).rejects.toBeInstanceOf(ClaimAttemptsExhaustedError);
  });

  it("allows a claim while the found item awaits or holds a match", async () => {
    const { database } = fakeClaimsDatabase({
      ...ownedMatch,
      found: { ...ownedMatch.found, status: "RECEIVED_BY_STOP" },
    });
    const result = await createClaim(database, {
      matchId: "match-1",
      claimantId: "user-1",
      answers: ["blue strap"],
    });
    expect(result.decision).toBe("PENDING");
  });

  it("stores the attempt and flips match + lost report in one transaction", async () => {
    const { database, calls } = fakeClaimsDatabase(ownedMatch);
    const result = await createClaim(database, {
      matchId: "match-1",
      claimantId: "user-1",
      answers: ["blue strap"],
    });
    expect(result.attemptNo).toBe(1);
    expect(calls.matchUpdate).toMatchObject({ status: "CLAIMED", attemptsUsed: { increment: 1 } });
  });
});

describe("handover code", () => {
  it("round-trips encrypt and decrypt (plaintext never stored)", () => {
    const issued = issueHandoverCode();
    expect(issued.code).toMatch(/^\d{6}$/);
    expect(issued.enc).not.toContain(issued.code);
    expect(readHandoverCode(issued.enc)).toBe(issued.code);
  });
});

describe("decide claim", () => {
  const actor = { userId: "user-2", role: "USER", stationIds: ["station-9"] as string[] };

  it("rejects a decision from a non-custodian", async () => {
    const { database } = fakeClaimsDatabase(ownedMatch);
    await expect(
      decideClaim(database, "claim-1", { decision: "APPROVED", ...actor, userId: "stranger", stationIds: [] }),
    ).rejects.toBeInstanceOf(ClaimNotAllowedError);
  });

  it("locks the pair when the third claim is rejected", async () => {
    const transactionCalls: Array<Record<string, unknown>> = [];
    const lockedMatch = { ...ownedMatch, attemptsUsed: 3 };
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "PENDING",
          handoverCodeEnc: null,
          handoverExpiresAt: null,
          handedOverAt: null,
          match: lockedMatch,
        }),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          claim: { update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
          match: { update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
          report: { update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
          statusHistory: { create: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
        }),
    } as unknown as Database;
    await decideClaim(database, "claim-1", { decision: "REJECTED", ...actor });
    const matchUpdate = transactionCalls.find(
      (entry) => "status" in entry && (entry.status === "LOCKED" || entry.status === "REJECTED"),
    );
    expect(matchUpdate).toMatchObject({ status: "LOCKED" });
  });
});

describe("confirm handover", () => {
  it("rejects a wrong code", async () => {
    const issued = issueHandoverCode();
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "APPROVED",
          handoverCodeEnc: issued.enc,
          handoverExpiresAt: new Date(Date.now() + 60_000),
          handedOverAt: null,
          match: ownedMatch,
        }),
      },
    } as unknown as Database;
    await expect(
      confirmHandover(database, "claim-1", { code: "000000", userId: "user-2", role: "USER", stationIds: ["station-9"] }),
    ).rejects.toBeInstanceOf(InvalidHandoverCodeError);
  });
});
