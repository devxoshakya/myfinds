import {
  ClaimDecision,
  MatchStatus,
  ReportStatus,
} from "@myfinds/db";

export const statusTransitionRules = {
  report: {
    [ReportStatus.SUBMITTED]: [
      ReportStatus.MATCHING,
      ReportStatus.MATCH_FOUND,
      ReportStatus.CLAIMED,
      ReportStatus.VERIFIED,
    ],
    [ReportStatus.SUBMITTED_TO_STOP]: [
      ReportStatus.RECEIVED_BY_STOP,
    ],
    [ReportStatus.RECEIVED_BY_STOP]: [
      ReportStatus.MATCHING,
      ReportStatus.MATCH_FOUND,
      ReportStatus.VERIFIED,
    ],
    [ReportStatus.MATCHING]: [
      ReportStatus.MATCH_FOUND,
      ReportStatus.CLAIMED,
      ReportStatus.VERIFIED,
    ],
    [ReportStatus.MATCH_FOUND]: [
      ReportStatus.MATCHING,
      ReportStatus.CLAIMED,
      ReportStatus.VERIFIED,
    ],
    [ReportStatus.CLAIMED]: [
      ReportStatus.CLAIMED,
      ReportStatus.MATCHING,
      ReportStatus.VERIFIED,
    ],
    [ReportStatus.VERIFIED]: [ReportStatus.RETURNED],
    [ReportStatus.RETURNED]: [],
    [ReportStatus.EXPIRED]: [],
    [ReportStatus.WITHDRAWN]: [],
  } satisfies Record<ReportStatus, readonly ReportStatus[]>,
  match: {
    [MatchStatus.SUGGESTED]: [MatchStatus.CLAIMED],
    [MatchStatus.CLAIMED]: [
      MatchStatus.REJECTED,
      MatchStatus.LOCKED,
      MatchStatus.VERIFIED,
    ],
    [MatchStatus.REJECTED]: [MatchStatus.CLAIMED],
    [MatchStatus.LOCKED]: [],
    [MatchStatus.DISMISSED]: [],
    [MatchStatus.VERIFIED]: [MatchStatus.COMPLETED],
    [MatchStatus.COMPLETED]: [],
  } satisfies Record<MatchStatus, readonly MatchStatus[]>,
  claim: {
    [ClaimDecision.PENDING]: [ClaimDecision.APPROVED, ClaimDecision.REJECTED],
    [ClaimDecision.APPROVED]: [],
    [ClaimDecision.REJECTED]: [],
  } satisfies Record<ClaimDecision, readonly ClaimDecision[]>,
};

export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly statusType: "ReportStatus" | "MatchStatus" | "ClaimDecision",
    readonly from: string,
    readonly to: string,
  ) {
    super(`${statusType} cannot transition from ${from} to ${to}.`);
    this.name = "InvalidStatusTransitionError";
  }
}

function assertTransition<T extends string>(
  statusType: InvalidStatusTransitionError["statusType"],
  rules: Record<T, readonly T[]>,
  from: T,
  to: T,
) {
  if (!rules[from].includes(to)) {
    throw new InvalidStatusTransitionError(statusType, from, to);
  }
}

export function assertReportStatusTransition(from: ReportStatus, to: ReportStatus) {
  assertTransition("ReportStatus", statusTransitionRules.report, from, to);
}

export function assertMatchStatusTransition(from: MatchStatus, to: MatchStatus) {
  assertTransition("MatchStatus", statusTransitionRules.match, from, to);
}

export function assertClaimDecisionTransition(from: ClaimDecision, to: ClaimDecision) {
  assertTransition("ClaimDecision", statusTransitionRules.claim, from, to);
}
