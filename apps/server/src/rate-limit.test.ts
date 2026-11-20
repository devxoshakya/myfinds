import { describe, expect, it } from "bun:test";

import {
  consumeClaimSubmitLimit,
  consumeHandoverAttemptLimit,
  consumeReportIpLimit,
  consumeReportStatusIpLimit,
} from "./rate-limit";

describe("report IP rate limit", () => {
  it("allows ten requests per IP per hour, then resets", () => {
    const ip = `test-${crypto.randomUUID()}`;
    const now = 1_800_000_000_000;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(consumeReportIpLimit(ip, now).allowed).toBe(true);
    }

    expect(consumeReportIpLimit(ip, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 3600,
    });
    expect(consumeReportIpLimit(ip, now + 60 * 60 * 1000).allowed).toBe(true);
  });

  it("tracks different IPs separately", () => {
    const suffix = crypto.randomUUID();
    const now = 1_800_000_000_000;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      consumeReportIpLimit(`test-a-${suffix}`, now);
    }

    expect(consumeReportIpLimit(`test-b-${suffix}`, now).allowed).toBe(true);
  });

  it("allows 30 status lookups per IP per minute, then resets", () => {
    const ip = `status-test-${crypto.randomUUID()}`;
    const now = 1_800_000_000_000;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      expect(consumeReportStatusIpLimit(ip, now).allowed).toBe(true);
    }

    expect(consumeReportStatusIpLimit(ip, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(consumeReportStatusIpLimit(ip, now + 60 * 1000).allowed).toBe(true);
  });
});

describe("claim abuse limits", () => {
  it("allows ten claim submissions per user per hour", () => {
    const userId = `user-${crypto.randomUUID()}`;
    const now = 1_800_000_000_000;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(consumeClaimSubmitLimit(userId, now).allowed).toBe(true);
    }

    expect(consumeClaimSubmitLimit(userId, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 3600,
    });
    expect(consumeClaimSubmitLimit(`other-${userId}`, now).allowed).toBe(true);
    expect(consumeClaimSubmitLimit(userId, now + 60 * 60 * 1000).allowed).toBe(true);
  });

  it("allows five handover code attempts per claim per hour", () => {
    const claimId = `claim-${crypto.randomUUID()}`;
    const now = 1_800_000_000_000;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(consumeHandoverAttemptLimit(claimId, now).allowed).toBe(true);
    }

    expect(consumeHandoverAttemptLimit(claimId, now)).toEqual({
      allowed: false,
      retryAfterSeconds: 3600,
    });
    expect(consumeHandoverAttemptLimit(`other-${claimId}`, now).allowed).toBe(true);
    expect(consumeHandoverAttemptLimit(claimId, now + 60 * 60 * 1000).allowed).toBe(true);
  });
});
