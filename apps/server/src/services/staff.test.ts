import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import {
  confirmReceipt,
  InvalidReceiptTransitionError,
  listStationReports,
  ReportNotAtStaffStationError,
  ReportNotFoundError,
} from "./staff";

function fakeDatabase(report: {
  id: string;
  status: string;
  custodyStationId: string | null;
  placeStationId: string;
}) {
  const calls: { reportUpdate?: Record<string, unknown>; historyData?: Record<string, unknown> } =
    {};
  const transaction = {
    report: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        calls.reportUpdate = data;
        return { id: report.id, ...data };
      },
    },
    statusHistory: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.historyData = data;
        return data;
      },
    },
  };
  const database = {
    report: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === report.id ? report : null,
    },
    $transaction: async <Result>(
      callback: (tx: typeof transaction) => Promise<Result>,
    ) => callback(transaction),
  } as unknown as Database;
  return { database, calls };
}

const report = {
  id: "report-1",
  status: "SUBMITTED_TO_STOP",
  custodyStationId: "station-9",
  placeStationId: "station-1",
};

describe("confirm receipt", () => {
  it("moves SUBMITTED_TO_STOP to RECEIVED_BY_STOP at the custody station", async () => {
    const { database, calls } = fakeDatabase(report);
    const result = await confirmReceipt(database, "report-1", {
      stationIds: ["station-9"],
      actorId: "staff-1",
      actorRole: "STATION_STAFF",
    });
    expect(result.status).toBe("RECEIVED_BY_STOP");
    expect(calls.reportUpdate).toEqual({ status: "RECEIVED_BY_STOP" });
    expect(calls.historyData).toMatchObject({
      fromStatus: "SUBMITTED_TO_STOP",
      toStatus: "RECEIVED_BY_STOP",
      actorRole: "STATION_STAFF",
      action: "RECEIPT_CONFIRMED",
    });
  });

  it("falls back to the place station when there is no custody station", async () => {
    const { database } = fakeDatabase({ ...report, custodyStationId: null });
    const result = await confirmReceipt(database, "report-1", {
      stationIds: ["station-1"],
      actorId: "staff-1",
      actorRole: "STATION_STAFF",
    });
    expect(result.status).toBe("RECEIVED_BY_STOP");
  });

  it("lets admins confirm at any station", async () => {
    const { database } = fakeDatabase(report);
    const result = await confirmReceipt(database, "report-1", {
      stationIds: [],
      allowAllStations: true,
      actorId: "admin-1",
      actorRole: "ADMIN",
    });
    expect(result.status).toBe("RECEIVED_BY_STOP");
  });

  it("rejects staff whose stations do not include the report's station", async () => {
    const { database } = fakeDatabase(report);
    await expect(
      confirmReceipt(database, "report-1", {
        stationIds: ["station-2"],
        actorId: "staff-1",
        actorRole: "STATION_STAFF",
      }),
    ).rejects.toBeInstanceOf(ReportNotAtStaffStationError);
  });

  it("rejects reports that are not waiting for stop confirmation", async () => {
    const { database } = fakeDatabase({ ...report, status: "RECEIVED_BY_STOP" });
    await expect(
      confirmReceipt(database, "report-1", {
        stationIds: ["station-9"],
        actorId: "staff-1",
        actorRole: "STATION_STAFF",
      }),
    ).rejects.toBeInstanceOf(InvalidReceiptTransitionError);
  });

  it("throws when the report does not exist", async () => {
    const { database } = fakeDatabase({ ...report, id: "other" });
    await expect(
      confirmReceipt(database, "report-1", {
        stationIds: ["station-9"],
        actorId: "staff-1",
        actorRole: "STATION_STAFF",
      }),
    ).rejects.toBeInstanceOf(ReportNotFoundError);
  });
});

describe("list station reports", () => {
  const queueReport = {
    id: "report-2",
    number: 7,
    type: "FOUND" as const,
    title: "blue iPhone",
    category: "PHONE",
    status: "SUBMITTED_TO_STOP",
    eventDate: new Date("2026-11-01T00:00:00Z"),
    placeStation: { name: "Rajiv Chowk Metro", city: { name: "New Delhi" } },
  };

  function fakeQueueDatabase() {
    let capturedWhere: Record<string, unknown> | undefined;
    const database = {
      report: {
        findMany: async (query: { where?: Record<string, unknown> }) => {
          capturedWhere = query.where;
          return [queueReport];
        },
      },
    } as unknown as Database;
    return { database, getWhere: () => capturedWhere };
  }

  it("scopes the queue to the staff member's stations", async () => {
    const { database, getWhere } = fakeQueueDatabase();
    const reports = await listStationReports(database, { stationIds: ["station-9"] });
    expect(reports).toHaveLength(1);
    expect(getWhere()).toMatchObject({
      custodyStationId: { in: ["station-9"] },
      status: { in: ["SUBMITTED_TO_STOP", "RECEIVED_BY_STOP"] },
    });
  });

  it("lets admins see every station's queue", async () => {
    const { database, getWhere } = fakeQueueDatabase();
    await listStationReports(database, { stationIds: [], allowAllStations: true });
    expect(getWhere()).not.toHaveProperty("custodyStationId");
  });
});
