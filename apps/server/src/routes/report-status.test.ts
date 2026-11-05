import { createHash } from "node:crypto";
import { describe, expect, it } from "bun:test";
import type { AddressInfo } from "node:net";
import express from "express";
import type { Database } from "@myfinds/db";

import { consumeReportStatusIpLimit } from "../rate-limit";
import { createReportStatusRouter } from "./report-status";

const token = "A".repeat(43);
const tokenHash = createHash("sha256").update(token).digest("hex");

const publicReport = {
  number: 84,
  statusTokenHash: tokenHash,
  category: "WALLET",
  status: "MATCHING",
  eventDate: new Date("2026-10-30T00:00:00.000Z"),
  history: [
    { toStatus: "SUBMITTED", createdAt: new Date("2026-10-30T10:00:00.000Z") },
    { toStatus: "MATCHING", createdAt: new Date("2026-10-30T10:01:00.000Z") },
  ],
  title: "Private report title",
  description: "Private description",
  reporter: { email: "private@example.test" },
  questions: [{ question: "Private question", expectedAnswer: "Private answer" }],
};

async function withServer(
  database: Database,
  callback: (url: string) => Promise<void>,
  consumeRateLimit: typeof consumeReportStatusIpLimit = consumeReportStatusIpLimit,
) {
  const app = express();
  app.use(express.json());
  app.use("/api/reports/status", createReportStatusRouter(database, consumeRateLimit));
  const server = app.listen(0, "127.0.0.1");

  try {
    const address = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${address.port}/api/reports/status`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("POST /api/reports/status", () => {
  it("looks up the hashed private token and returns only public status data", async () => {
    const database = {
      report: {
        findUnique: async (query: {
          where: { statusTokenHash: string };
          select: Record<string, unknown>;
        }) => {
          expect(query.where.statusTokenHash).toBe(tokenHash);
          expect(query.select).toEqual({
            number: true,
            statusTokenHash: true,
            category: true,
            status: true,
            eventDate: true,
            history: {
              orderBy: { createdAt: "asc" },
              select: { toStatus: true, createdAt: true },
            },
          });
          return publicReport;
        },
      },
    } as unknown as Database;

    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        reportNumber: "MF-84",
        category: "WALLET",
        status: "MATCHING",
        eventDate: "2026-10-30",
        timeline: [
          { status: "SUBMITTED", date: "2026-10-30T10:00:00.000Z" },
          { status: "MATCHING", date: "2026-10-30T10:01:00.000Z" },
        ],
      });
      expect(JSON.stringify(body)).not.toContain(token);
      expect(JSON.stringify(body)).not.toContain(tokenHash);
      expect(JSON.stringify(body)).not.toContain("private@example.test");
      expect(JSON.stringify(body)).not.toContain("Private answer");
      expect(JSON.stringify(body)).not.toContain("Private description");
      expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
      expect(response.headers.get("referrer-policy")).toBe("no-referrer");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    });
  });

  it("returns the same not-found response for malformed and unknown tokens", async () => {
    let queries = 0;
    const database = {
      report: {
        findUnique: async () => {
          queries += 1;
          return null;
        },
      },
    } as unknown as Database;

    await withServer(database, async (url) => {
      const malformed = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "not-a-token" }),
      });
      const unknown = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      expect(malformed.status).toBe(404);
      expect(unknown.status).toBe(404);
      expect(await malformed.json()).toEqual(await unknown.json());
      expect(queries).toBe(1);
    });
  });

  it("rejects a stored hash that does not match the incoming token hash", async () => {
    const database = {
      report: {
        findUnique: async () => ({ ...publicReport, statusTokenHash: "0".repeat(64) }),
      },
    } as unknown as Database;

    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      expect(response.status).toBe(404);
    });
  });

  it("returns 429 before querying the database when the IP limit is exceeded", async () => {
    let queries = 0;
    const database = {
      report: {
        findUnique: async () => {
          queries += 1;
          return publicReport;
        },
      },
    } as unknown as Database;

    await withServer(database, async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
      expect(body).toEqual({
        error: {
          code: "RATE_LIMITED",
          message: "Too many status lookups. Try again later.",
        },
      });
      expect(JSON.stringify(body)).not.toContain(token);
      expect(JSON.stringify(body)).not.toContain("Private answer");
      expect(JSON.stringify(body)).not.toContain("private@example.test");
      expect(queries).toBe(0);
    }, () => ({ allowed: false, retryAfterSeconds: 60 }));
  });
});
