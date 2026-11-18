import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import { refreshMatchesForReport } from "./matching";

describe("refresh matches", () => {
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
