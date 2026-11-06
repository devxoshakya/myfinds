import { z } from "zod";

export const reportCategories = [
  "PHONE",
  "WALLET",
  "KEYS",
  "BAG",
  "ID_CARD",
  "LAPTOP",
  "HEADPHONES",
  "CLOTHING",
  "OTHER",
] as const;

export const reportStatuses = [
  "SUBMITTED",
  "SUBMITTED_TO_STOP",
  "RECEIVED_BY_STOP",
  "MATCHING",
  "MATCH_FOUND",
  "CLAIMED",
  "VERIFIED",
  "RETURNED",
  "EXPIRED",
  "WITHDRAWN",
] as const;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date.")
  .refine((value) => value <= new Date().toISOString().slice(0, 10), "The date cannot be in the future.");

export const verificationQuestionSchema = z
  .object({
    question: z.string().trim().max(300),
    expectedAnswer: z.string().trim().max(300),
  })
  .strict()
  .superRefine((question, context) => {
    if (!question.question && !question.expectedAnswer) return;
    if (!question.question) {
      context.addIssue({
        code: "custom",
        path: ["question"],
        message: "Enter a verification question.",
      });
    }
    if (!question.expectedAnswer) {
      context.addIssue({
        code: "custom",
        path: ["expectedAnswer"],
        message: "Enter the expected answer.",
      });
    }
  });

const commonReportSchema = z.object({
  title: z.string().trim().min(1, "Enter an item name."),
  category: z.enum(reportCategories),
  description: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
  eventDate: dateOnlySchema,
  eventTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.")
    .optional()
    .or(z.literal("")),
  placeStationId: z.string().trim().min(1, "Choose a station or stop."),
  placeNote: z.string().max(120, "Use 120 characters or fewer.").optional(),
});

export const createLostReportSchema = commonReportSchema
  .extend({ type: z.literal("LOST") })
  .strict();

export const createFoundReportSchema = commonReportSchema
  .extend({
    type: z.literal("FOUND"),
    custodyChoice: z.enum(["FINDER", "STATION"]),
    handInStationId: z.string().trim().min(1).optional(),
    questions: z.array(verificationQuestionSchema).max(2, "Add no more than two questions."),
  })
  .strict()
  .superRefine((report, context) => {
    if (
      report.custodyChoice === "FINDER" &&
      (!report.questions[0]?.question || !report.questions[0]?.expectedAnswer)
    ) {
      context.addIssue({
        code: "custom",
        path: ["questions", 0],
        message: "Complete the first question and answer.",
      });
    }

    if (report.custodyChoice === "STATION" && !report.handInStationId) {
      context.addIssue({
        code: "custom",
        path: ["handInStationId"],
        message: "Choose the station or stop where you handed it in.",
      });
    }
  })
  .transform((report) => ({
    ...report,
    questions: report.questions.filter((question) => question.question || question.expectedAnswer),
  }));

export const createReportSchema = z.discriminatedUnion("type", [
  createLostReportSchema,
  createFoundReportSchema,
]);

export const reportDetailsSchema = z.object({
  itemName: z.string().trim().min(1, "Enter an item name."),
  category: z.string().trim().min(1, "Choose a category."),
  description: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
});
