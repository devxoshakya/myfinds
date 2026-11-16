// Automated leak tests (plan Week 3 Friday): secret strings and contact info
// must never appear in responses the requester is not authorized to read.
// The fake database returns rows stuffed with leak-marker fields beyond what
// Prisma selects would return — if a route ever stops serializing explicitly,
// these tests fail.
import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Database } from "@myfinds/db";

import { createClaimsRouter } from "./claims";
import { createReportsRouter } from "./reports";
import { createStaffRouter } from "./staff";
import { createReportStatusRouter } from "./report-status";
import { issueHandoverCode } from "../services/claims";

const LEAK_EMAIL = "owner.secret@example.test";
const LEAK_ANSWER = "thesis-in-backpack-zip";

type Session = { user: { id: string; role: string } };

function leakyDatabase() {
  const handover = issueHandoverCode();
  let queueQueried = false;
  const station = { name: "Rajiv Chowk Metro", city: { name: "Delhi" } };
  const questions = [{ question: "What is inside?", expectedAnswer: LEAK_ANSWER }];

  const database = {
    stationStaff: {
      findMany: async () => [{ stationId: "station-1" }],
    },
    report: {
      findUnique: async (query: { where: { id?: string; statusTokenHash?: string } }) => {
        if (query.where.statusTokenHash) {
          return {
            number: 84,
            statusTokenHash: query.where.statusTokenHash,
            category: "BAG",
            status: "MATCH_FOUND",
            eventDate: new Date("2026-11-10T00:00:00.000Z"),
            history: [{ toStatus: "SUBMITTED", createdAt: new Date("2026-11-09T00:00:00.000Z") }],
            reporter: { email: LEAK_EMAIL },
          };
        }
        return null;
      },
      findFirst: async (query: {
        where: { id?: string; reporterId?: string };
        select: Record<string, unknown>;
      }) => {
        if (query.where.reporterId !== "owner") return null;
        if (query.select.lostMatches !== undefined) {
          return {
            id: "report-1",
            type: "LOST",
            title: "Blue backpack",
            category: "BAG",
            eventDate: new Date("2026-11-10T00:00:00.000Z"),
            expiresAt: new Date("2027-01-09T00:00:00.000Z"),
            placeStation: station,
            lostMatches: [
              {
                id: "match-1",
                score: 0.82,
                scoreBreakdown: { place: 1, text: 0.8, date: 0.5, attributes: 1 },
                attemptsUsed: 0,
                status: "SUGGESTED",
                found: {
                  id: "found-1",
                  title: "Blue backpack",
                  description: "Wildcraft backpack",
                  brand: "Wildcraft",
                  color: "Blue",
                  category: "BAG",
                  eventDate: new Date("2026-11-10T00:00:00.000Z"),
                  questions,
                  photos: [],
                  placeStation: station,
                },
              },
            ],
          };
        }
        return {
          id: "report-1",
          number: 84,
          type: "LOST",
          title: "Blue backpack",
          category: "BAG",
          description: "Contains my thesis",
          color: "Blue",
          brand: "Wildcraft",
          eventDate: new Date("2026-11-10T00:00:00.000Z"),
          status: "MATCH_FOUND",
          expiresAt: new Date("2027-01-09T00:00:00.000Z"),
          placeStation: station,
          custodian: "FINDER",
          questions,
          photos: [],
          history: [{ toStatus: "SUBMITTED", action: "CREATED", createdAt: new Date() }],
          reporter: { email: LEAK_EMAIL },
        };
      },
      findMany: async (query: { where: Record<string, unknown> }) => {
        queueQueried = true;
        if (query.where.reporterId) return [];
        return [
          {
            id: "found-1",
            number: 21,
            type: "FOUND",
            title: "Blue backpack",
            category: "BAG",
            status: "SUBMITTED_TO_STOP",
            eventDate: new Date("2026-11-10T00:00:00.000Z"),
            custodyStation: station,
            placeStation: station,
            reporter: { email: LEAK_EMAIL },
          },
        ];
      },
    },
    claim: {
      findFirst: async () => ({
        attemptNo: 1,
        decision: "APPROVED",
        handoverCodeEnc: handover.enc,
        handoverExpiresAt: new Date(),
        handedOverAt: null,
        match: {
          attemptsUsed: 1,
          found: { custodyStation: { name: station.name, counterHours: "09:00-21:00" } },
        },
      }),
      findMany: async () => [
        {
          id: "claim-1",
          attemptNo: 1,
          answers: [{ text: "thesis" }],
          decision: "PENDING",
          handoverExpiresAt: null,
          match: {
            found: {
              id: "found-1",
              number: 21,
              title: "Blue backpack",
              questions,
              photos: [],
              custodyStation: { name: station.name },
            },
          },
        },
      ],
    },
  } as unknown as Database;

  const leakSecrets = [LEAK_EMAIL, LEAK_ANSWER, handover.code];
  return { database, handover, leakSecrets, wasQueueQueried: () => queueQueried };
}

