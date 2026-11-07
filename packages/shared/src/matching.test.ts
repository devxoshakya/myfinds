import { describe, expect, it } from "bun:test";

import { canMatch, findMatches, scoreMatch, type MatchReport } from "./matching";

const base: MatchReport = {
  id: "lost-1",
  type: "LOST",
  category: "PHONE",
  title: "Black Samsung phone",
  description: "Black phone with a cracked corner",
  brand: "Samsung",
  color: "Black",
  eventDate: new Date("2026-11-05T00:00:00Z"),
  expiresAt: new Date("2026-12-01T00:00:00Z"),
  status: "SUBMITTED",
  stationId: "rajiv",
  cityId: "delhi",
  placeType: "METRO",
};

function found(overrides: Partial<MatchReport> = {}): MatchReport {
  return {
    ...base,
    id: "found-1",
    type: "FOUND",
    status: "RECEIVED_BY_STOP",
    ...overrides,
  };
}

describe("matching rules", () => {
  it("scores a same-station, same-attribute candidate above the threshold", () => {
    const result = scoreMatch(base, found());
    expect(result.score).toBeGreaterThanOrEqual(0.65);
    expect(result.breakdown).toEqual({ place: 1, text: 1, date: 1, attributes: 1 });
  });

  it("rejects station-submission reports until receipt", () => {
    expect(canMatch(base, found({ status: "SUBMITTED_TO_STOP" }))).toBe(false);
  });

  it("enforces category, city, and the 14-day window", () => {
    expect(canMatch(base, found({ category: "WALLET" }))).toBe(false);
    expect(canMatch(base, found({ cityId: "gurugram" }))).toBe(false);
    expect(
      canMatch(base, found({ eventDate: new Date("2026-11-20T00:00:00Z") })),
    ).toBe(false);
  });

  it("returns candidates ordered by score", () => {
    const results = findMatches(base, [
      found({ id: "same", stationId: "rajiv" }),
      found({
        id: "city-only",
        stationId: "other",
        placeType: "RAILWAY",
        title: "Phone",
        description: "Unrelated item",
        brand: null,
        color: "red",
      }),
    ]);
    expect(results.map((result) => result.candidate.id)).toEqual(["same"]);
  });
});
