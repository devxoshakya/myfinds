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

// Logging `error.name` alone hides Prisma codes (P2021/P2022/…) that are the
// only way to diagnose prod DB issues from the logs. Meta carries no secrets.
export function describeError(error: unknown) {
  if (!(error instanceof Error)) return { errorName: "unknown" };
  const extra = error as Error & { code?: string; meta?: unknown };
  return {
    errorName: error.name,
    errorCode: extra.code,
    errorMessage: error.message.split("\n")[0],
    errorStack: error.stack?.split("\n").slice(1, 6),
    errorMeta: extra.meta,
  };
}
