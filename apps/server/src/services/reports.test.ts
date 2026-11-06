import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import type { Database } from "@myfinds/db";
import { createFoundReportSchema, createLostReportSchema } from "@myfinds/shared";

import { createReport } from "./reports";

const lostReport = {
  type: "LOST" as const,
  title: "Leather wallet",
  category: "WALLET" as const,
  eventDate: new Date().toISOString().slice(0, 10),
  placeStationId: "station-1",
};

function fakeDatabase({ failIdempotencyCreate = false } = {}) {
  const calls: {
    reportData?: Record<string, unknown>;
    questions?: Record<string, unknown>[];
    historyData?: Record<string, unknown>;
    reportCreateAttempts: number;
    committedReports: number;
    committedIdempotency: boolean;
  } = {
    reportCreateAttempts: 0,
    committedReports: 0,
    committedIdempotency: false,
  };
  let committedRecord:
    | {
        reporterId: string;
        keyHash: string;
        requestHash: string;
        encryptedStatusToken: string;
        report: { id: string; number: number; status: string; statusTokenHash: string };
      }
    | undefined;
  const findRecord = async (query: {
    where: { reporterId_keyHash: { reporterId: string; keyHash: string } };
  }) => {
    const key = query.where.reporterId_keyHash;
    if (committedRecord?.reporterId === key.reporterId && committedRecord.keyHash === key.keyHash) {
      return committedRecord;
    }
    return null;
  };
  const reportIdempotency = { findUnique: findRecord };
  const createTransaction = () => {
    let report:
      | { id: string; number: number; status: string; statusTokenHash: string }
      | undefined;
    let pendingRecord: typeof committedRecord;
    const transaction = {
      station: {
        findMany: async () => [{ id: "station-1" }, { id: "station-2" }],
      },
      report: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.reportCreateAttempts += 1;
          calls.reportData = data;
          report = {
            id: "report-id",
            number: 42,
            status: data.status as string,
            statusTokenHash: data.statusTokenHash as string,
          };
          return report;
        },
      },
      verificationQuestion: {
        createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
          calls.questions = data;
        },
      },
      statusHistory: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          calls.historyData = data;
        },
      },
      reportIdempotency: {
        findUnique: findRecord,
        create: async ({
          data,
        }: {
          data: {
            reporterId: string;
            keyHash: string;
            requestHash: string;
            encryptedStatusToken: string;
          };
        }) => {
          if (failIdempotencyCreate) throw new Error("idempotency write failed");
          if (!report) throw new Error("report must be created first");
          pendingRecord = { ...data, report };
        },
      },
    };
    return { transaction, getPendingRecord: () => pendingRecord };
  };
  const database = {
    reportIdempotency,
    $transaction: async <Result>(
      callback: (tx: ReturnType<typeof createTransaction>["transaction"]) => Promise<Result>,
    ) => {
      const { transaction, getPendingRecord } = createTransaction();
      const result = await callback(transaction);
      const pendingRecord = getPendingRecord();
      if (pendingRecord) {
        committedRecord = pendingRecord;
        calls.committedReports += 1;
        calls.committedIdempotency = true;
      }
      return result;
    },
  } as unknown as Database;

  return { database, calls };
}

