import { describe, expect, it } from "bun:test";

import {
  canMatch,
  findMatches,
  getMatchReasons,
  scoreMatch,
  type MatchReport,
} from "./matching";

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

  it("rejects reports before station receipt", () => {
    expect(canMatch(base, found({ status: "SUBMITTED_TO_STOP" }))).toBe(false);
  });

  it("rejects different categories and cities", () => {
    expect(canMatch(base, found({ category: "WALLET" }))).toBe(false);
    expect(canMatch(base, found({ cityId: "gurugram" }))).toBe(false);
  });

  it("rejects reports outside the date window", () => {
    expect(
      canMatch(base, found({ eventDate: new Date("2026-11-20T00:00:00Z") })),
    ).toBe(false);
  });

  it("rejects found reports dated more than one day before the loss", () => {
    expect(
      canMatch(base, found({ eventDate: new Date("2026-11-03T00:00:00Z") })),
    ).toBe(false);
  });

  it("rejects expired reports", () => {
    const now = new Date("2026-11-07T00:00:00Z");
    expect(canMatch(base, found({ expiresAt: now }), now)).toBe(false);
  });

  it("scores city and place-type matches below same-station matches", () => {
    const result = scoreMatch(
      base,
      found({ stationId: "other", placeType: "METRO" }),
    );
    expect(result.breakdown.place).toBe(0.5);
    expect(result.score).toBeLessThan(scoreMatch(base, found()).score);
  });

  it("adds human-readable reasons for matching details", () => {
    const result = scoreMatch(base, found());
    expect(result.reasons).toEqual([
      "Same station",
      "Similar item details",
      "Close report dates",
      "Same color",
      "Same brand",
    ]);
    expect(getMatchReasons(result.breakdown, base, found())).toEqual(result.reasons);
  });

  it("supports matching when the input report is found", () => {
    const result = findMatches(found(), [base]);
    expect(result).toHaveLength(1);
    expect(result[0]?.candidate.id).toBe(base.id);
  });

  it("returns candidates ordered by score and excludes weak matches", () => {
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
