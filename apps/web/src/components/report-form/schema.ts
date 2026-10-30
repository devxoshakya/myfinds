import { placeDirectory } from "@/lib/preview-data";
import { z } from "zod";

export const categories = [
  "Phone",
  "Wallet",
  "Keys",
  "Bag",
  "ID card",
  "Laptop",
  "Headphones",
  "Clothing",
  "Other",
] as const;

export const placeTypes = [
  { value: "Metro", label: "Metro" },
  { value: "Railway", label: "Railway" },
  { value: "Bus stop", label: "Bus stop" },
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
  state: string;
  city: string;
  placeType: string;
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
  state: "",
  city: "",
  placeType: "",
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
    state: z.string().min(1, "Choose a state."),
    city: z.string().min(1, "Choose a city."),
    placeType: z.string().min(1, "Choose a place type."),
    station: z.string().min(1, "Choose a station or stop."),
    note: z.string().max(120, "Use 120 characters or fewer."),
  })
  .superRefine((place, context) => {
    if (
      place.station &&
      !placeDirectory.some(
        (option) =>
          option.state === place.state &&
          option.city === place.city &&
          option.placeType === place.placeType &&
          option.station === place.station,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["station"],
        message: "Choose a station from the list.",
      });
    }
  });

const commonSchema = z.object({
  itemName: z
    .string()
    .trim()
    .min(1, "Enter an item name.")
    .max(80, "Use 80 characters or fewer."),
  category: z.enum(categories, { error: "Choose a category." }),
  description: z.string().max(1000, "Use 1,000 characters or fewer."),
  color: z.string().max(80, "Use 80 characters or fewer."),
  brand: z.string().max(80, "Use 80 characters or fewer."),
  date: z
    .string()
    .min(1, "Choose a date.")
    .refine((value) => value <= currentDate(), "The date cannot be in the future."),
  time: z.string(),
  place: placeSchema,
});

const questionSchema = z.object({
  question: z.string().max(300, "Use 300 characters or fewer."),
  expectedAnswer: z.string().max(300, "Use 300 characters or fewer."),
});

export const lostSchema = commonSchema;

export const foundSchema = commonSchema
  .extend({
    custody: z.string().refine((value) => value === "FINDER" || value === "STATION", {
      message: "Choose how you will return the item.",
    }),
    handInPlace: placeSchema.optional(),
    questions: z.array(questionSchema).max(2, "Add no more than two questions."),
  })
  .superRefine((values, context) => {
    if (values.custody === "FINDER" && values.questions.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["questions"],
        message: "Add at least one question only the owner can answer.",
      });
    }

    values.questions.forEach((question, index) => {
      if (!question.question.trim() && !question.expectedAnswer.trim()) {
        return;
      }

      if (!question.question.trim()) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "question"],
          message: "Enter a verification question.",
        });
      }

      if (!question.expectedAnswer.trim()) {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "expectedAnswer"],
          message: "Enter the expected answer.",
        });
      }
    });
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
