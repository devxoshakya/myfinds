"use client";

import { ArrowRight, Bell, X } from "lucide-react";
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
    <section aria-label="Your activity" className="mf-banner">
      <div className="mf-shell mf-banner__inner">
        <span className="mf-banner__tag">
          <Bell size={10} strokeWidth={2} aria-hidden="true" />
          Update
        </span>
        <p className="mf-banner__text">
          {reportWithMatch
            ? `Possible match for “${reportWithMatch.title}” at ${reportWithMatch.place.station}.`
            : `You have ${count} open ${count === 1 ? "report" : "reports"}.`}
        </p>
        <div className="mf-banner__actions">
          <Link
            href={reportWithMatch ? matchesPath(reportWithMatch.id) : reportPath(openReports[0].id)}
            className="mf-banner__action"
          >
            {reportWithMatch ? "Review match" : "View reports"}
            <ArrowRight size={11} strokeWidth={2} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="mf-banner__dismiss"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
