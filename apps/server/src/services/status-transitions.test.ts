import { describe, expect, it } from "bun:test";
import { ClaimDecision, MatchStatus, ReportStatus } from "@myfinds/db";

import {
  assertClaimDecisionTransition,
  assertMatchStatusTransition,
  assertReportStatusTransition,
  InvalidStatusTransitionError,
  statusTransitionRules,
} from "./status-transitions";

describe("status transition rules", () => {
  it("allows report matching and receipt workflow transitions", () => {
    expect(() => assertReportStatusTransition(ReportStatus.SUBMITTED, ReportStatus.MATCH_FOUND)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.SUBMITTED_TO_STOP, ReportStatus.RECEIVED_BY_STOP)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.RECEIVED_BY_STOP, ReportStatus.MATCHING)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.MATCHING, ReportStatus.MATCH_FOUND)).not.toThrow();
  });

  it("allows claim approval, rejection, retry, and handover report transitions", () => {
    expect(() => assertReportStatusTransition(ReportStatus.SUBMITTED, ReportStatus.CLAIMED)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.SUBMITTED, ReportStatus.VERIFIED)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.MATCH_FOUND, ReportStatus.CLAIMED)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.CLAIMED, ReportStatus.MATCHING)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.MATCH_FOUND, ReportStatus.VERIFIED)).not.toThrow();
    expect(() => assertReportStatusTransition(ReportStatus.VERIFIED, ReportStatus.RETURNED)).not.toThrow();
  });

  it("allows multiple claims to keep a report in CLAIMED", () => {
    expect(() => assertReportStatusTransition(ReportStatus.CLAIMED, ReportStatus.CLAIMED)).not.toThrow();
  });

  it("rejects report transitions outside the configured workflow", () => {
    expect(() => assertReportStatusTransition(ReportStatus.RETURNED, ReportStatus.MATCHING))
      .toThrow(InvalidStatusTransitionError);
    expect(() => assertReportStatusTransition(ReportStatus.SUBMITTED, ReportStatus.RETURNED))
      .toThrow("ReportStatus cannot transition from SUBMITTED to RETURNED.");
  });

  it("allows a claim attempt and a retry after rejection", () => {
    expect(() => assertMatchStatusTransition(MatchStatus.SUGGESTED, MatchStatus.CLAIMED)).not.toThrow();
    expect(() => assertMatchStatusTransition(MatchStatus.REJECTED, MatchStatus.CLAIMED)).not.toThrow();
  });

  it("allows approval, rejection, third-attempt locking, and handover match transitions", () => {
    expect(() => assertMatchStatusTransition(MatchStatus.CLAIMED, MatchStatus.VERIFIED)).not.toThrow();
    expect(() => assertMatchStatusTransition(MatchStatus.CLAIMED, MatchStatus.REJECTED)).not.toThrow();
    expect(() => assertMatchStatusTransition(MatchStatus.CLAIMED, MatchStatus.LOCKED)).not.toThrow();
    expect(() => assertMatchStatusTransition(MatchStatus.VERIFIED, MatchStatus.COMPLETED)).not.toThrow();
  });

  it("rejects reopening locked or completed matches", () => {
    expect(() => assertMatchStatusTransition(MatchStatus.LOCKED, MatchStatus.CLAIMED))
      .toThrow(InvalidStatusTransitionError);
    expect(() => assertMatchStatusTransition(MatchStatus.COMPLETED, MatchStatus.CLAIMED))
      .toThrow(InvalidStatusTransitionError);
  });

  it("allows only pending claims to be decided", () => {
    expect(() => assertClaimDecisionTransition(ClaimDecision.PENDING, ClaimDecision.APPROVED)).not.toThrow();
    expect(() => assertClaimDecisionTransition(ClaimDecision.PENDING, ClaimDecision.REJECTED)).not.toThrow();
    expect(() => assertClaimDecisionTransition(ClaimDecision.REJECTED, ClaimDecision.APPROVED))
      .toThrow(InvalidStatusTransitionError);
  });

  it("defines transitions for every value in the Prisma enums", () => {
    expect(Object.keys(statusTransitionRules.report).sort()).toEqual(Object.values(ReportStatus).sort());
    expect(Object.keys(statusTransitionRules.match).sort()).toEqual(Object.values(MatchStatus).sort());
    expect(Object.keys(statusTransitionRules.claim).sort()).toEqual(Object.values(ClaimDecision).sort());
  });
});