describe("create report schemas", () => {
  it("accepts a valid lost report and rejects server-owned fields", () => {
    expect(createLostReportSchema.safeParse(lostReport).success).toBe(true);
    expect(
      createLostReportSchema.safeParse({ ...lostReport, reporterId: "attacker", status: "RETURNED" })
        .success,
    ).toBe(false);
  });

  it("requires a question for finder custody and a hand-in station for station custody", () => {
    const found = {
      ...lostReport,
      type: "FOUND" as const,
      custodyChoice: "FINDER" as const,
      questions: [],
    };
    expect(createFoundReportSchema.safeParse(found).success).toBe(false);
    expect(
      createFoundReportSchema.safeParse({
        ...found,
        custodyChoice: "STATION",
        handInStationId: "station-2",
      }).success,
    ).toBe(true);
  });

  it("requires a complete first finder question and removes an optional blank question", () => {
    const found = {
      ...lostReport,
      type: "FOUND" as const,
      custodyChoice: "FINDER" as const,
      questions: [
        { question: " What is inside? ", expectedAnswer: " A key " },
        { question: " ", expectedAnswer: "" },
      ],
    };

    expect(createFoundReportSchema.parse(found).questions).toEqual([
      { question: "What is inside?", expectedAnswer: "A key" },
    ]);
    expect(
      createFoundReportSchema.safeParse({
        ...found,
        questions: [{ question: " ", expectedAnswer: "" }],
      }).success,
    ).toBe(false);
    expect(
      createFoundReportSchema.safeParse({
        ...found,
        questions: [{ question: "What is inside?", expectedAnswer: " " }],
      }).success,
    ).toBe(false);
  });

  it("accepts and strips blank optional station questions", () => {
    const parsed = createFoundReportSchema.parse({
      ...lostReport,
      type: "FOUND",
      custodyChoice: "STATION",
      handInStationId: "station-2",
      questions: [{ question: " ", expectedAnswer: " " }],
    });

    expect(parsed.questions).toEqual([]);
  });

  it("rejects future and invalid calendar dates", () => {
    expect(createLostReportSchema.safeParse({ ...lostReport, eventDate: "2026-02-31" }).success).toBe(
      false,
    );
    expect(
      createLostReportSchema.safeParse({
        ...lostReport,
        eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      }).success,
    ).toBe(false);
  });
});

