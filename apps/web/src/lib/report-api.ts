import { z } from "zod";

import { reportCategories, reportStatuses, type createReportSchema } from "@myfinds/shared";

const placeDirectoryEntrySchema = z.object({
  stationId: z.string(),
  station: z.string(),
  placeType: z.enum(["METRO", "RAILWAY", "BUS_STOP"]),
  cityId: z.string(),
  city: z.string(),
  stateId: z.string(),
  state: z.string(),
});

const placeDirectoryResponseSchema = z.object({
  places: z.array(placeDirectoryEntrySchema),
});

const privateReportStatusSchema = z.object({
  reportNumber: z.string(),
  category: z.enum(reportCategories),
  status: z.enum(reportStatuses),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeline: z.array(
    z.object({
      status: z.enum(reportStatuses),
      date: z.string().datetime(),
    }),
  ),
});

const myReportSchema = z.object({
  id: z.string(),
  number: z.string(),
  type: z.enum(["LOST", "FOUND"]),
  title: z.string(),
  category: z.enum(reportCategories),
  status: z.enum(reportStatuses),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresAt: z.string().datetime(),
  place: z.object({ station: z.string(), city: z.string() }),
});

const myReportsResponseSchema = z.object({ reports: z.array(myReportSchema) });

const reportHistorySchema = z.object({
  status: z.string(),
  action: z.string(),
  date: z.string().datetime(),
});

const claimDecisionSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

const reportClaimSchema = z.object({
  attemptNo: z.number().int(),
  attemptsUsed: z.number().int(),
  decision: claimDecisionSchema,
  handedOverAt: z.string().nullable(),
  handoverExpiresAt: z.string().nullable(),
  handoverStation: z.string().nullable(),
  handoverCounterHours: z.string().nullable(),
  handoverCode: z.string().nullable(),
});

const custodianClaimSchema = z.object({
  id: z.string(),
  attemptNo: z.number().int(),
  decision: claimDecisionSchema,
  decidedAt: z.string().nullable(),
  handedOverAt: z.string().nullable(),
  answers: z.array(z.string()),
});

const reportDetailSchema = z.object({
  report: myReportSchema.extend({
    description: z.string().nullable(),
    color: z.string().nullable(),
    brand: z.string().nullable(),
    claim: reportClaimSchema.nullish(),
    custodianClaims: z.array(custodianClaimSchema).nullish(),
    custodianQuestions: z
      .array(z.object({ question: z.string(), expectedAnswer: z.string() }))
      .nullish(),
    photos: z.array(z.object({ url: z.string() })).nullish(),
    history: z.array(reportHistorySchema),
  }),
});

const reportMatchesResponseSchema = z.object({
  report: z.object({
    id: z.string(),
    type: z.enum(["LOST", "FOUND"]),
    title: z.string(),
    category: z.enum(reportCategories),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expiresAt: z.string().datetime(),
    place: z.object({ station: z.string(), city: z.string() }),
  }),
  matches: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      scoreBreakdown: z.record(z.string(), z.number()),
      candidate: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        brand: z.string().nullable(),
        color: z.string().nullable(),
        category: z.enum(reportCategories),
        eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        questions: z.array(z.string()),
        photos: z.array(z.object({ url: z.string() })),
        place: z.object({ station: z.string(), city: z.string() }),
      }),
      status: z.string(),
      attemptsUsed: z.number().int(),
    }),
  ),
});


