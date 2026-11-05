import { describe, expect, it } from "bun:test";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import { createReportsRouter } from "./reports";

const lostReport = {
  type: "LOST",
  title: "Leather wallet",
  category: "WALLET",
  eventDate: new Date().toISOString().slice(0, 10),
  placeStationId: "station-1",
};

function fakeDatabase(
  findReports: (query: Record<string, unknown>) => Promise<unknown[]> = async () => [],
  counters = { reportCreateAttempts: 0 },
) {
  let savedIdempotency:
    | {
        reporterId: string;
        keyHash: string;
        requestHash: string;
        encryptedStatusToken: string;
        report: { id: string; number: number; status: string; statusTokenHash: string };
      }
    | undefined;
  const findIdempotency = async (query: {
    where: { reporterId_keyHash: { reporterId: string; keyHash: string } };
  }) => {
    const key = query.where.reporterId_keyHash;
    return savedIdempotency?.reporterId === key.reporterId &&
      savedIdempotency.keyHash === key.keyHash
      ? savedIdempotency
      : null;
  };
  const reportIdempotency = { findUnique: findIdempotency };
  const transaction = {
    station: { findMany: async () => [{ id: "station-1" }] },
    report: {
      findMany: findReports,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        counters.reportCreateAttempts += 1;
        return {
          id: "report-id",
          number: 84,
          status: data.status as string,
          statusTokenHash: data.statusTokenHash as string,
        };
      },
    },
    verificationQuestion: { createMany: async () => undefined },
    statusHistory: { create: async () => undefined },
    reportIdempotency: {
      findUnique: findIdempotency,
      create: async ({
        data,
      }: {
        data: {
          reporterId: string;
          keyHash: string;
          requestHash: string;
          encryptedStatusToken: string;
          reportId: string;
        };
      }) => {
        savedIdempotency = {
          ...data,
          report: {
            id: "report-id",
            number: 84,
            status: "SUBMITTED",
            statusTokenHash: await getCreatedStatusTokenHash(),
          },
        };
      },
    },
  };
  let createdStatusTokenHash = "";
  const getCreatedStatusTokenHash = async () => createdStatusTokenHash;
  const createReport = transaction.report.create;
  transaction.report.create = async (args) => {
    const report = await createReport(args);
    createdStatusTokenHash = report.statusTokenHash;
    return report;
  };
  return {
    report: { findMany: findReports },
    reportIdempotency,
    $transaction: async <Result>(
      callback: (tx: typeof transaction) => Promise<Result>,
    ) => callback(transaction),
  } as unknown as Database;
}