describe("createReport", () => {
  it("stores the hash, questions and initial history transactionally without returning answers", async () => {
    const { database, calls } = fakeDatabase();
    const parsed = createFoundReportSchema.parse({
      ...lostReport,
      type: "FOUND",
      custodyChoice: "FINDER",
      questions: [{ question: "What is inside?", expectedAnswer: "A private answer" }],
    });

    const result = await createReport(database, "verified-user", "USER", parsed, {
      key: crypto.randomUUID(),
      secret: "test-idempotency-secret",
    });

    expect(result.reportCode).toBe("MF-42");
    expect(result.status).toBe("SUBMITTED");
    expect(result.statusToken).toHaveLength(43);
    expect(calls.reportData?.reporterId).toBe("verified-user");
    expect(calls.reportData?.statusTokenHash).toBe(
      createHash("sha256").update(result.statusToken).digest("hex"),
    );
    expect(calls.questions).toEqual([
      {
        reportId: "report-id",
        position: 1,
        question: "What is inside?",
        expectedAnswer: "A private answer",
      },
    ]);
    expect(calls.historyData).toMatchObject({
      reportId: "report-id",
      fromStatus: null,
      toStatus: "SUBMITTED",
      actorId: "verified-user",
      actorRole: "USER",
      action: "CREATED",
    });
    expect(result).not.toHaveProperty("questions");
    expect(JSON.stringify(result)).not.toContain("A private answer");
  });

  it("derives station custody and initial status from the validated choice", async () => {
    const { database, calls } = fakeDatabase();
    const parsed = createFoundReportSchema.parse({
      ...lostReport,
      type: "FOUND",
      custodyChoice: "STATION",
      handInStationId: "station-2",
      questions: [],
    });

    const result = await createReport(database, "verified-user", "USER", parsed, {
      key: crypto.randomUUID(),
      secret: "test-idempotency-secret",
    });

    expect(result.status).toBe("SUBMITTED_TO_STOP");
    expect(calls.reportData).toMatchObject({
      custodian: "STATION",
      custodyStationId: "station-2",
      status: "SUBMITTED_TO_STOP",
    });
  });

  it("returns the original result for a retry with the same key and payload", async () => {
    const { database, calls } = fakeDatabase();
    const parsed = createLostReportSchema.parse(lostReport);
    const idempotency = { key: crypto.randomUUID(), secret: "test-idempotency-secret" };

    const original = await createReport(database, "verified-user", "USER", parsed, idempotency);
    const retry = await createReport(database, "verified-user", "USER", parsed, idempotency);

    expect(retry).toEqual(original);
    expect(calls.reportCreateAttempts).toBe(1);
    expect(calls.committedReports).toBe(1);
    expect(calls.committedIdempotency).toBe(true);
    expect(JSON.stringify(retry)).not.toContain("private answer");
  });

  it("resolves concurrent requests through the unique idempotency constraint", async () => {
    type StoredRecord = {
      reporterId: string;
      keyHash: string;
      requestHash: string;
      encryptedStatusToken: string;
      report: { id: string; number: number; status: string; statusTokenHash: string };
    };
    let storedRecord: StoredRecord | undefined;
    let initialReads = 0;
    let releaseInitialReads!: () => void;
    const initialReadBarrier = new Promise<void>((resolve) => {
      releaseInitialReads = resolve;
    });
    let reportCreateAttempts = 0;
    let committedReports = 0;
    const findRecord = async (query: {
      where: { reporterId_keyHash: { reporterId: string; keyHash: string } };
    }) => {
      if (!storedRecord) {
        initialReads += 1;
        if (initialReads === 2) releaseInitialReads();
        await initialReadBarrier;
      }
      const key = query.where.reporterId_keyHash;
      return storedRecord?.reporterId === key.reporterId && storedRecord.keyHash === key.keyHash
        ? storedRecord
        : null;
    };
    const database = {
      reportIdempotency: { findUnique: findRecord },
      $transaction: async <Result>(
        callback: (transaction: {
          reportIdempotency: {
            findUnique: typeof findRecord;
            create: (args: { data: Omit<StoredRecord, "report"> & { reportId: string } }) => Promise<void>;
          };
          station: { findMany: () => Promise<{ id: string }[]> };
          report: { create: (args: { data: Record<string, unknown> }) => Promise<StoredRecord["report"]> };
          verificationQuestion: { createMany: () => Promise<void> };
          statusHistory: { create: () => Promise<void> };
        }) => Promise<Result>,
      ) => {
        let report: StoredRecord["report"] | undefined;
        const transaction = {
          reportIdempotency: {
            findUnique: findRecord,
            create: async ({
              data,
            }: {
              data: Omit<StoredRecord, "report"> & { reportId: string };
            }) => {
              if (storedRecord) throw { code: "P2002" };
              if (!report) throw new Error("report must be created first");
              storedRecord = { ...data, report };
              committedReports += 1;
            },
          },
          station: { findMany: async () => [{ id: "station-1" }] },
          report: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              reportCreateAttempts += 1;
              report = {
                id: "report-id",
                number: 42,
                status: data.status as string,
                statusTokenHash: data.statusTokenHash as string,
              };
              return report;
            },
          },
          verificationQuestion: { createMany: async () => undefined },
          statusHistory: { create: async () => undefined },
        };
        return callback(transaction);
      },
    } as unknown as Database;
    const parsed = createLostReportSchema.parse(lostReport);
    const idempotency = { key: crypto.randomUUID(), secret: "test-idempotency-secret" };

    const results = await Promise.all([
      createReport(database, "verified-user", "USER", parsed, idempotency),
      createReport(database, "verified-user", "USER", parsed, idempotency),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(reportCreateAttempts).toBe(2);
    expect(committedReports).toBe(1);
  });

  it("rolls back report writes when the idempotency record cannot be stored", async () => {
    const { database, calls } = fakeDatabase({ failIdempotencyCreate: true });
    const parsed = createLostReportSchema.parse(lostReport);

    await expect(
      createReport(database, "verified-user", "USER", parsed, {
        key: crypto.randomUUID(),
        secret: "test-idempotency-secret",
      }),
    ).rejects.toThrow("idempotency write failed");

    expect(calls.reportCreateAttempts).toBe(1);
    expect(calls.committedReports).toBe(0);
    expect(calls.committedIdempotency).toBe(false);
  });
});
