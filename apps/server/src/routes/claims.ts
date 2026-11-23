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
  InvalidClaimDecisionReasonError,
  InvalidHandoverCodeError,
  MatchNotFoundError,
  MissingHandoverIdTypeError,
} from "../services/claims";
import { InvalidStatusTransitionError } from "../services/status-transitions";
import { consumeClaimSubmitLimit, consumeHandoverAttemptLimit } from "../rate-limit";
import { auth, db, describeError } from "../services";

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

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVED") }),
  z.object({
    decision: z.literal("REJECTED"),
    decisionNote: z.string().trim().min(1).max(500),
  }),
]);

const handoverIdTypes = ["GOVERNMENT_ID", "DRIVING_LICENCE", "PASSPORT", "OTHER"] as const;

const handoverSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
  // BR-21: the ID type checked at the counter, never the ID number.
  idType: z.enum(handoverIdTypes).optional(),
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
    if (error instanceof InvalidStatusTransitionError) {
      response.status(409).json({
        error: { code: "INVALID_STATUS_TRANSITION", message: error.message },
      });
      return;
    }
    if (error instanceof InvalidClaimDecisionReasonError) {
      response.status(422).json({
        error: { code: "VALIDATION_FAILED", message: error.message },
      });
      return;
    }
    if (error instanceof MissingHandoverIdTypeError) {
      response.status(422).json({
        error: { code: "VALIDATION_FAILED", message: error.message },
      });
      return;
    }
    if (error instanceof ClaimNotAllowedError || error instanceof InvalidHandoverCodeError) {
      response.status(422).json({ error: { code: "INVALID_CLAIM", message: error.message } });
      return;
    }
    console.error("Claim request failed", {
      ...describeError(error),
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
    const rateLimit = consumeClaimSubmitLimit(actor.userId);
    if (!rateLimit.allowed) {
      response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      response.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many claim attempts. Try again later." },
      });
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
        error: {
          code: "VALIDATION_FAILED",
          message: "Choose approve or reject and include a rejection reason of 1 to 500 characters.",
        },
      });
      return;
    }

    try {
      const result = await decideClaim(database, request.params.id, {
        ...parsed.data,
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
    const rateLimit = consumeHandoverAttemptLimit(request.params.id);
    if (!rateLimit.allowed) {
      response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      response.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many handover code attempts. Try again later." },
      });
      return;
    }

    try {
      const result = await confirmHandover(database, request.params.id, {
        code: parsed.data.code,
        idType: parsed.data.idType,
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
