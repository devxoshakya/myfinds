import { createReportSchema } from "@myfinds/shared";
import { Router, type Request } from "express";
import type { Session } from "@myfinds/auth";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import { auth, db } from "../services";
import { consumeReportIpLimit } from "../rate-limit";
import {
  createReport,
  getIdempotentReport,
  InvalidReportStationError,
  ReportIdempotencyConflictError,
} from "../services/reports";
import { refreshMatchesForReport } from "../services/matching";
import { readHandoverCode } from "../services/claims";
import { createEnvPhotoStorage } from "../services/photos";

// Signed read URLs are pure local computation (no network call), so photos
// can be embedded straight into authorized responses.
const photoStorage = createEnvPhotoStorage();

function signPhotos(
  photos: Array<{ r2Key: string }>,
): Promise<Array<{ url: string }>> {
  if (!photoStorage) return Promise.resolve([]);
  return Promise.all(
    photos.map((photo) =>
      photoStorage.createReadUrl(photo.r2Key).then((url) => ({ url })),
    ),
  );
}

type ReportSession = {
  user: Pick<Session["user"], "id" | "role">;
};

type ReportsRouterDependencies = {
  database: Database;
  getSession: (headers: Request["headers"]) => Promise<ReportSession | null>;
  idempotencySecret: string;
};

const idempotencyKeySchema = z.string().uuid();

