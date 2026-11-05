import { describe, expect, it } from "vitest";
import { createFoundReportSchema } from "@myfinds/shared";

import { foundSchema } from "./schema";

const place = {
  stateId: "state-1",
  state: "State",
  cityId: "city-1",
  city: "City",
  placeType: "METRO",
  stationId: "station-1",
  station: "Station",
  note: "",
};

const formReport = (custody: "FINDER" | "STATION", questions: unknown[]) => ({
  itemName: "Wallet",
  category: "WALLET",
  description: "",
  color: "",
  brand: "",
  date: "2026-11-04",
  time: "",
  place,
  custody,
  handInPlace: place,
  questions,
});

const apiReport = (custodyChoice: "FINDER" | "STATION", questions: unknown[]) => ({
  type: "FOUND",
  title: "Wallet",
  category: "WALLET",
  eventDate: "2026-11-04",
  placeStationId: "station-1",
  custodyChoice,
  handInStationId: custodyChoice === "STATION" ? "station-1" : undefined,
  questions,
});

describe("verification question form and API validation", () => {
  it("accepts a complete required question with a blank optional second row", () => {
    const questions = [
      { question: " What is inside? ", expectedAnswer: " A key " },
      { question: " ", expectedAnswer: "" },
    ];

    expect(foundSchema.safeParse(formReport("FINDER", questions)).success).toBe(true);
    expect(createFoundReportSchema.parse(apiReport("FINDER", questions)).questions).toEqual([
      { question: "What is inside?", expectedAnswer: "A key" },
    ]);
  });

  it("rejects a missing required finder question or an incomplete question on both layers", () => {
    const blankQuestion = [{ question: " ", expectedAnswer: "" }];
    const incompleteQuestion = [{ question: "What is inside?", expectedAnswer: " " }];

    for (const questions of [blankQuestion, incompleteQuestion]) {
      expect(foundSchema.safeParse(formReport("FINDER", questions)).success).toBe(false);
      expect(createFoundReportSchema.safeParse(apiReport("FINDER", questions)).success).toBe(false);
    }
  });

  it("allows blank station-custody rows and rejects partially completed rows", () => {
    const blankQuestion = [{ question: "", expectedAnswer: "" }];
    const incompleteQuestion = [{ question: "What is inside?", expectedAnswer: "" }];

    expect(foundSchema.safeParse(formReport("STATION", blankQuestion)).success).toBe(true);
    expect(createFoundReportSchema.parse(apiReport("STATION", blankQuestion)).questions).toEqual([]);
    expect(foundSchema.safeParse(formReport("STATION", incompleteQuestion)).success).toBe(false);
    expect(createFoundReportSchema.safeParse(apiReport("STATION", incompleteQuestion)).success).toBe(
      false,
    );
  });
});
