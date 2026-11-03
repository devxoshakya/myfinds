import { describe, expect, it } from "vitest";
import { reportDetailsSchema } from "@myfinds/shared";

const validReportDetails = {
  itemName: "Leather wallet",
  category: "Wallet",
};

describe("reportDetailsSchema", () => {
  it("accepts valid required fields with optional fields omitted", () => {
    expect(reportDetailsSchema.safeParse(validReportDetails).success).toBe(true);
  });

  it("rejects missing item name or category", () => {
    expect(reportDetailsSchema.safeParse({ category: "Wallet" }).success).toBe(false);
    expect(reportDetailsSchema.safeParse({ itemName: "Leather wallet" }).success).toBe(false);
  });

  it("rejects empty or whitespace-only required fields", () => {
    expect(
      reportDetailsSchema.safeParse({
        itemName: "   ",
        category: "Wallet",
      }).success,
    ).toBe(false);
    expect(
      reportDetailsSchema.safeParse({
        itemName: "Leather wallet",
        category: "   ",
      }).success,
    ).toBe(false);
  });

  it("accepts optional fields when omitted or empty", () => {
    expect(reportDetailsSchema.safeParse(validReportDetails).success).toBe(true);
    expect(
      reportDetailsSchema.safeParse({
        ...validReportDetails,
        description: "",
        color: "",
        brand: "",
      }).success,
    ).toBe(true);
  });

  it("accepts free-form category and color values without length limits", () => {
    expect(
      reportDetailsSchema.safeParse({
        itemName: "a".repeat(500),
        category: "Other item category",
        description: "a".repeat(2000),
        color: "Turquoise",
        brand: "a".repeat(500),
      }).success,
    ).toBe(true);
  });

  it("rejects non-string values for required and optional fields", () => {
    expect(
      reportDetailsSchema.safeParse({
        itemName: 123,
        category: "Wallet",
      }).success,
    ).toBe(false);
    expect(
      reportDetailsSchema.safeParse({
        ...validReportDetails,
        color: 123,
      }).success,
    ).toBe(false);
  });
});
