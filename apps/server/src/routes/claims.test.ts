import { describe, expect, it } from "bun:test";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Database } from "@myfinds/db";

import { createClaimsRouter } from "./claims";

const pendingClaim = {
  id: "claim-1",
  decision: "PENDING",
  handoverCodeEnc: null,
  handoverExpiresAt: null,
  handedOverAt: null,
  match: {
    id: "match-1",
    status: "CLAIMED",
    attemptsUsed: 1,
    lost: { id: "lost-1", status: "CLAIMED" },
    found: {
      id: "found-1",
      status: "MATCH_FOUND",
      reporterId: "custodian-1",
      custodian: "FINDER",
      custodyStationId: null,
    },
  },
};

function fakeDatabase(claim = pendingClaim) {
  const state = {
    decision: claim.decision,
    decisionNote: null as string | null,
    matchStatus: claim.match.status,
    lostStatus: claim.match.lost.status,
    foundStatus: claim.match.found.status,
    history: [] as string[],
  };
  let transactionCalls = 0;
  const database = {
    claim: {
      findUnique: async () => ({
        ...claim,
        decision: state.decision,
        match: {
          ...claim.match,
          status: state.matchStatus,
          lost: { ...claim.match.lost, status: state.lostStatus },
          found: { ...claim.match.found, status: state.foundStatus },
        },
      }),
    },
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
      transactionCalls += 1;
      return callback({
        claim: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            state.decision = data.decision as string;
            state.decisionNote = (data.decisionNote as string | undefined) ?? null;
          },
        },
        match: {
          update: async ({ data }: { data: Record<string, unknown> }) => {
            state.matchStatus = data.status as string;
          },
        },
        report: {
          update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            if (where.id === claim.match.lost.id) state.lostStatus = data.status as string;
            else state.foundStatus = data.status as string;
          },
        },
        statusHistory: {
          create: async () => {
            state.history.push("created");
          },
        },
      });
    },
  } as unknown as Database;

  return { database, state, transactionCount: () => transactionCalls };
}

async function withServer(
  database: Database,
  callback: (url: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/claims",
    createClaimsRouter({
      database,
      getSession: async () => ({ user: { id: "custodian-1", role: "USER" } }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");

  try {
    const address = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${address.port}/api/claims/claim-1/decision`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("POST /api/claims/:id/decision", () => {
  it("requires a reason when rejecting and does not start a transaction", async () => {
    const { database, transactionCount } = fakeDatabase();
    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "REJECTED" }),
      });
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({
        error: { code: "VALIDATION_FAILED" },
      });
      expect(transactionCount()).toBe(0);
    });
  });

  it("rejects whitespace-only and overlong reasons", async () => {
    const { database, transactionCount } = fakeDatabase();
    await withServer(database, async (url) => {
      for (const decisionNote of ["   ", "r".repeat(501)]) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "REJECTED", decisionNote }),
        });
        expect(response.status).toBe(422);
      }
      expect(transactionCount()).toBe(0);
    });
  });

  it("stores the validated rejection reason on the claim", async () => {
    const { database, state } = fakeDatabase();
    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "REJECTED", decisionNote: "  Not enough proof.  " }),
      });
      expect(response.status).toBe(200);
      expect(state.decision).toBe("REJECTED");
      expect(state.decisionNote).toBe("Not enough proof.");
      expect(state.matchStatus).toBe("REJECTED");
      expect(state.lostStatus).toBe("MATCHING");
      expect(state.history).toHaveLength(1);
    });
  });

  it("returns 409 and preserves every record when a transition is invalid", async () => {
    const invalidClaim = {
      ...pendingClaim,
      match: { ...pendingClaim.match, status: "SUGGESTED" },
    };
    const { database, state, transactionCount } = fakeDatabase(invalidClaim);
    const before = structuredClone(state);

    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { code: "INVALID_STATUS_TRANSITION" },
      });
      expect(transactionCount()).toBe(0);
      expect(state).toEqual(before);
    });
  });

  it("approves without changing the existing claim decision note", async () => {
    const { database, state } = fakeDatabase();
    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });
      expect(response.status).toBe(200);
      expect(state.decision).toBe("APPROVED");
      expect(state.decisionNote).toBeNull();
      expect(state.matchStatus).toBe("VERIFIED");
      expect(state.lostStatus).toBe("VERIFIED");
      expect(state.foundStatus).toBe("VERIFIED");
    });
  });
});
