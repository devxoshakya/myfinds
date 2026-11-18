import { getMatchReasons, type MatchBreakdown, type MatchReport } from "@myfinds/shared";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import { createEnvPhotoStorage } from "./photos";
import { assertReportStatusTransition } from "./status-transitions";

const matchBreakdownSchema = z.object({
  place: z.number(),
  text: z.number(),
  date: z.number(),
  attributes: z.number(),
});

type StaffMatchSide = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  brand: string | null;
  color: string | null;
  eventDate: Date;
  expiresAt: Date;
  status: MatchReport["status"];
  placeStation: {
    id: string;
    placeType: string;
    cityId: string;
    name: string;
    city: { name: string };
  };
};

function toMatchReport(report: StaffMatchSide, type: MatchReport["type"]): MatchReport {
  return {
    id: report.id,
    type,
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

export async function getStaffMatchDetails(
  database: Database,
  matchId: string,
  options: { stationIds: readonly string[]; allowAllStations?: boolean },
) {
  const match = await database.match.findFirst({
    where: {
      id: matchId,
      ...(options.allowAllStations
        ? {}
        : { found: { custodyStationId: { in: [...options.stationIds] } } }),
    },
    select: {
      id: true,
      score: true,
      scoreBreakdown: true,
      lost: {
        select: {
          id: true,
          title: true,
          category: true,
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
              name: true,
              city: { select: { name: true } },
            },
          },
        },
      },
      found: {
        select: {
          id: true,
          title: true,
          category: true,
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
              name: true,
              city: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!match) return null;

  const scoreBreakdown: MatchBreakdown = matchBreakdownSchema.parse(match.scoreBreakdown);
  const lost = toMatchReport(match.lost, "LOST");
  const found = toMatchReport(match.found, "FOUND");

  return {
    id: match.id,
    score: match.score,
    scoreBreakdown,
    reasons: getMatchReasons(scoreBreakdown, lost, found),
    lost: {
      id: match.lost.id,
      title: match.lost.title,
      category: match.lost.category,
      description: match.lost.description,
      brand: match.lost.brand,
      color: match.lost.color,
      eventDate: match.lost.eventDate.toISOString().slice(0, 10),
      place: {
        station: match.lost.placeStation.name,
        city: match.lost.placeStation.city.name,
      },
    },
    found: {
      id: match.found.id,
      title: match.found.title,
      category: match.found.category,
      description: match.found.description,
      brand: match.found.brand,
      color: match.found.color,
      eventDate: match.found.eventDate.toISOString().slice(0, 10),
      place: {
        station: match.found.placeStation.name,
        city: match.found.placeStation.city.name,
      },
    },
  };
}

export class ReportNotFoundError extends Error {
  constructor() {
    super("Report was not found.");
    this.name = "ReportNotFoundError";
  }
}

export class ReportNotAtStaffStationError extends Error {
  constructor() {
    super("Report is not at one of your stations.");
    this.name = "ReportNotAtStaffStationError";
  }
}

/**
 * Station staff confirm the stop physically received the item:
 * SUBMITTED_TO_STOP -> RECEIVED_BY_STOP, then matching re-runs (BR-10).
 */
export async function confirmReceipt(
  database: Database,
  reportId: string,
  options: {
    stationIds: readonly string[];
    allowAllStations?: boolean;
    actorId: string;
    actorRole: string;
  },
) {
  const report = await database.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      status: true,
      custodyStationId: true,
      placeStationId: true,
    },
  });
  if (!report) throw new ReportNotFoundError();

  const owningStationId = report.custodyStationId ?? report.placeStationId;
  if (!options.allowAllStations && !options.stationIds.includes(owningStationId)) {
    throw new ReportNotAtStaffStationError();
  }
  assertReportStatusTransition(report.status, "RECEIVED_BY_STOP");

  await database.$transaction(async (transaction) => {
    await transaction.report.update({
      where: { id: report.id },
      data: { status: "RECEIVED_BY_STOP" },
    });
    await transaction.statusHistory.create({
      data: {
        reportId: report.id,
        fromStatus: report.status,
        toStatus: "RECEIVED_BY_STOP",
        actorId: options.actorId,
        actorRole: options.actorRole,
        action: "RECEIPT_CONFIRMED",
      },
    });
  });

  return { reportId: report.id, status: "RECEIVED_BY_STOP" as const };
}

/**
 * Claims awaiting review (or awaiting handover) on found reports held at the
 * staff member's stations. Admins see all. Expected answers included (S3:
 * custodian-only surface).
 */
export async function listStationClaims(
  database: Database,
  options: { stationIds: readonly string[]; allowAllStations?: boolean },
) {
  const photoStorage = createEnvPhotoStorage();
  const claims = await database.claim.findMany({
    where: {
      decision: { in: ["PENDING", "APPROVED"] },
      handedOverAt: null,
      match: {
        found: options.allowAllStations
          ? {}
          : { custodyStationId: { in: [...options.stationIds] } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      attemptNo: true,
      answers: true,
      decision: true,
      handoverExpiresAt: true,
      match: {
        select: {
          found: {
            select: {
              id: true,
              number: true,
              title: true,
              questions: { orderBy: { position: "asc" }, select: { question: true, expectedAnswer: true } },
              photos: {
                where: { kind: "ITEM", deletedAt: null },
                orderBy: { position: "asc" },
                take: 3,
                select: { r2Key: true },
              },
              custodyStation: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return Promise.all(
    claims.map(async (claim) => ({
    id: claim.id,
    attemptNo: claim.attemptNo,
    decision: claim.decision,
    handoverExpiresAt: claim.handoverExpiresAt?.toISOString() ?? null,
    answers: (claim.answers as Array<{ text: string }>).map((answer) => answer.text),
    questions: claim.match.found.questions.map((entry) => ({
      question: entry.question,
      expectedAnswer: entry.expectedAnswer,
    })),
    report: {
      id: claim.match.found.id,
      number: `MF-${claim.match.found.number}`,
      title: claim.match.found.title,
      station: claim.match.found.custodyStation?.name ?? null,
      photos: photoStorage
        ? await Promise.all(
            claim.match.found.photos.map((photo) =>
              photoStorage.createReadUrl(photo.r2Key).then((url) => ({ url })),
            ),
          )
        : [],
    },
    })),
  );
}

type StationQueueReport = {
  id: string;
  number: number;
  type: "LOST" | "FOUND";
  title: string;
  category: string;
  // Prisma does not narrow ReportStatus through a `where.in` filter, so the
  // declared queue statuses are enforced by the where clause at runtime.
  status: string;
  eventDate: Date;
  // Non-null for every queued report: the where clause requires custody,
  // but Prisma's relation type stays nullable, hence the mapped guarantee.
  custodyStation: { name: string; city: { name: string } };
};

type StationQueueRow = {
  id: string;
  number: number;
  type: "LOST" | "FOUND";
  title: string;
  category: string;
  status: string;
  eventDate: Date;
  custodyStation: { name: string; city: { name: string } } | null;
};

/**
 * The staff queue: found items waiting for (or already confirmed at) receipt
 * at the staff member's stations. Admins with allowAllStations see everything.
 * Reporter identity is never included (BR-22: no cross-user contact details).
 */
export async function listStationReports(
  database: Database,
  options: { stationIds: readonly string[]; allowAllStations?: boolean },
): Promise<StationQueueReport[]> {
  const rows: StationQueueRow[] = await database.report.findMany({
    where: {
      type: "FOUND",
      status: { in: ["SUBMITTED_TO_STOP", "RECEIVED_BY_STOP"] },
      ...(options.allowAllStations ? {} : { custodyStationId: { in: [...options.stationIds] } }),
    },
    orderBy: [{ status: "asc" }, { eventDate: "desc" }] as const,
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      category: true,
      status: true,
      eventDate: true,
      // Staff act on the custody station (where the item physically sits), not
      // the place station where it was lost/found.
      custodyStation: { select: { name: true, city: { select: { name: true } } } },
      placeStation: { select: { name: true, city: { select: { name: true } } } },
    },
  });
  return rows.filter((row): row is StationQueueRow & { custodyStation: NonNullable<StationQueueRow["custodyStation"]> } => row.custodyStation !== null);
}
