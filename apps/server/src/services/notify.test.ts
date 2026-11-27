import { describe, expect, it } from "bun:test";
import type { Database } from "@myfinds/db";

import type { EmailMessage, EmailResult } from "./email";
import { notifyClaimApproved } from "./notify";

const approvedClaim = {
  handoverExpiresAt: new Date("2026-12-01T12:00:00.000Z"),
  match: {
    lost: {
      id: "lost-1",
      number: 42,
      placeStation: {
        name: "Rajiv Chowk Metro",
        city: { name: "New Delhi" },
      },
      reporter: {
        id: "owner-1",
        name: "Asha Rai",
        email: "asha@example.test",
      },
    },
    found: {
      id: "found-1",
      number: 7,
      title: "Blue wallet",
      category: "WALLET",
      eventDate: new Date("2026-11-20T00:00:00.000Z"),
      custodian: "STATION",
      placeStation: { name: "Central", city: { name: "Kathmandu" } },
      custodyStation: { name: "Central counter", counterHours: "09:00-17:00" },
      reporter: {
        id: "finder-1",
        name: "Bikash Shah",
        email: "bikash@example.test",
      },
      photos: [],
    },
  },
};

function fakeNotifyDatabase(claim: typeof approvedClaim | null) {
  const rows: Array<{ id: string; data: Record<string, unknown> }> = [];
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  let nextId = 1;
  const database = {
    claim: { findUnique: async () => claim },
    notification: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `notification-${nextId++}`, data };
        rows.push(row);
        return { id: row.id };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        updates.push({ id: where.id, data });
        return data;
      },
    },
  } as unknown as Database;
  return { database, rows, updates };
}

function recordingSender(
  sent: EmailMessage[],
  result?: EmailResult,
): (message: EmailMessage) => Promise<EmailResult> {
  return async (message) => {
    sent.push(message);
    return result ?? { id: `provider-${sent.length}` };
  };
}

describe("claim approved notification", () => {
  it("sends the code only to the claimant and details to the finder", async () => {
    const { database, rows, updates } = fakeNotifyDatabase(approvedClaim);
    const sent: EmailMessage[] = [];

    await notifyClaimApproved(
      database,
      { claimId: "claim-1", handoverCode: "123456" },
      recordingSender(sent),
    );

    const claimant = sent.find((message) => message.to === "asha@example.test");
    const finder = sent.find((message) => message.to === "bikash@example.test");
    expect(claimant).toBeDefined();
    expect(finder).toBeDefined();

    expect(claimant!.html).toContain("123456");
    expect(claimant!.text).toContain("123456");
    expect(claimant!.html).toContain("Central counter");
    expect(claimant!.idempotencyKey).toBe("claim-approved/claimant/claim-1");

    expect(finder!.html).not.toContain("123456");
    expect(finder!.text).not.toContain("123456");
    expect(finder!.html).not.toContain("Asha");
    expect(finder!.idempotencyKey).toBe("claim-approved/finder/claim-1");

    expect(rows).toHaveLength(2);
    expect(updates).toHaveLength(2);
    expect(updates.every((update) => update.data.status === "SENT")).toBe(true);
  });

  it("records a failed delivery without throwing", async () => {
    const { database, updates } = fakeNotifyDatabase(approvedClaim);
    const sent: EmailMessage[] = [];

    await expect(
      notifyClaimApproved(
        database,
        { claimId: "claim-1", handoverCode: "123456" },
        recordingSender(sent, { error: "provider unavailable" }),
      ),
    ).resolves.toBeUndefined();

    expect(sent).toHaveLength(2);
    expect(updates).toHaveLength(2);
    expect(
      updates.every(
        (update) =>
          update.data.status === "FAILED" &&
          update.data.error === "provider unavailable",
      ),
    ).toBe(true);
  });

  it("does nothing when the claim cannot be loaded", async () => {
    const { database, rows } = fakeNotifyDatabase(null);
    const sent: EmailMessage[] = [];

    await notifyClaimApproved(
      database,
      { claimId: "missing", handoverCode: "123456" },
      recordingSender(sent),
    );

    expect(sent).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });
});
