import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import { refreshMatchesForReport } from "./matching";

describe("refresh matches", () => {
  it("updates both sides of a new match to MATCH_FOUND", async () => {
    const found = {
      id: "found-1",
      type: "FOUND",
      category: "WALLET",
      title: "Black wallet",
      description: null,
      brand: null,
      color: "BLACK",
      eventDate: new Date("2026-11-02T00:00:00.000Z"),
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      status: "RECEIVED_BY_STOP",
      placeStation: { id: "station-1", placeType: "METRO", cityId: "city-1" },
    };
    const lost = {
      id: "lost-1",
      type: "LOST",
      category: "WALLET",
      title: "Black leather wallet",
      description: null,
      brand: null,
      color: "BLACK",
      eventDate: new Date("2026-11-01T00:00:00.000Z"),
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      status: "MATCHING",
      placeStation: { id: "station-1", placeType: "METRO", cityId: "city-1" },
    };
    const reportUpdates: Array<{ id: string; status: string }> = [];
    const historyCreates: Array<{ reportId: string; toStatus: string }> = [];
    const database = {
      report: {
        findUnique: async () => found,
        findMany: async () => [lost],
        update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
          reportUpdates.push({ id: where.id, status: data.status });
        },
      },
      match: {
        upsert: async () => ({ id: "match-1" }),
        findMany: async () => [],
      },
      statusHistory: {
        create: async ({ data }: { data: { reportId: string; toStatus: string } }) => {
          historyCreates.push({ reportId: data.reportId, toStatus: data.toStatus });
        },
      },
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(database),
    } as unknown as Database;

    await refreshMatchesForReport(database, found.id);

    expect(reportUpdates).toEqual([
      { id: "found-1", status: "MATCH_FOUND" },
      { id: "lost-1", status: "MATCH_FOUND" },
    ]);
    expect(historyCreates.map((entry) => entry.reportId).sort()).toEqual(["found-1", "lost-1"]);
  });

  it("does not write matches or history when the report cannot re-enter matching", async () => {
    const report = {
      id: "report-1",
      type: "LOST",
      category: "WALLET",
      title: "Leather wallet",
      description: null,
      brand: null,
      color: null,
      eventDate: new Date("2026-11-01T00:00:00.000Z"),
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      status: "RETURNED",
      placeStation: { id: "station-1", placeType: "METRO", cityId: "city-1" },
    };
    const before = structuredClone(report);
    let transactionCalls = 0;
    const database = {
      report: {
        findUnique: async () => report,
        findMany: async () => [],
      },
      $transaction: async () => {
        transactionCalls += 1;
      },
    } as unknown as Database;

    await expect(refreshMatchesForReport(database, report.id)).rejects.toThrow(
      "ReportStatus cannot transition from RETURNED to MATCHING.",
    );
    expect(transactionCalls).toBe(0);
    expect(report).toEqual(before);
  });
});
