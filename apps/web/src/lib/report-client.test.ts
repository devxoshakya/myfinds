import { afterEach, describe, expect, it, vi } from "vitest";

import {
  copyReportCode,
  getReport,
  getReportMatches,
  getPrivateReportStatus,
  getMyReports,
  mapReportApiFields,
  ReportApiError,
  submitReport,
} from "./report-api";

const payload = {
  type: "FOUND" as const,
  title: "Leather wallet",
  category: "WALLET" as const,
  eventDate: "2026-11-04",
  placeStationId: "station-1",
  custodyChoice: "FINDER" as const,
  questions: [{ question: "What is inside?", expectedAnswer: "Private detail" }],
};
const idempotencyKey = "550e8400-e29b-41d4-a716-446655440000";

const originalServerUrl = process.env.NEXT_PUBLIC_SERVER_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalServerUrl === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
  else process.env.NEXT_PUBLIC_SERVER_URL = originalServerUrl;
});

describe("submitReport", () => {
  it("posts the payload with the Better Auth session cookie and returns the report code and token", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test/";
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          report: { id: "report-id", code: "MF-1042", status: "SUBMITTED" },
          statusToken: "private-token",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(submitReport(payload, idempotencyKey, request)).resolves.toMatchObject({
      report: { code: "MF-1042" },
      statusToken: "private-token",
    });
    expect(request).toHaveBeenCalledWith(
      "https://api.example.test/api/reports",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      }),
    );
  });

  it("surfaces API validation details for the form", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_FAILED",
            message: "Check the report details and try again.",
            fields: { title: "Enter an item name.", "questions.0.expectedAnswer": "Required." },
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      submitReport(payload, idempotencyKey, request),
    ).rejects.toMatchObject<Partial<ReportApiError>>({
      code: "VALIDATION_FAILED",
      status: 422,
      fields: { title: "Enter an item name." },
    });
    expect(
      mapReportApiFields({
        title: "Enter an item name.",
        eventDate: "Choose a date.",
        placeStationId: "Choose a station.",
        handInStationId: "Choose a hand-in station.",
        "questions.0.expectedAnswer": "Enter an answer.",
      }),
    ).toEqual({
      itemName: "Enter an item name.",
      date: "Choose a date.",
      place: "Choose a station.",
      handInPlace: "Choose a hand-in station.",
      "questions.0.expectedAnswer": "Enter an answer.",
    });
  });

  it("allows retrying the same payload after a failed request", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: "RATE_LIMITED", message: "Try again later." } }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            report: { id: "report-id", code: "MF-1043", status: "SUBMITTED" },
            statusToken: "private-token",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );

    await expect(submitReport(payload, idempotencyKey, request)).rejects.toBeInstanceOf(ReportApiError);
    await expect(submitReport(payload, idempotencyKey, request)).resolves.toMatchObject({
      report: { code: "MF-1043" },
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[1]?.body).toBe(request.mock.calls[1]?.[1]?.body);
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({
      "Idempotency-Key": idempotencyKey,
    });
    expect(request.mock.calls[1]?.[1]?.headers).toMatchObject({
      "Idempotency-Key": idempotencyKey,
    });
  });
});

describe("copyReportCode", () => {
  it("copies the visible report number", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await copyReportCode("MF-1042", { writeText });
    expect(writeText).toHaveBeenCalledWith("MF-1042");
  });
});

describe("getPrivateReportStatus", () => {
  it("sends the token in a no-store request body and validates the limited response", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const token = "A".repeat(43);
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          reportNumber: "MF-1042",
          category: "WALLET",
          status: "MATCHING",
          eventDate: "2026-10-30",
          timeline: [{ status: "MATCHING", date: "2026-10-30T10:01:00.000Z" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(getPrivateReportStatus(token, request)).resolves.toMatchObject({
      reportNumber: "MF-1042",
      status: "MATCHING",
    });
    expect(request).toHaveBeenCalledWith(
      "https://api.example.test/api/reports/status",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ token }),
      }),
    );
    expect(request.mock.calls[0]?.[0]).not.toContain(token);
  });

  it("treats a not-found response as an invalid private link", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    await expect(getPrivateReportStatus("A".repeat(43), request)).resolves.toBeNull();
  });
});

describe("getMyReports", () => {
  it("requests the authenticated user's report endpoint without caching", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          reports: [
            {
              id: "report-id",
              number: "MF-1042",
              type: "FOUND",
              title: "Leather wallet",
              category: "WALLET",
              status: "SUBMITTED",
              eventDate: "2026-11-04",
              expiresAt: "2027-01-03T00:00:00.000Z",
              place: { station: "Central", city: "Example City" },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(getMyReports(request)).resolves.toMatchObject([
      { id: "report-id", number: "MF-1042", place: { station: "Central" } },
    ]);
    expect(request).toHaveBeenCalledWith(
      "https://api.example.test/api/reports/mine",
      expect.objectContaining({ cache: "no-store", credentials: "include" }),
    );
  });

  describe("report detail and matches", () => {
    it("parses a real report detail response", async () => {
      process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
      const request = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            report: {
              id: "report-id",
              number: "MF-1042",
              type: "LOST",
              title: "Leather wallet",
              category: "WALLET",
              description: "A private detail",
              color: "Black",
              brand: "Baggit",
              status: "MATCH_FOUND",
              eventDate: "2026-11-04",
              expiresAt: "2027-01-03T00:00:00.000Z",
              place: { station: "Central", city: "Example City" },
              history: [
                {
                  status: "MATCH_FOUND",
                  action: "MATCH_FOUND",
                  date: "2026-11-04T10:00:00.000Z",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

      await expect(getReport("report-id", request)).resolves.toMatchObject({
        id: "report-id",
        status: "MATCH_FOUND",
      });
    });

    it("parses matches and returns null for a missing report", async () => {
      process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
      const request = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            report: {
              id: "report-id",
              title: "Leather wallet",
              category: "WALLET",
              eventDate: "2026-11-04",
              expiresAt: "2027-01-03T00:00:00.000Z",
              place: { station: "Central", city: "Example City" },
            },
            matches: [],
          }),
          { status: 200 },
        ),
      );

      await expect(getReportMatches("report-id", request)).resolves.toMatchObject({
        matches: [],
      });
      expect(request).toHaveBeenCalledWith(
        "https://api.example.test/api/reports/report-id/matches",
        expect.objectContaining({ cache: "no-store", credentials: "include" }),
      );
    });
  });

  it("surfaces an unauthenticated response instead of showing sample reports", async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = "https://api.example.test";
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "Sign in to view your reports." },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(getMyReports(request)).rejects.toMatchObject<Partial<ReportApiError>>({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });
});