const createReportResponseSchema = z.object({
  report: z.object({
    id: z.string(),
    code: z.string(),
    status: z.string(),
  }),
  statusToken: z.string().min(1),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

const staffQueueReportSchema = z.object({
  id: z.string(),
  number: z.string(),
  type: z.enum(["LOST", "FOUND"]),
  title: z.string(),
  category: z.enum(reportCategories),
  status: z.enum(reportStatuses),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place: z.object({ station: z.string(), city: z.string() }),
});

const staffQueueResponseSchema = z.object({ reports: z.array(staffQueueReportSchema) });

const confirmReceiptResponseSchema = z.object({
  report: z.object({
    reportId: z.string(),
    status: z.enum(reportStatuses),
  }),
});

const staffClaimSchema = z.object({
  id: z.string(),
  attemptNo: z.number().int(),
  decision: claimDecisionSchema,
  handoverExpiresAt: z.string().nullable(),
  answers: z.array(z.string()),
  questions: z.array(z.object({ question: z.string(), expectedAnswer: z.string() })),
  report: z.object({
    id: z.string(),
    number: z.string(),
    title: z.string(),
    station: z.string().nullable(),
    photos: z.array(z.object({ url: z.string() })),
  }),
});

const staffClaimsResponseSchema = z.object({ claims: z.array(staffClaimSchema) });

const claimActionResponseSchema = z.object({
  claim: z.object({
    decision: claimDecisionSchema.optional(),
    handoverExpiresAt: z.string().nullable().optional(),
    handedOverAt: z.string().optional(),
  }),
});

type CreateReportInput = z.infer<typeof createReportSchema>;
type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type PlaceDirectoryEntry = z.infer<typeof placeDirectoryEntrySchema>;
export type PrivateReportStatus = z.infer<typeof privateReportStatusSchema>;
export type MyReport = z.infer<typeof myReportSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>["report"];
export type ReportMatch = z.infer<typeof reportMatchesResponseSchema>;
export type StaffQueueReport = z.infer<typeof staffQueueReportSchema>;

export class ReportApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ReportApiError";
  }
}

function getApiUrl(path: string) {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  if (!serverUrl) throw new Error("The report service URL is not configured.");
  return `${serverUrl.replace(/\/$/, "")}${path}`;
}

export async function getPlaces(request: typeof fetch = fetch): Promise<PlaceDirectoryEntry[]> {
  const response = await request(getApiUrl("/api/places"), { cache: "no-store" });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The place directory returned an invalid response.");
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new Error(
      parsedError.success ? parsedError.data.error.message : "The place directory is unavailable.",
    );
  }

  const parsedPlaces = placeDirectoryResponseSchema.safeParse(body);
  if (!parsedPlaces.success) throw new Error("The place directory returned an invalid response.");
  return parsedPlaces.data.places;
}

export async function getPrivateReportStatus(
  token: string,
  request: typeof fetch = fetch,
): Promise<PrivateReportStatus | null> {
  const response = await request(getApiUrl("/api/reports/status"), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Report status is unavailable. Try again later.");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The report status service returned an invalid response.");
  }

  const parsedStatus = privateReportStatusSchema.safeParse(body);
  if (!parsedStatus.success) {
    throw new Error("The report status service returned an invalid response.");
  }
  return parsedStatus.data;
}

