import { Router, type Request } from "express";
import { z } from "zod";
import type { Database } from "@myfinds/db";

import {
  ClaimAlreadyDecidedError,
  ClaimAttemptsExhaustedError,
  ClaimNotAllowedError,
  ClaimNotFoundError,
  confirmHandover,
  createClaim,
  decideClaim,
  InvalidHandoverCodeError,
  MatchNotFoundError,
} from "../services/claims";
import { auth, db } from "../services";

type Session = {
  user: { id: string; role: string };
};

type ClaimsRouterDependencies = {
  database: Database;
  getSession: (headers: Request["headers"]) => Promise<Session | null>;
};

const createClaimSchema = z.object({
  matchId: z.string().min(1),
  answers: z.array(z.string().trim().min(1)).min(1).max(3),
});

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

const handoverSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export function createClaimsRouter({ database, getSession }: ClaimsRouterDependencies) {
  const router = Router();

  // Any signed-in user may act; the service enforces the custodian rules.
  async function resolveActor(request: { headers: Request["headers"] }) {
    const session = await getSession(request.headers);
    if (!session) return null;
    if (session.user.role === "STATION_STAFF") {
      const staffRows = await database.stationStaff.findMany({
        where: { userId: session.user.id, active: true },
        select: { stationId: true },
      });
      return {
        userId: session.user.id,
        role: session.user.role,
        stationIds: staffRows.map((row) => row.stationId),
      };
    }
    return { userId: session.user.id, role: session.user.role, stationIds: [] };
  }

  function handleError(response: import("express").Response, error: unknown) {
    if (error instanceof MatchNotFoundError || error instanceof ClaimNotFoundError) {
      response.status(404).json({ error: { code: "NOT_FOUND", message: error.message } });
      return;
    }
    if (error instanceof ClaimAttemptsExhaustedError) {
      response
        .status(409)
        .json({ error: { code: "CLAIM_ATTEMPTS_EXHAUSTED", message: error.message } });
      return;
    }
    if (error instanceof ClaimAlreadyDecidedError) {
      response.status(409).json({ error: { code: "ALREADY_DECIDED", message: error.message } });
      return;
    }
    if (error instanceof ClaimNotAllowedError || error instanceof InvalidHandoverCodeError) {
      response.status(422).json({ error: { code: "INVALID_CLAIM", message: error.message } });
      return;
    }
    console.error("Claim request failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    response
      .status(500)
      .json({ error: { code: "INTERNAL_ERROR", message: "The claim service is unavailable." } });
  }

  router.post("/", async (request, response) => {
    const actor = await resolveActor(request);
    if (!actor) {
      response
        .status(401)
        .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to submit a claim." } });
      return;
    }
    const parsed = createClaimSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({
        error: {
          code: "VALIDATION_FAILED",
          message: "Answer every question before sending the claim.",
          fields: Object.fromEntries(
            parsed.error.issues.map((issue) => [issue.path.join(".") || "form", issue.message]),
          ),
        },
      });
      return;
    }

    try {
      const created = await createClaim(database, {
        matchId: parsed.data.matchId,
        claimantId: actor.userId,
        answers: parsed.data.answers,
      });
      response.status(201).json({ claim: created });
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/:id/decision", async (request, response) => {
    const actor = await resolveActor(request);
    if (!actor) {
      response
        .status(401)
        .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to review claims." } });
      return;
    }
    const parsed = decisionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(422).json({
        error: { code: "VALIDATION_FAILED", message: "Choose approve or reject." },
      });
      return;
    }

    try {
      const result = await decideClaim(database, request.params.id, {
        decision: parsed.data.decision,
        ...actor,
      });
      response.json({ claim: result });
    } catch (error) {
      handleError(response, error);
    }
  });

  router.post("/:id/handover", async (request, response) => {
    const actor = await resolveActor(request);
    if (!actor) {
      response
        .status(401)
        .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to confirm handovers." } });
      return;
    }
    const parsed = handoverSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(422)
        .json({ error: { code: "VALIDATION_FAILED", message: "Enter the 6-digit code." } });
      return;
    }

    try {
      const result = await confirmHandover(database, request.params.id, {
        code: parsed.data.code,
        ...actor,
      });
      response.json({ claim: result });
    } catch (error) {
      handleError(response, error);
    }
  });

  return router;
}

export const claimsRouter = createClaimsRouter({
  database: db,
  getSession: (headers) => auth.api.getSession({ headers }),
});
