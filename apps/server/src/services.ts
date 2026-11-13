import { createAuth } from "@myfinds/auth";
import { createPrismaClient } from "@myfinds/db";

// Env comes straight from platform environment variables (no varlock; the
// schema check is gone — missing vars surface as clear runtime errors).
export const db = createPrismaClient({
  DATABASE_URL: process.env.DATABASE_URL!,
});
export const auth = createAuth(
  {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN!,
  },
  db,
);
