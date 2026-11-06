import { createReportSchema } from "@myfinds/shared";
import { Router, type Request } from "express";
import type { Session } from "@myfinds/auth";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import { auth, db } from "../services";
import { ENV } from "../env.server";
import { consumeReportIpLimit } from "../rate-limit";
import {
  createReport,
  getIdempotentReport,
  InvalidReportStationError,
  ReportIdempotencyConflictError,
} from "../services/reports";
import { refreshMatchesForReport } from "../services/matching";

type ReportSession = {
  user: Pick<Session["user"], "id" | "role" | "emailVerified">;
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
              lostMatches: {
                where: { status: "SUGGESTED" },
                orderBy: { score: "desc" },
                take: 5,
                select: {
                  id: true,
                  score: true,
                  scoreBreakdown: true,
                  found: {
                    select: {
                      id: true,
                      title: true,
                      category: true,
                      eventDate: true,
                      placeStation: { select: { name: true, city: { select: { name: true } } } },
                    },
                  },
                },
              },
              foundMatches: {
                where: { status: "SUGGESTED" },
                orderBy: { score: "desc" },
                take: 5,
                select: {
                  id: true,
                  score: true,
                  scoreBreakdown: true,
                  lost: {
                    select: {
                      id: true,
                      title: true,
                      category: true,
                      eventDate: true,
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
            matches: matches.map((match) => {
              const candidate = "found" in match ? match.found : match.lost;
              return {
                id: match.id,
                score: match.score,
                scoreBreakdown: match.scoreBreakdown,
                candidate: {
                  id: candidate.id,
                  title: candidate.title,
                  category: candidate.category,
                  eventDate: candidate.eventDate.toISOString().slice(0, 10),
                  place: {
                    station: candidate.placeStation.name,
                    city: candidate.placeStation.city.name,
                  },
                },
              };
            }),
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

  router.post("/", async (request, response) => {
    response.setHeader("Cache-Control", "no-store");

    const session = await getSession(request.headers);
    if (!session) {
      response.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Sign in to submit a report." },
      });
      return;
    }
    if (!session.user.emailVerified) {
      response.status(403).json({
        error: { code: "NOT_VERIFIED", message: "Verify your email to submit a report." },
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
  idempotencySecret: ENV.BETTER_AUTH_SECRET,
});
