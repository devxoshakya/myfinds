import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import {
  ClaimAttemptsExhaustedError,
  InvalidClaimDecisionReasonError,
  ClaimNotAllowedError,
  createClaim,
  decideClaim,
  confirmHandover,
  InvalidHandoverCodeError,
  issueHandoverCode,
  MissingHandoverIdTypeError,
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
    const lockedMatch = { ...ownedMatch, status: "CLAIMED", attemptsUsed: 3 };
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
    await decideClaim(database, "claim-1", {
      decision: "REJECTED",
      decisionNote: "The details do not match.",
      ...actor,
    });
    const matchUpdate = transactionCalls.find(
      (entry) => "status" in entry && (entry.status === "LOCKED" || entry.status === "REJECTED"),
    );
    expect(matchUpdate).toMatchObject({ status: "LOCKED" });
  });

  it("stores a trimmed rejection reason", async () => {
    const transactionCalls: Array<Record<string, unknown>> = [];
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "PENDING",
          handoverCodeEnc: null,
          handoverExpiresAt: null,
          handedOverAt: null,
          match: { ...ownedMatch, status: "CLAIMED" },
        }),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          claim: {
            update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data),
          },
          match: { update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
          report: { update: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
          statusHistory: { create: async ({ data }: { data: Record<string, unknown> }) => transactionCalls.push(data) },
        }),
    } as unknown as Database;

    await decideClaim(database, "claim-1", {
      decision: "REJECTED",
      decisionNote: "  The details do not match.  ",
      ...actor,
    });

    expect(transactionCalls[0]).toMatchObject({
      decision: "REJECTED",
      decisionNote: "The details do not match.",
    });
  });

  it("rejects a blank rejection reason before writing", async () => {
    let transactionCalls = 0;
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "PENDING",
          handoverCodeEnc: null,
          handoverExpiresAt: null,
          handedOverAt: null,
          match: { ...ownedMatch, status: "CLAIMED" },
        }),
      },
      $transaction: async () => {
        transactionCalls += 1;
      },
    } as unknown as Database;

    await expect(
      decideClaim(database, "claim-1", {
        decision: "REJECTED",
        decisionNote: "   ",
        ...actor,
      }),
    ).rejects.toBeInstanceOf(InvalidClaimDecisionReasonError);
    expect(transactionCalls).toBe(0);
  });

  it("leaves all records and history unchanged when a status transition is invalid", async () => {
    const state = {
      claimDecision: "PENDING",
      matchStatus: "SUGGESTED",
      lostStatus: "MATCH_FOUND",
      foundStatus: "MATCH_FOUND",
      history: [] as string[],
    };
    const before = structuredClone(state);
    let transactionCalls = 0;
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: state.claimDecision,
          handoverCodeEnc: null,
          handoverExpiresAt: null,
          handedOverAt: null,
          match: {
            ...ownedMatch,
            status: state.matchStatus,
            lost: { ...ownedMatch.lost, status: state.lostStatus },
            found: { ...ownedMatch.found, status: state.foundStatus },
          },
        }),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
        transactionCalls += 1;
        return callback({
          claim: { update: async () => { state.claimDecision = "APPROVED"; } },
          match: { update: async () => { state.matchStatus = "VERIFIED"; } },
          report: { update: async () => { state.lostStatus = "VERIFIED"; } },
          statusHistory: { create: async () => { state.history.push("changed"); } },
        });
      },
    } as unknown as Database;

    await expect(
      decideClaim(database, "claim-1", { decision: "APPROVED", ...actor }),
    ).rejects.toThrow("MatchStatus cannot transition from SUGGESTED to VERIFIED.");
    expect(transactionCalls).toBe(0);
    expect(state).toEqual(before);
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

  it("completes the match and returns both reports after a valid code", async () => {
    const issued = issueHandoverCode();
    const state = {
      claimUpdate: null as Record<string, unknown> | null,
      matchStatus: "VERIFIED",
      siblingDismissal: null as Record<string, unknown> | null,
      lostUpdate: null as Record<string, unknown> | null,
      foundUpdate: null as Record<string, unknown> | null,
      historyCount: 0,
    };
    const verifiedMatch = {
      ...ownedMatch,
      status: "VERIFIED",
      lost: { ...ownedMatch.lost, status: "VERIFIED" },
      found: { ...ownedMatch.found, status: "VERIFIED" },
    };
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "APPROVED",
          handoverCodeEnc: issued.enc,
          handoverExpiresAt: new Date(Date.now() + 60_000),
          handedOverAt: null,
          match: verifiedMatch,
        }),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          claim: { update: async ({ data }: { data: Record<string, unknown> }) => { state.claimUpdate = data; } },
          match: {
            update: async ({ data }: { data: Record<string, unknown> }) => { state.matchStatus = data.status as string; },
            updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
              state.siblingDismissal = { where, data };
            },
          },
          report: { update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            if (where.id === verifiedMatch.lost.id) state.lostUpdate = data;
            else state.foundUpdate = data;
          } },
          statusHistory: { create: async () => { state.historyCount += 1; } },
        }),
    } as unknown as Database;

    await confirmHandover(database, "claim-1", {
      code: issued.code,
      idType: "GOVERNMENT_ID",
      userId: "user-2",
      role: "USER",
      stationIds: ["station-9"],
    });

    expect(state.matchStatus).toBe("COMPLETED");
    expect(state.claimUpdate?.handoverIdType).toBe("GOVERNMENT_ID");
    expect(state.siblingDismissal).toEqual({
      where: { foundReportId: "found-1", status: "SUGGESTED" },
      data: { status: "DISMISSED" },
    });
    for (const update of [state.lostUpdate, state.foundUpdate]) {
      expect(update?.status).toBe("RETURNED");
      expect(update?.closedAt).toBeInstanceOf(Date);
    }
    expect(state.historyCount).toBe(2);
  });

  it("refuses a station handover that does not record the ID type (BR-21)", async () => {
    const issued = issueHandoverCode();
    let transactionCalls = 0;
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "APPROVED",
          handoverCodeEnc: issued.enc,
          handoverExpiresAt: new Date(Date.now() + 60_000),
          handedOverAt: null,
          match: { ...ownedMatch, status: "VERIFIED" },
        }),
      },
      $transaction: async () => {
        transactionCalls += 1;
      },
    } as unknown as Database;

    await expect(
      confirmHandover(database, "claim-1", {
        code: issued.code,
        userId: "user-2",
        role: "USER",
        stationIds: ["station-9"],
      }),
    ).rejects.toBeInstanceOf(MissingHandoverIdTypeError);
    expect(transactionCalls).toBe(0);
  });

  it("hands over a finder-held item without an ID type", async () => {
    const issued = issueHandoverCode();
    const updates: Array<Record<string, unknown>> = [];
    const finderMatch = {
      ...ownedMatch,
      status: "VERIFIED",
      lost: { ...ownedMatch.lost, status: "VERIFIED" },
      found: { ...ownedMatch.found, custodian: "FINDER", custodyStationId: null, status: "VERIFIED" },
    };
    const database = {
      claim: {
        findUnique: async () => ({
          id: "claim-1",
          decision: "APPROVED",
          handoverCodeEnc: issued.enc,
          handoverExpiresAt: new Date(Date.now() + 60_000),
          handedOverAt: null,
          match: finderMatch,
        }),
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          claim: { update: async ({ data }: { data: Record<string, unknown> }) => { updates.push(data); } },
          match: { update: async () => {}, updateMany: async () => {} },
          report: { update: async () => {} },
          statusHistory: { create: async () => {} },
        }),
    } as unknown as Database;

    await confirmHandover(database, "claim-1", {
      code: issued.code,
      userId: "user-2",
      role: "USER",
      stationIds: [],
    });

    expect(updates[0]).not.toHaveProperty("handoverIdType");
  });
});
