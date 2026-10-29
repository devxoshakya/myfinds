import { createAuth } from "@myfinds/auth";
import { createPrismaClient } from "@myfinds/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
