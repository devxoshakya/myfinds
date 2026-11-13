import type { Auth } from "@myfinds/auth";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// Type-only import: inferAdditionalFields pulls the server's `role` field
// (declared in @myfinds/auth) into the client's session type.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL!,
  plugins: [inferAdditionalFields<Auth>()],
});
