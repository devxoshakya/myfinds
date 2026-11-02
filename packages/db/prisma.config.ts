import path from "node:path";

import { defineConfig, env } from "prisma/config";
import "varlock/auto-load";

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  // CLI (db push / migrate) uses the DIRECT (non-pooled) connection.
  // The runtime client uses DATABASE_URL (pooled) via the pg driver adapter
  // in src/index.ts — see docs/ARCHITECTURE.md §4.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
