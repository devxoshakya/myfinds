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

type CreateReportInput = z.infer<typeof createReportSchema>;
type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type PlaceDirectoryEntry = z.infer<typeof placeDirectoryEntrySchema>;
export type PrivateReportStatus = z.infer<typeof privateReportStatusSchema>;
export type MyReport = z.infer<typeof myReportSchema>;

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
