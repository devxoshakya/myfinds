import { Router } from "express";
import type { Database } from "@myfinds/db";
import { z } from "zod";

import { consumeReportStatusIpLimit } from "../rate-limit";
import { db } from "../services";
import { lookupReportStatus } from "../services/report-status";

const requestSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();

export function createReportStatusRouter(
  database: Database = db,
  consumeRateLimit = consumeReportStatusIpLimit,
) {
  const router = Router();

  router.post("/", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

    const rateLimit = consumeRateLimit(request.socket.remoteAddress ?? "unknown");
    if (!rateLimit.allowed) {
      response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      response.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many status lookups. Try again later.",
        },
      });
      return;
    }

    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(404).json({
        error: { code: "NOT_FOUND", message: "Report not found." },
      });
      return;
    }

    try {
      const report = await lookupReportStatus(database, parsed.data.token);
      if (!report) {
        response.status(404).json({
          error: { code: "NOT_FOUND", message: "Report not found." },
        });
        return;
      }

      response.json(report);
    } catch (error) {
      console.error("Private report status lookup failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Report status is unavailable." },
      });
    }
  });

  return router;
}
