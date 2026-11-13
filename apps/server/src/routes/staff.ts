import { Router, type Request } from "express";
import type { Database } from "@myfinds/db";
import type { Session } from "@myfinds/auth";

import { auth, db } from "../services";
import {
  confirmReceipt,
  InvalidReceiptTransitionError,
  listStationClaims,
  listStationReports,
  ReportNotAtStaffStationError,
  ReportNotFoundError,
} from "../services/staff";
import { refreshMatchesForReport } from "../services/matching";

type StaffSession = {
  user: Pick<Session["user"], "id" | "role">;
};

type StaffRouterDependencies = {
  database: Database;
  getSession: (headers: Request["headers"]) => Promise<StaffSession | null>;
};

export function createStaffRouter({ database, getSession }: StaffRouterDependencies) {
  const router = Router();

  // Guard: session must exist and the user must hold a staff/admin role.
  // Returns the active station ids the user may act on (empty = unrestricted,
  // for admins).
  async function requireStaff(request: {
    headers: Request["headers"];
  }): Promise<
    | { session: null; error: { code: string; message: string } | "UNAUTHENTICATED" }
    | { session: StaffSession; stationIds: string[]; allowAllStations: boolean }
  > {
    const session = await getSession(request.headers);
    if (!session) return { session: null, error: "UNAUTHENTICATED" };
    if (session.user.role !== "STATION_STAFF" && session.user.role !== "ADMIN") {
      return {
        session: null,
        error: {
          code: "FORBIDDEN",
          message: "Only station staff or admins can perform this action.",
        },
      };
    }
    if (session.user.role === "ADMIN") {
      return { session, stationIds: [], allowAllStations: true };
    }
    const staffRows = await database.stationStaff.findMany({
      where: { userId: session.user.id, active: true },
      select: { stationId: true },
    });
    return { session, stationIds: staffRows.map((row) => row.stationId), allowAllStations: false };
  }

  router.get("/reports", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const guard = await requireStaff(request);
    if (!guard.session) {
      response.status(guard.error === "UNAUTHENTICATED" ? 401 : 403).json({
        error:
          guard.error === "UNAUTHENTICATED"
            ? { code: "UNAUTHENTICATED", message: "Sign in to view the staff queue." }
            : guard.error,
      });
      return;
    }

    try {
      const reports = await listStationReports(database, {
        stationIds: guard.stationIds,
        allowAllStations: guard.allowAllStations,
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
          place: {
            station: report.custodyStation.name,
            city: report.custodyStation.city.name,
          },
        })),
      });
    } catch (error) {
      console.error("Staff queue request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The staff queue is unavailable." },
      });
    }
  });

  router.get("/claims", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const guard = await requireStaff(request);
    if (!guard.session) {
      response.status(guard.error === "UNAUTHENTICATED" ? 401 : 403).json({
        error:
          guard.error === "UNAUTHENTICATED"
            ? { code: "UNAUTHENTICATED", message: "Sign in to review claims." }
            : guard.error,
      });
      return;
    }

    try {
      const claims = await listStationClaims(database, {
        stationIds: guard.stationIds,
        allowAllStations: guard.allowAllStations,
      });
      response.json({ claims });
    } catch (error) {
      console.error("Staff claims request failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The staff claims list is unavailable." },
      });
    }
  });

  router.post("/reports/:id/confirm-receipt", async (request, response) => {
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const guard = await requireStaff(request);
    if (!guard.session) {
      response.status(guard.error === "UNAUTHENTICATED" ? 401 : 403).json({
        error:
          guard.error === "UNAUTHENTICATED"
            ? { code: "UNAUTHENTICATED", message: "Sign in to confirm receipt." }
            : guard.error,
      });
      return;
    }

    try {
      const result = await confirmReceipt(database, request.params.id, {
        stationIds: guard.stationIds,
        allowAllStations: guard.allowAllStations,
        actorId: guard.session.user.id,
        actorRole: guard.session.user.role,
      });
      // Matching re-runs after the status change (BR-10). A failure here must
      // not fail the receipt confirmation itself.
      try {
        await refreshMatchesForReport(database, result.reportId);
      } catch (error) {
        console.error("Matching failed after receipt confirmation", {
          reportId: result.reportId,
          errorName: error instanceof Error ? error.name : "unknown",
        });
      }
      response.json({ report: result });
    } catch (error) {
      if (error instanceof ReportNotFoundError) {
        response.status(404).json({
          error: { code: "NOT_FOUND", message: "Report was not found." },
        });
        return;
      }
      if (error instanceof ReportNotAtStaffStationError) {
        response.status(403).json({
          error: { code: "FORBIDDEN", message: "This report is not at one of your stations." },
        });
        return;
      }
      if (error instanceof InvalidReceiptTransitionError) {
        response.status(409).json({
          error: {
            code: "INVALID_STATUS_TRANSITION",
            message: "Only reports waiting for stop confirmation can be marked as received.",
          },
        });
        return;
      }
      console.error("Receipt confirmation failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Receipt confirmation is unavailable." },
      });
    }
  });

  return router;
}

export const staffRouter = createStaffRouter({
  database: db,
  getSession: (headers) => auth.api.getSession({ headers }),
});
