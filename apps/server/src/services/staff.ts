import type { Database } from "@myfinds/db";

import { createEnvPhotoStorage } from "./photos";

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

export class InvalidReceiptTransitionError extends Error {
  constructor(currentStatus: string) {
    super(`Report status ${currentStatus} cannot be marked as received.`);
    this.name = "InvalidReceiptTransitionError";
  }
}

/**
 * Station staff confirm the stop physically received the item:
 * SUBMITTED_TO_STOP -> RECEIVED_BY_STOP, then matching re-runs (BR-10).
 */export async function confirmReceipt(
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
  if (report.status !== "SUBMITTED_TO_STOP") {
    throw new InvalidReceiptTransitionError(report.status);
  }

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