async function withServer(
  getSession: Parameters<typeof createReportsRouter>[0]["getSession"],
  callback: (url: string) => Promise<void>,
  database: Database = fakeDatabase(),
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/reports",
    createReportsRouter({ database, getSession, idempotencySecret: "test-idempotency-secret" }),
  );
  const server = app.listen(0, "127.0.0.1");

  try {
    const address = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${address.port}/api/reports`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("GET /api/reports/mine", () => {
  it("requires authentication and scopes the query to the session user", async () => {
    let query: Record<string, unknown> | undefined;
    let queryCalls = 0;
    const database = fakeDatabase(async (value) => {
      queryCalls += 1;
      query = value;
      return [
        {
          id: "own-report",
          number: 84,
          type: "LOST",
          title: "Leather wallet",
          category: "WALLET",
          status: "MATCHING",
          eventDate: new Date("2026-11-04T00:00:00.000Z"),
          expiresAt: new Date("2027-01-03T00:00:00.000Z"),
          placeStation: { name: "Central", city: { name: "Example City" } },
          description: "Private details",
          reporter: { email: "private@example.test" },
        },
      ];
    });

    await withServer(async () => null, async (url) => {
      const response = await fetch(`${url}/mine`);
      expect(response.status).toBe(401);
      expect(queryCalls).toBe(0);
    }, database);

    await withServer(
      async () => ({ user: { id: "signed-in-user", role: "USER", emailVerified: true } }),
      async (url) => {
        const response = await fetch(`${url}/mine?reporterId=other-user`);
        const body = z
          .object({
            reports: z.array(
              z.object({
                id: z.string(),
                number: z.string(),
                type: z.string(),
                title: z.string(),
                category: z.string(),
                status: z.string(),
                eventDate: z.string(),
                expiresAt: z.string(),
                place: z.object({ station: z.string(), city: z.string() }),
              }),
            ),
          })
          .parse(await response.json());

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
        expect(query?.where).toEqual({ reporterId: "signed-in-user" });
        expect(body.reports).toEqual([
          {
            id: "own-report",
            number: "MF-84",
            type: "LOST",
            title: "Leather wallet",
            category: "WALLET",
            status: "MATCHING",
            eventDate: "2026-11-04",
            expiresAt: "2027-01-03T00:00:00.000Z",
            place: { station: "Central", city: "Example City" },
          },
        ]);
        expect(JSON.stringify(body)).not.toContain("Private details");
        expect(JSON.stringify(body)).not.toContain("private@example.test");
      },
      database,
    );
  });
});

describe("POST /api/reports", () => {
  it("requires a signed-in, verified session", async () => {
    await withServer(async () => null, async (url) => {
      const response = await fetch(url, { method: "POST", body: JSON.stringify(lostReport) });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    });

    await withServer(
      async () => ({
        user: { id: "user-id", role: "USER", emailVerified: false },
      }),
      async (url) => {
        const response = await fetch(url, { method: "POST", body: JSON.stringify(lostReport) });
        expect(response.status).toBe(403);
        expect(await response.json()).toMatchObject({ error: { code: "NOT_VERIFIED" } });
      },
    );
  });

  it("rejects client-supplied server-owned fields and returns no private answers", async () => {
    const session = {
      user: { id: "verified-user", role: "USER", emailVerified: true },
    };

    await withServer(async () => session, async (url) => {
      const invalid = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
        },
        body: JSON.stringify({ ...lostReport, status: "RETURNED" }),
      });
      expect(invalid.status).toBe(422);

      const found = {
        ...lostReport,
        type: "FOUND",
        custodyChoice: "FINDER",
        questions: [{ question: "What is inside?", expectedAnswer: "secret owner detail" }],
      };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
        },
        body: JSON.stringify(found),
      });
      const result = z
        .object({
          report: z.object({ id: z.string(), code: z.string(), status: z.string() }),
          statusToken: z.string(),
        })
        .parse(await response.json());

      expect(response.status).toBe(201);
      expect(result.report.code).toBe("MF-84");
      expect(result.report.status).toBe("SUBMITTED");
      expect(typeof result.statusToken).toBe("string");
      expect(JSON.stringify(result)).not.toContain("secret owner detail");
      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  });

  it("returns the original result on retry without creating another report", async () => {
    const counters = { reportCreateAttempts: 0 };
    const database = fakeDatabase(undefined, counters);
    const session = {
      user: { id: "verified-user", role: "USER", emailVerified: true },
    };
    const idempotencyKey = "550e8400-e29b-41d4-a716-446655440000";
    const found = {
      ...lostReport,
      type: "FOUND",
      custodyChoice: "FINDER",
      questions: [{ question: "Private question", expectedAnswer: "Private answer" }],
    };

    await withServer(async () => session, async (url) => {
      const request = () =>
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(found),
        });
      const resultSchema = z.object({
        report: z.object({ id: z.string(), code: z.string(), status: z.string() }),
        statusToken: z.string(),
      });
      const originalResponse = await request();
      const original = resultSchema.parse(await originalResponse.json());
      const retryResponse = await request();
      const retry = resultSchema.parse(await retryResponse.json());

      expect(originalResponse.status).toBe(201);
      expect(retryResponse.status).toBe(200);
      expect(retry).toEqual(original);
      expect(counters.reportCreateAttempts).toBe(1);
      expect(original.statusToken).toBeTruthy();
      expect(JSON.stringify(original)).not.toContain("Private answer");
      expect(JSON.stringify(retry)).not.toContain("Private answer");
    }, database);
  });
});
