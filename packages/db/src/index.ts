import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

// DB is Supabase Postgres. Runtime traffic goes through the pooled
// (transaction-mode) connection URL; migrations/db push use DIRECT_URL in
// prisma.config.ts. See docs/ARCHITECTURE.md §4 and docs/model.md.
export function createPrismaClient(env: DatabaseConfig) {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    max: 10,
    idleTimeoutMillis: 30_000,
    // Supabase poolers present a self-signed certificate chain that the pg
    // driver distrusts by default. For launch this accepts it; when we lock
    // down production, download the Supabase root CA
    // (https://supabase.com/pki/prod-ca-2021.crt) and pass `ssl: { ca }`.
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;