async function withServer(
  getSession: (headers: Record<string, unknown>) => Promise<Session | null>,
  callback: (url: string, secrets: ReturnType<typeof leakyDatabase>["leakSecrets"]) => Promise<void>,
) {
  const { database, handover, leakSecrets } = leakyDatabase();
  const app = express();
  app.use(express.json());
  app.use(
    "/api/reports/status",
    createReportStatusRouter(database, () => ({ allowed: true, retryAfterSeconds: 60 })),
  );
  app.use(
    "/api/reports",
    createReportsRouter({ database, getSession, idempotencySecret: "test-secret" }),
  );
  app.use("/api/claims", createClaimsRouter({ database, getSession }));
  app.use("/api/staff", createStaffRouter({ database, getSession }));
  const server = app.listen(0, "127.0.0.1");
  try {
    const address = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${address.port}`, leakSecrets);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function assertNoLeaks(text: string, secrets: string[]) {
  for (const secret of secrets) {
    expect(text).not.toContain(secret);
  }
}

describe("leak prevention", () => {
  it("unauthenticated requests get 401 with no report data on every guarded route", async () => {
    await withServer(async () => null, async (url, secrets) => {
      const endpoints: Array<() => Promise<Response>> = [
        () => fetch(`${url}/api/reports/mine`),
        () => fetch(`${url}/api/reports/report-1`),
        () => fetch(`${url}/api/reports/report-1/matches`),
        () => fetch(`${url}/api/staff/reports`),
        () => fetch(`${url}/api/staff/claims`),
        () =>
          fetch(`${url}/api/staff/reports/report-1/confirm-receipt`, { method: "POST", body: "{}" }),
        () => fetch(`${url}/api/claims`, { method: "POST", body: "{}" }),
      ];
      for (const request of endpoints) {
        const response = await request();
        expect(response.status).toBe(401);
        assertNoLeaks(JSON.stringify(await response.json()), secrets);
      }
    });
  });

  it("non-owner sessions get 404 on another user's report", async () => {
    await withServer(
      async () => ({ user: { id: "someone-else", role: "USER" } }),
      async (url, secrets) => {
        for (const path of ["/api/reports/report-1", "/api/reports/report-1/matches"]) {
          const response = await fetch(`${url}${path}`);
          expect(response.status).toBe(404);
          assertNoLeaks(JSON.stringify(await response.json()), secrets);
        }
      },
    );
  });

  it("match suggestions expose questions but never expected answers", async () => {
    await withServer(
      async () => ({ user: { id: "owner", role: "USER" } }),
      async (url, secrets) => {
        const response = await fetch(`${url}/api/reports/report-1/matches`);
        expect(response.status).toBe(200);
        const body = JSON.stringify(await response.json());
        expect(body).toContain("What is inside?");
        expect(body).not.toContain("expectedAnswer");
        assertNoLeaks(body, secrets);
      },
    );
  });

  it("owner sees their handover code in their own report detail", async () => {
    await withServer(
      async () => ({ user: { id: "owner", role: "USER" } }),
      async (url, secrets) => {
        const owner = await fetch(`${url}/api/reports/report-1`);
        const ownerBody = JSON.stringify(await owner.json());
        expect(owner.status).toBe(200);
        // Positive control: the code really is in the claimant's response.
        expect(ownerBody).toMatch(/"handoverCode":"\d{6}"/);
        assertNoLeaks(ownerBody, [secrets[0], secrets[1]]);
      },
    );
  });

  it("staff endpoints reject regular users with no data", async () => {
    await withServer(
      async () => ({ user: { id: "owner", role: "USER" } }),
      async (url, secrets) => {
        for (const path of ["/api/staff/reports", "/api/staff/claims"]) {
          const response = await fetch(`${url}${path}`);
          expect(response.status).toBe(403);
          assertNoLeaks(JSON.stringify(await response.json()), secrets);
        }
      },
    );
  });

  it("station staff (and only staff) see expected answers, never reporter emails", async () => {
    await withServer(
      async () => ({ user: { id: "staff-1", role: "STATION_STAFF" } }),
      async (url, secrets) => {
        const queue = await fetch(`${url}/api/staff/reports`);
        expect(queue.status).toBe(200);
        const queueBody = JSON.stringify(await queue.json());
        expect(queueBody).toContain("Blue backpack");
        assertNoLeaks(queueBody, [secrets[0], secrets[1]]);

        const claims = await fetch(`${url}/api/staff/claims`);
        expect(claims.status).toBe(200);
        const body = JSON.stringify(await claims.json());
        // Positive control: the staff verification surface may show answers.
        expect(body).toContain(LEAK_ANSWER);
        assertNoLeaks(body, [secrets[0]]);
      },
    );
  });

  it("public status lookup leaks no owner contact", async () => {
    const token = "A".repeat(43);
    await withServer(async () => null, async (url, secrets) => {
      const response = await fetch(`${url}/api/reports/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      expect(response.status).toBe(200);
      const body = JSON.stringify(await response.json());
      expect(body).toContain("MATCH_FOUND");
      assertNoLeaks(body, secrets);
    });
  });
});
