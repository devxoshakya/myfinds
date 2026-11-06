import {
  reportCategories,
  reportDetailsSchema,
  verificationQuestionSchema,
} from "@myfinds/shared";
import { z } from "zod";

export const placeTypes = [
  { value: "METRO", label: "Metro" },
  { value: "RAILWAY", label: "Railway" },
  { value: "BUS_STOP", label: "Bus stop" },
] as const;

export const custodyChoices = [
  {
    value: "FINDER",
    title: "I'll keep it and return it myself",
    detail:
      "Hold the item safely until the verified owner claims it with a secure handover code.",
  },
  {
    value: "STATION",
    title: "I'm handing it to a station or stop",
    detail:
      "That station becomes responsible for the item. Staff will confirm they received it.",
  },
] as const;

export type Custody = (typeof custodyChoices)[number]["value"];

export type PlaceValue = {
  stateId: string;
  state: string;
  cityId: string;
  city: string;
  placeType: string;
  stationId: string;
  station: string;
  note: string;
};

export type QuestionValue = {
  question: string;
  expectedAnswer: string;
};

export type FormValues = {
  itemName: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  date: string;
  time: string;
  place: PlaceValue;
  custody: Custody | "";
  handInPlace: PlaceValue;
  sameAsFound: boolean;
  questions: QuestionValue[];
};

export const emptyPlace = (): PlaceValue => ({
  stateId: "",
  state: "",
  cityId: "",
  city: "",
  placeType: "",
  stationId: "",
  station: "",
  note: "",
});

export function currentDate() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export const placeSchema = z
  .object({
    stateId: z.string().min(1, "Choose a state."),
    state: z.string().min(1, "Choose a state."),
    cityId: z.string().min(1, "Choose a city."),
    city: z.string().min(1, "Choose a city."),
    placeType: z.string().min(1, "Choose a place type."),
    stationId: z.string().min(1, "Choose a station from the list."),
    station: z.string().min(1, "Choose a station or stop."),
    note: z.string().max(120, "Use 120 characters or fewer."),
  });

const commonSchema = reportDetailsSchema.extend({
  category: z.enum(reportCategories),
  date: z
    .string()
    .min(1, "Choose a date.")
    .refine((value) => value <= currentDate(), "The date cannot be in the future."),
  time: z.string(),
  place: placeSchema,
});

export const lostSchema = commonSchema;

export const foundSchema = commonSchema
  .extend({
    custody: z.enum(["FINDER", "STATION"]),
    handInPlace: placeSchema.optional(),
    questions: z.array(verificationQuestionSchema).max(2, "Add no more than two questions."),
  })
  .superRefine((values, context) => {
    if (values.custody === "STATION" && !values.handInPlace) {
      context.addIssue({
        code: "custom",
        path: ["handInPlace"],
        message: "Choose where you handed in the item.",
      });
    }

    if (
      values.custody === "FINDER" &&
      (!values.questions[0]?.question || !values.questions[0]?.expectedAnswer)
    ) {
      context.addIssue({
        code: "custom",
        path: ["questions", 0],
        message: "Complete the first question and answer.",
      });
    }
  });

export const inputClassName =
  "h-11 rounded-sm border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring";

export const selectClassName =
  "h-11 w-full rounded-sm border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";

/** Maps a Zod issue path to the DOM id that should receive focus. */
export function fieldIdForPath(path: (string | number)[]): string | undefined {
  const [first, second, third] = path;
  switch (first) {
    case "itemName":
    case "category":
    case "description":
    case "color":
    case "brand":
    case "date":
    case "time":
      return String(first);
    case "custody":
      return "custody-finder";
    case "place":
      return second === "station" ? "place-station" : `place-${String(second ?? "state")}`;
    case "handInPlace":
      return second === "station"
        ? "handInPlace-station"
        : `handInPlace-${String(second ?? "state")}`;
    case "questions":
      return typeof second === "number" && third
        ? `${third === "expectedAnswer" ? "expected-answer" : "question"}-${second}`
        : valuesQuestionId(second);
    default:
      return undefined;
  }
}

function valuesQuestionId(second: string | number | undefined) {
  return typeof second === "number" ? `question-${second}` : undefined;
}
