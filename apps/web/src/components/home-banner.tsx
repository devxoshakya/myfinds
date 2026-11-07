"use client";

import { Button } from "@myfinds/ui/components/button";
import { Bell, X } from "lucide-react";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { getMyReports, type MyReport } from "@/lib/report-api";
import { matchesPath, reportPath } from "@/lib/routes";
import { useState } from "react";
import { useEffect } from "react";

export default function HomeBanner() {
  const { data: session, isPending } = authClient.useSession();
  const [dismissed, setDismissed] = useState(false);
  const [reports, setReports] = useState<MyReport[]>([]);

  useEffect(() => {
    if (!session) return;
    getMyReports()
      .then(setReports)
      .catch((error: unknown) => {
        console.error("Home activity request failed", {
          errorName: error instanceof Error ? error.name : "unknown",
        });
        setReports([]);
      });
  }, [session]);

  if (isPending || !session || dismissed) return null;

  const openReports = reports.filter(
    (report) => !["RETURNED", "EXPIRED", "WITHDRAWN"].includes(report.status),
  );
  const reportWithMatch = openReports.find(
    (report) => report.status === "MATCH_FOUND" || report.status === "CLAIMED",
  );
  const count = openReports.length;

  if (count === 0 && !reportWithMatch) return null;

  return (
    <section aria-label="Your activity" className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-[60rem] items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <Bell className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-5">
          {reportWithMatch
            ? `Possible match for “${reportWithMatch.title}” at ${reportWithMatch.place.station}.`
            : `You have ${count} open ${count === 1 ? "report" : "reports"}.`}
        </p>
        <Button
          size="sm"
          className="h-9 shrink-0 px-3 text-sm"
          render={
            <Link
              href={
                reportWithMatch ? matchesPath(reportWithMatch.id) : reportPath(openReports[0].id)
              }
            />
          }
          nativeButton={false}
        >
          {reportWithMatch ? "Review match" : "View My Reports"}
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