export function createReportsRouter({
  database,
  getSession,
  idempotencySecret,
}: ReportsRouterDependencies) {
  const router = Router();

  router.get("/mine", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");

    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to view your reports." },
      });
      return;
    }

    try {
      const reports = await database.report.findMany({
        where: { reporterId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          type: true,
          title: true,
          category: true,
          status: true,
          eventDate: true,
          expiresAt: true,
          placeStation: {
            select: {
              name: true,
              city: { select: { name: true } },
            },
          },
        },
      });

      response.json({
        reports: reports.map((report) => ({
          id: report.id,
          number: `MF-${report.number}`,
          type: report.type,
          title: report.title,
          category: report.category,
          status: report.status,
          eventDate: report.eventDate.toISOString().slice(0, 10),
          expiresAt: report.expiresAt.toISOString(),
          place: { station: report.placeStation.name, city: report.placeStation.city.name },
        })),
      });
    } catch (error) {
      console.error("My reports request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Your reports are unavailable." },
      });
    }
  });

  router.get("/:id", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to view this report." },
      });
      return;
    }

    try {
      const report = await database.report.findFirst({
        where: { id: request.params.id, reporterId: session.user.id },
        select: {
          id: true,
          number: true,
          type: true,
          title: true,
          category: true,
          description: true,
          color: true,
          brand: true,
          eventDate: true,
          status: true,
          expiresAt: true,
          placeStation: {
            select: { name: true, city: { select: { name: true } } },
          },
          custodian: true,
          questions: {
            orderBy: { position: "asc" },
            select: { question: true, expectedAnswer: true },
          },
          photos: {
            where: { kind: "ITEM", deletedAt: null },
            orderBy: { position: "asc" },
            take: 3,
            select: { r2Key: true },
          },
          history: {
            orderBy: { createdAt: "asc" },
            select: { toStatus: true, action: true, createdAt: true },
          },
        },
      });
      if (!report) {
        response.status(404).json({
          error: { code: "NOT_FOUND", message: "Report was not found." },
        });
        return;
      }

      // Claim context (BR-15..BR-21): the lost owner sees their claim and its
      // issued handover code; a finder holding the item sees the claims to
      // review with expected answers (S3: custodian-only).
      let claim: Record<string, unknown> | null = null;
      if (report.type === "LOST") {
        const latest = await database.claim.findFirst({
          where: { match: { lostReportId: report.id } },
          orderBy: { attemptNo: "desc" },
          select: {
            attemptNo: true,
            decision: true,
            handoverCodeEnc: true,
            handoverExpiresAt: true,
            handedOverAt: true,
            match: {
              select: {
                attemptsUsed: true,
                found: {
                  select: { custodyStation: { select: { name: true, counterHours: true } } },
                },
              },
            },
          },
        });
        if (latest) {
          claim = {
            attemptNo: latest.attemptNo,
            attemptsUsed: latest.match.attemptsUsed,
            decision: latest.decision,
            handedOverAt: latest.handedOverAt?.toISOString() ?? null,
            handoverExpiresAt: latest.handoverExpiresAt?.toISOString() ?? null,
            handoverStation: latest.match.found.custodyStation?.name ?? null,
            handoverCounterHours: latest.match.found.custodyStation?.counterHours ?? null,
            // Issued code is shown only to its claimant, over TLS (S1).
            handoverCode:
              latest.decision === "APPROVED" && latest.handoverCodeEnc
                ? readHandoverCode(latest.handoverCodeEnc)
                : null,
          };
        }
      }

      let custodianClaims: Array<Record<string, unknown>> | null = null;
      if (report.type === "FOUND" && report.custodian === "FINDER") {
        const claims = await database.claim.findMany({
          where: { match: { foundReportId: report.id } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            attemptNo: true,
            answers: true,
            decision: true,
            decidedAt: true,
            handedOverAt: true,
          },
        });
        custodianClaims = claims.map((entry) => ({
          id: entry.id,
          attemptNo: entry.attemptNo,
          decision: entry.decision,
          decidedAt: entry.decidedAt?.toISOString() ?? null,
          handedOverAt: entry.handedOverAt?.toISOString() ?? null,
          answers: (entry.answers as Array<{ text: string }>).map((answer) => answer.text),
        }));
      }

      response.json({
        report: {
          id: report.id,
          number: `MF-${report.number}`,
          type: report.type,
          title: report.title,
          category: report.category,
          description: report.description,
          color: report.color,
          brand: report.brand,
          eventDate: report.eventDate.toISOString().slice(0, 10),
          status: report.status,
          expiresAt: report.expiresAt.toISOString(),
          place: { station: report.placeStation.name, city: report.placeStation.city.name },
          claim,
          custodianClaims,
          photos:
            report.type === "FOUND" ? await signPhotos(report.photos) : [],
          custodianQuestions:
            report.type === "FOUND" && report.custodian === "FINDER"
              ? report.questions.map((entry) => ({
                  question: entry.question,
                  expectedAnswer: entry.expectedAnswer,
                }))
              : null,
          history: report.history
            .filter((entry) => entry.toStatus)
            .map((entry) => ({
              status: entry.toStatus,
              action: entry.action,
              date: entry.createdAt.toISOString(),
            })),
        },
      });
    } catch (error) {
      console.error("Report detail request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Report details are unavailable." },
      });
    }
  });

  router.get("/:id/matches", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to view report matches." },
      });
      return;
    }

    try {
      const report = await database.report.findFirst({
        where: { id: request.params.id, reporterId: session.user.id },
        select: {
          id: true,
          type: true,
          title: true,
          category: true,
          eventDate: true,
          expiresAt: true,
          placeStation: {
            select: { name: true, city: { select: { name: true } } },
          },
          lostMatches: {
            where: { status: { in: ["SUGGESTED", "REJECTED", "CLAIMED"] } },
            orderBy: { score: "desc" },
            take: 5,
            select: {
              id: true,
              score: true,
              scoreBreakdown: true,
              attemptsUsed: true,
              status: true,
              found: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  brand: true,
                  color: true,
                  category: true,
                  eventDate: true,
                  questions: { orderBy: { position: "asc" }, select: { question: true } },
                  photos: {
                    where: { kind: "ITEM", deletedAt: null },
                    orderBy: { position: "asc" },
                    take: 3,
                    select: { r2Key: true },
                  },
                  placeStation: { select: { name: true, city: { select: { name: true } } } },
                },
              },
            },
          },
          foundMatches: {
            where: { status: { in: ["SUGGESTED", "REJECTED", "CLAIMED"] } },
            orderBy: { score: "desc" },
            take: 5,
            select: {
              id: true,
              score: true,
              scoreBreakdown: true,
              attemptsUsed: true,
              status: true,
              lost: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  brand: true,
                  color: true,
                  category: true,
                  eventDate: true,
                  questions: { orderBy: { position: "asc" }, select: { question: true } },
                  photos: {
                    where: { kind: "ITEM", deletedAt: null },
                    orderBy: { position: "asc" },
                    take: 3,
                    select: { r2Key: true },
                  },
                  placeStation: { select: { name: true, city: { select: { name: true } } } },
                },
              },
            },
          },
        },
      });
      if (!report) {
        response.status(404).json({
          error: { code: "NOT_FOUND", message: "Report matches were not found." },
        });
        return;
      }

      const matches = report.type === "LOST" ? report.lostMatches : report.foundMatches;
      response.json({
        report: {
          id: report.id,
          type: report.type,
          title: report.title,
          category: report.category,
          eventDate: report.eventDate.toISOString().slice(0, 10),
          expiresAt: report.expiresAt.toISOString(),
          place: { station: report.placeStation.name, city: report.placeStation.city.name },
        },
        matches: await Promise.all(
          matches.map(async (match) => {
          const candidate = "found" in match ? match.found : match.lost;
          return {
            id: match.id,
            score: match.score,
            scoreBreakdown: match.scoreBreakdown,
            status: match.status,
            attemptsUsed: match.attemptsUsed,
            candidate: {
              id: candidate.id,
              title: candidate.title,
              description: candidate.description,
              brand: candidate.brand,
              color: candidate.color,
              category: candidate.category,
              // Verification questions only (BR-16/S3): never the expected answers.
              questions: candidate.questions.map((entry) => entry.question),
              photos: await signPhotos(candidate.photos),
              eventDate: candidate.eventDate.toISOString().slice(0, 10),
              place: {
                station: candidate.placeStation.name,
                city: candidate.placeStation.city.name,
              },
            },
          };
          }),
        ),
      });
    } catch (error) {
      console.error("Report matches request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Report matches are unavailable." },
      });
    }
  });

  router.post("/", async (request, response) => {
    response.setHeader("Cache-Control", "no-store");

    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to submit a report." },
      });
      return;
    }
    const parsedKey = idempotencyKeySchema.safeParse(request.get("Idempotency-Key"));
    if (!parsedKey.success) {
      response.status(400).json({
        error: {
          code: "INVALID_IDEMPOTENCY_KEY",
          message: "A valid Idempotency-Key header is required.",
        },
      });
      return;
    }

    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
      );
      response.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Check the report details and try again.",
          fields,
        },
      });
      return;
    }

    try {
      const idempotency = { key: parsedKey.data, secret: idempotencySecret };
      const replay = await getIdempotentReport(
        database,
        session.user.id,
        parsed.data,
        idempotency,
      );
      if (replay) {
        response.status(200).json({
          report: { id: replay.reportId, code: replay.reportCode, status: replay.status },
          statusToken: replay.statusToken,
        });
        return;
      }

      const rateLimit = consumeReportIpLimit(request.socket.remoteAddress ?? "unknown");
      if (!rateLimit.allowed) {
        response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many report submissions. Try again later.",
          },
        });
        return;
      }

      const created = await createReport(
        database,
        session.user.id,
        session.user.role,
        parsed.data,
        idempotency,
      );
      try {
        await refreshMatchesForReport(database, created.reportId);
      } catch (error) {
        console.error("Report matching failed after report creation", {
          reportId: created.reportId,
          errorName: error instanceof Error ? error.name : "unknown",
        });
      }
      response.status(201).json({
        report: {
          id: created.reportId,
          code: created.reportCode,
          status: created.status,
        },
        statusToken: created.statusToken,
      });
    } catch (error) {
      if (error instanceof InvalidReportStationError) {
        response.status(422).json({
          error: {
            code: "VALIDATION_FAILED",
            message: "Choose an active station or stop.",
            fields: { [error.message]: "Choose an active station or stop." },
          },
        });
        return;
      }
      if (error instanceof ReportIdempotencyConflictError) {
        response.status(409).json({
          error: {
            code: "IDEMPOTENCY_CONFLICT",
            message: "This submission key was already used for a different report.",
          },
        });
        return;
      }

      console.error("Report creation failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The report could not be saved." },
      });
    }
  });

  return router;
}

export const reportsRouter = createReportsRouter({
  database: db,
  getSession: (headers) => auth.api.getSession({ headers }),
  idempotencySecret: process.env.BETTER_AUTH_SECRET!,
});
