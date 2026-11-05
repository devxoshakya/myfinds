// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getPlaces: vi.fn(),
  submitReport: vi.fn(),
  copyReportCode: vi.fn(),
}));

vi.mock("@/lib/report-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/report-api")>();
  return {
    ...actual,
    getPlaces: api.getPlaces,
    submitReport: api.submitReport,
    copyReportCode: api.copyReportCode,
  };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import ReportForm from "./index";
import { ReportApiError } from "@/lib/report-api";

const places = [
  {
    stationId: "station-1",
    station: "Central",
    placeType: "METRO" as const,
    cityId: "city-1",
    city: "Example City",
    stateId: "state-1",
    state: "Example State",
  },
];

const submissionResult = {
  report: { id: "report-id", code: "MF-84", status: "SUBMITTED" },
  statusToken: "private-status-token",
};

async function renderForm(kind: "lost" | "found") {
  render(<ReportForm kind={kind} />);
  await waitFor(() => expect(api.getPlaces).toHaveBeenCalled());
  await waitFor(() =>
    expect((screen.getByRole("button", { name: "Submit report" }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
}

function changeField(id: string, value: string) {
  const field = document.getElementById(id);
  if (!field) throw new Error(`Missing form field: ${id}`);
  fireEvent.change(field, { target: { value } });
}

function field(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing form field: ${id}`);
  return element;
}

function fillPlace(id = "place") {
  changeField(`${id}-state`, "state-1");
  changeField(`${id}-city`, "city-1");
  fireEvent.click(screen.getByRole("button", { name: "Metro" }));
  changeField(`${id}-station`, "Central");
  changeField(`${id}-note`, "Near the north entrance");
}

function fillItemDetails(kind: "lost" | "found") {
  changeField("itemName", "Leather wallet");
  changeField("category", "WALLET");
  changeField("brand", "Example Brand");
  changeField("color", "Brown");
  changeField("description", "Small scratch on the front");
  changeField("time", "14:25");
  fillPlace();
  if (kind === "found") {
    changeField("date", "2026-11-04");
  }
}

function submitForm() {
  fireEvent.click(screen.getByRole("button", { name: "Submit report" }));
}

describe("Lost and Found report forms", () => {
  beforeEach(() => {
    api.getPlaces.mockResolvedValue(places);
    api.submitReport.mockResolvedValue(submissionResult);
    api.copyReportCode.mockResolvedValue(undefined);
    vi.spyOn(window.crypto, "randomUUID").mockReturnValue(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queueMicrotask(() => callback(0));
      return 1;
    });
    vi.stubGlobal("scrollTo", vi.fn());
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: vi.fn(),
      });
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders Lost Report required fields and blocks invalid submissions", async () => {
    await renderForm("lost");

    expect(screen.getByRole("heading", { name: "Report a lost item" })).toBeTruthy();
    expect(field("itemName").getAttribute("aria-required")).toBe("true");
    expect(field("category").getAttribute("aria-required")).toBe("true");
    expect(field("date").getAttribute("aria-required")).toBe("true");

    submitForm();

    expect(await screen.findByText("Enter an item name.")).toBeTruthy();
    expect(field("category").getAttribute("aria-invalid")).toBe("true");
    expect(api.submitReport).not.toHaveBeenCalled();
  });

  it("maps Lost Report fields to the API payload and shows the private status link after success", async () => {
    await renderForm("lost");
    fillItemDetails("lost");
    const eventDate = (field("date") as HTMLInputElement).value;
    submitForm();

    await waitFor(() => expect(api.submitReport).toHaveBeenCalledTimes(1));
    const [payload, idempotencyKey] = api.submitReport.mock.calls[0] as [
      Record<string, unknown>,
      string,
    ];

    expect(payload).toEqual({
      type: "LOST",
      title: "Leather wallet",
      category: "WALLET",
      description: "Small scratch on the front",
      color: "Brown",
      brand: "Example Brand",
      eventDate,
      eventTime: "14:25",
      placeStationId: "station-1",
      placeNote: "Near the north entrance",
    });
    expect(idempotencyKey).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(await screen.findByRole("heading", { name: "Your report was submitted" })).toBeTruthy();
    expect(screen.getByLabelText("Report number").textContent).toBe("MF-84");

    const statusLink = screen.getByRole("link", { name: /private-status-token/ });
    expect(statusLink.getAttribute("href")).toBe("/status/private-status-token");
  });

  it("preserves Lost Report input and reuses the idempotency key after an API error", async () => {
    api.submitReport
      .mockRejectedValueOnce(new ReportApiError("Service unavailable.", "INTERNAL_ERROR", 503))
      .mockResolvedValueOnce(submissionResult);
    await renderForm("lost");
    fillItemDetails("lost");

    submitForm();
    expect(await screen.findByText("Service unavailable.")).toBeTruthy();
    expect((field("itemName") as HTMLInputElement).value).toBe("Leather wallet");
    expect((field("description") as HTMLTextAreaElement).value).toBe(
      "Small scratch on the front",
    );

    submitForm();
    await waitFor(() => expect(api.submitReport).toHaveBeenCalledTimes(2));
    expect(api.submitReport.mock.calls[0]?.[1]).toBe(api.submitReport.mock.calls[1]?.[1]);
    expect(api.submitReport.mock.calls[1]?.[0]).toEqual(api.submitReport.mock.calls[0]?.[0]);
    expect(await screen.findByRole("heading", { name: "Your report was submitted" })).toBeTruthy();
  });

  it("requires a complete first Found Report verification question and excludes its answer from success output", async () => {
    await renderForm("found");
    fillItemDetails("found");
    fireEvent.click(screen.getByRole("radio", { name: /I'll keep it and return it myself/ }));

    expect(field("question-0").getAttribute("aria-required")).toBe("true");
    expect(field("expected-answer-0").getAttribute("aria-required")).toBe("true");
    submitForm();
    expect(await screen.findByText("Complete the first question and answer.")).toBeTruthy();
    expect(api.submitReport).not.toHaveBeenCalled();

    changeField("question-0", " What is the lock screen image? ");
    submitForm();
    expect(await screen.findByText("Enter the expected answer.")).toBeTruthy();
    expect(api.submitReport).not.toHaveBeenCalled();

    changeField("expected-answer-0", " A mountain ");
    submitForm();
    await waitFor(() => expect(api.submitReport).toHaveBeenCalledTimes(1));

    const [payload] = api.submitReport.mock.calls[0] as [Record<string, unknown>, string];
    expect(payload).toMatchObject({
      type: "FOUND",
      custodyChoice: "FINDER",
      questions: [{ question: "What is the lock screen image?", expectedAnswer: "A mountain" }],
    });
    await screen.findByRole("heading", { name: "Your report was submitted" });
    expect(document.body.textContent).not.toContain("A mountain");
    expect(screen.getByLabelText("Report number").textContent).not.toContain("private-status-token");
    expect(screen.getByRole("link", { name: /private-status-token/ }).getAttribute("href")).toBe(
      "/status/private-status-token",
    );
  });

  it("allows removing optional station questions and submits no blank questions", async () => {
    await renderForm("found");
    fillItemDetails("found");
    fireEvent.click(screen.getByRole("radio", { name: /I'm handing it to a station or stop/ }));
    fireEvent.click(screen.getByLabelText("Same as where I found it"));
    fireEvent.click(screen.getByRole("button", { name: "Add a question" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a question" }));

    expect(field("question-0").getAttribute("aria-required")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Remove question 1" }));
    expect(field("question-0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove question 1" }));
    expect(document.getElementById("question-0")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add a question" }));
    submitForm();

    await waitFor(() => expect(api.submitReport).toHaveBeenCalledTimes(1));
    const [payload] = api.submitReport.mock.calls[0] as [Record<string, unknown>, string];
    expect(payload).toMatchObject({
      type: "FOUND",
      custodyChoice: "STATION",
      handInStationId: "station-1",
      questions: [],
    });
  });
});
