"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { authGateRedirect } from "@/lib/auth-gate";

export default function AuthGate() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    const target = authGateRedirect(pathname, session?.user ?? null);
    if (target) router.replace(target as Route);
  }, [isPending, session, pathname, router]);

  return null;
}
