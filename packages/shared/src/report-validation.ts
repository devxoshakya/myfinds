import { z } from "zod";

export const reportDetailsSchema = z.object({
  itemName: z.string().trim().min(1, "Enter an item name."),
  category: z.string().trim().min(1, "Choose a category."),
  description: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
});
