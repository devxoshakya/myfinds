"use client";

import { Button } from "@myfinds/ui/components/button";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ReportNumber, StatusChip, TypeChip } from "@/components/reports/status-badge";
import { getMyReports, ReportApiError, type MyReport } from "@/lib/report-api";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const openStatuses = new Set([
  "SUBMITTED",
  "SUBMITTED_TO_STOP",
  "RECEIVED_BY_STOP",
  "MATCHING",
  "MATCH_FOUND",
  "CLAIMED",
  "VERIFIED",
]);

function formatDate(value: string) {
  return dateFormatter.format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}

export default function MyReportsClient() {
  const [reports, setReports] = useState<MyReport[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setReports(null);
    setError(null);
    getMyReports()
      .then((result) => {
        if (active) setReports(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const isUnauthenticated = error instanceof ReportApiError && error.status === 401;

  if (error !== null) {
    return (
      <div role={isUnauthenticated ? "status" : "alert"} className="mt-8 border border-border bg-card p-6">
        <p className="text-sm leading-6">
          {isUnauthenticated
            ? "Sign in to view your reports."
            : error instanceof Error
              ? error.message
              : "Your reports are unavailable."}
        </p>
        {isUnauthenticated ? (
          <Button className="mt-4 h-11" render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
        ) : (
          <Button className="mt-4 h-11" variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (reports === null) {
    return <p role="status" className="mt-8 text-sm text-muted-foreground">Loading your reports…</p>;
  }

  const open = reports.filter((report) => openStatuses.has(report.status));
  const closed = reports.filter((report) => !openStatuses.has(report.status));
  const groups = [
    { title: "Open", reports: open },
    { title: "Closed", reports: closed },
  ];

  return (
    <>
      {groups.map((group) =>
        group.reports.length > 0 ? (
          <section key={group.title} aria-labelledby={`group-${group.title}`} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2
                id={`group-${group.title}`}
                className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase"
              >
                {group.title}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">{group.reports.length}</span>
            </div>

            <ul className="mt-3 grid gap-2">
              {group.reports.map((report) => (
                <li key={report.id}>
                  <article className="border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeChip type={report.type} />
                      <StatusChip status={report.status} />
                      <ReportNumber number={report.number} />
                    </div>

                    <h3 className="mt-3 text-base font-semibold">{report.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.type === "LOST" ? "Lost near" : "Found at"} {report.place.station},{" "}
                      {report.place.city} · {formatDate(report.eventDate)}
                    </p>

                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Category</dt>
                        <dd className="font-medium">{report.category}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Active until</dt>
                        <dd className="font-medium">{formatDate(report.expiresAt)}</dd>
                      </div>
                    </dl>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}

      {reports.length === 0 ? (
        <div className="mt-8 border border-border bg-card p-8 text-center">
          <Search className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold">No reports yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Report a lost or found item and we start looking for matches right away.
          </p>
          <Button className="mt-5 h-11" render={<Link href="/report/lost" />} nativeButton={false}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Report a lost item
          </Button>
        </div>
      ) : null}
      {reports.length > 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Report details and matching actions are not connected yet.
        </p>
      ) : null}
    </>
  );
}