export async function getMyReports(request: typeof fetch = fetch): Promise<MyReport[]> {
  const response = await request(getApiUrl("/api/reports/mine"), {
    cache: "no-store",
    credentials: "include",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReportApiError(
      "The report service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "Your reports are unavailable.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
      parsedError.success ? parsedError.data.error.fields : {},
    );
  }

  const parsedReports = myReportsResponseSchema.safeParse(body);
  if (!parsedReports.success) {
    throw new ReportApiError(
      "The report service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  return parsedReports.data.reports;
}

async function parseApiBody(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error("The report service returned an invalid response.");
  }
}

export async function getReport(
  id: string,
  request: typeof fetch = fetch,
): Promise<ReportDetail | null> {
  const response = await request(getApiUrl(`/api/reports/${encodeURIComponent(id)}`), {
    cache: "no-store",
    credentials: "include",
  });
  if (response.status === 404) return null;
  const body = await parseApiBody(response);
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "The report is unavailable.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }
  const parsed = reportDetailSchema.safeParse(body);
  if (!parsed.success) throw new Error("The report service returned an invalid response.");
  return parsed.data.report;
}

export async function getReportMatches(
  id: string,
  request: typeof fetch = fetch,
): Promise<ReportMatch | null> {
  const response = await request(getApiUrl(`/api/reports/${encodeURIComponent(id)}/matches`), {
    cache: "no-store",
    credentials: "include",
  });
  if (response.status === 404) return null;
  const body = await parseApiBody(response);
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "Report matches are unavailable.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }
  const parsed = reportMatchesResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("The report service returned an invalid response.");
  return parsed.data;
}

export function mapReportApiFields(fields: Record<string, string>) {
  const mapped: Record<string, string> = {};

  for (const [path, message] of Object.entries(fields)) {
    const [field, index, detail] = path.split(".");
    const key =
      field === "title"
        ? "itemName"
        : field === "eventDate"
          ? "date"
          : field === "eventTime"
            ? "time"
            : field === "placeStationId"
              ? "place"
              : field === "custodyChoice"
                ? "custody"
                : field === "handInStationId"
                  ? "handInPlace"
                  : field === "questions" && index && detail
                    ? `questions.${index}.${detail === "expectedAnswer" ? "expectedAnswer" : "question"}`
                    : field;

    if (key && !Object.hasOwn(mapped, key)) mapped[key] = message;
  }

  return mapped;
}

export async function submitReport(
  payload: CreateReportInput,
  idempotencyKey: string,
  request: typeof fetch = fetch,
): Promise<CreateReportResponse> {
  const response = await request(getApiUrl("/api/reports"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReportApiError("The report service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    if (!parsedError.success) {
      throw new ReportApiError(
        "The report could not be saved. Try again.",
        "INVALID_RESPONSE",
        response.status,
      );
    }

    throw new ReportApiError(
      parsedError.data.error.message,
      parsedError.data.error.code,
      response.status,
      parsedError.data.error.fields,
    );
  }

  const parsedResponse = createReportResponseSchema.safeParse(body);
  if (!parsedResponse.success) {
    throw new ReportApiError("The report service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }

  return parsedResponse.data;
}

export async function copyReportCode(
  code: string,
  clipboard: Pick<Clipboard, "writeText"> = navigator.clipboard,
) {
  await clipboard.writeText(code);
}

export async function getStaffQueue(): Promise<StaffQueueReport[]> {
  const response = await fetch(getApiUrl("/api/staff/reports"), {
    cache: "no-store",
    credentials: "include",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReportApiError(
      "The staff service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "The staff queue is unavailable.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }

  const parsedQueue = staffQueueResponseSchema.safeParse(body);
  if (!parsedQueue.success) {
    throw new ReportApiError(
      "The staff service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  return parsedQueue.data.reports;
}

export async function confirmReportReceipt(reportId: string): Promise<void> {
  const response = await fetch(getApiUrl(`/api/staff/reports/${reportId}/confirm-receipt`), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReportApiError(
      "The staff service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "Receipt confirmation failed.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }

  const parsedConfirmation = confirmReceiptResponseSchema.safeParse(body);
  if (!parsedConfirmation.success) {
    throw new ReportApiError(
      "The staff service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
}

async function postClaimAction(path: string, body: unknown, fallbackError: string): Promise<void> {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let parsedBody: unknown;
  try {
    parsedBody = await response.json();
  } catch {
    throw new ReportApiError("The claim service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(parsedBody);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : fallbackError,
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!claimActionResponseSchema.safeParse(parsedBody).success) {
    throw new ReportApiError("The claim service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }
}

export async function submitReportClaim(matchId: string, answers: string[]): Promise<void> {
  await postClaimAction("/api/claims", { matchId, answers }, "The claim could not be sent.");
}

export async function decideReportClaim(claimId: string, decision: "APPROVED" | "REJECTED"): Promise<void> {
  await postClaimAction(`/api/claims/${claimId}/decision`, { decision }, "The claim decision failed.");
}

export async function confirmReportHandover(claimId: string, code: string): Promise<void> {
  await postClaimAction(`/api/claims/${claimId}/handover`, { code }, "The handover code was rejected.");
}

export type StaffClaim = z.infer<typeof staffClaimSchema>;

export async function getStaffClaims(): Promise<StaffClaim[]> {
  const response = await fetch(getApiUrl("/api/staff/claims"), {
    cache: "no-store",
    credentials: "include",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReportApiError("The staff service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }

  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(body);
    throw new ReportApiError(
      parsedError.success ? parsedError.data.error.message : "The staff claims list is unavailable.",
      parsedError.success ? parsedError.data.error.code : "INVALID_RESPONSE",
      response.status,
    );
  }

  const parsed = staffClaimsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ReportApiError("The staff service returned an invalid response.", "INVALID_RESPONSE", response.status);
  }
  return parsed.data.claims;
}
