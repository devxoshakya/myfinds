import {
  findMatches,
  MATCH_MAX_PER_REPORT,
  type MatchReport,
} from "@myfinds/shared";
import type { Database } from "@myfinds/db";

const reportSelect = {
  id: true,
  type: true,
  category: true,
  title: true,
  description: true,
  brand: true,
  color: true,
  eventDate: true,
  expiresAt: true,
  status: true,
  placeStation: {
    select: {
      id: true,
      placeType: true,
      cityId: true,
    },
  },
} as const;

function toMatchReport(report: {
  id: string;
  type: "LOST" | "FOUND";
  category: string;
  title: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  eventDate: Date;
  expiresAt: Date;
  status: MatchReport["status"];
  placeStation: { id: string; cityId: string; placeType: string };
}): MatchReport {
  return {
    id: report.id,
    type: report.type,
    category: report.category,
    title: report.title,
    description: report.description,
    brand: report.brand,
    color: report.color,
    eventDate: report.eventDate,
    expiresAt: report.expiresAt,
    status: report.status,
    stationId: report.placeStation.id,
    cityId: report.placeStation.cityId,
    placeType: report.placeStation.placeType,
  };
}

export async function refreshMatchesForReport(
  database: Database,
  reportId: string,
  now = new Date(),
) {
  const report = await database.report.findUnique({
    where: { id: reportId },
    select: reportSelect,
  });
  if (!report) return 0;

  const current = toMatchReport(report);
  const candidates = await database.report.findMany({
    where: {
      id: { not: reportId },
      type: current.type === "LOST" ? "FOUND" : "LOST",
      expiresAt: { gt: now },
      placeStation: { cityId: current.cityId },
    },
    select: reportSelect,
  });
  const matches = findMatches(
    current,
    candidates.filter((candidate) => candidate.category === current.category).map(toMatchReport),
    now,
  );
  const pairIds = matches.map(({ candidate }) =>
    current.type === "LOST"
      ? { lostReportId: current.id, foundReportId: candidate.id }
      : { lostReportId: candidate.id, foundReportId: current.id },
  );

  await database.$transaction(async (transaction) => {
    for (const match of matches) {
      const pair =
        current.type === "LOST"
          ? { lostReportId: current.id, foundReportId: match.candidate.id }
          : { lostReportId: match.candidate.id, foundReportId: current.id };
      await transaction.match.upsert({
        where: { lostReportId_foundReportId: pair },
        create: {
          ...pair,
          score: match.scored.score,
          scoreBreakdown: match.scored.breakdown,
        },
        update: {
          score: match.scored.score,
          scoreBreakdown: match.scored.breakdown,
        },
      });
    }

    const retained = new Set(
      pairIds.map((pair) => `${pair.lostReportId}:${pair.foundReportId}`),
    );
    const existing = await transaction.match.findMany({
      where:
        current.type === "LOST"
          ? { lostReportId: current.id, status: "SUGGESTED" }
          : { foundReportId: current.id, status: "SUGGESTED" },
      select: { id: true, lostReportId: true, foundReportId: true },
    });
    const staleIds = existing
      .filter((match) => !retained.has(`${match.lostReportId}:${match.foundReportId}`))
      .map((match) => match.id);
    if (staleIds.length > 0) {
      await transaction.match.deleteMany({ where: { id: { in: staleIds } } });
    }

    const nextStatus: "MATCHING" | "MATCH_FOUND" | "SUBMITTED_TO_STOP" =
      matches.length > 0
        ? "MATCH_FOUND"
        : current.status === "SUBMITTED_TO_STOP"
          ? current.status
          : "MATCHING";
    if (nextStatus !== current.status) {
      await transaction.report.update({
        where: { id: current.id },
        data: { status: nextStatus },
      });
      await transaction.statusHistory.create({
        data: {
          reportId: current.id,
          fromStatus: current.status,
          toStatus: nextStatus,
          actorRole: "SYSTEM",
          action: matches.length > 0 ? "MATCH_FOUND" : "MATCHING_STARTED",
        },
      });
    }
  });

  return Math.min(matches.length, MATCH_MAX_PER_REPORT);
}
