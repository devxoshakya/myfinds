import { Button } from "@myfinds/ui/components/button";
import { ArrowRight, Info, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  ReportNumber,
  StatusChip,
  TypeChip,
} from "@/components/reports/status-badge";
import {
  formatDate,
  getBestMatchScore,
  previewReports,
} from "@/lib/preview-data";
import { reportPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "My reports",
};

const openStatuses = new Set([
  "SUBMITTED",
  "SUBMITTED_TO_STOP",
  "RECEIVED_BY_STOP",
  "MATCHING",
  "MATCH_FOUND",
  "CLAIMED",
  "VERIFIED",
]);

export default function ReportsPage() {
  const open = previewReports.filter((report) => openStatuses.has(report.status));
  const closed = previewReports.filter((report) => !openStatuses.has(report.status));
  const groups = [
    { title: "Open", reports: open },
    { title: "Closed", reports: closed },
  ];

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
            My reports
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Every item you reported, and where it stands.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-11" render={<Link href="/report/lost" />} nativeButton={false}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Report a lost item
          </Button>
          <Button
            variant="outline"
            className="h-11 border-foreground"
            render={<Link href="/report/found" />}
            nativeButton={false}
          >
            Report a found item
          </Button>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Sample data. The reports service is not connected in this build.
      </p>

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
              <span className="font-mono text-xs text-muted-foreground">
                {group.reports.length}
              </span>
            </div>

            <ul className="mt-3 grid gap-2">
              {group.reports.map((report) => {
                const best = getBestMatchScore(report);
                return (
                  <li key={report.id}>
                    <Link
                      href={reportPath(report.id)}
                      className="block border border-border bg-card p-4 hover:border-foreground sm:p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeChip type={report.type} />
                        <StatusChip status={report.status} />
                        <ReportNumber number={report.number} />
                        <ArrowRight
                          className="ml-auto size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
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
                        {best !== null ? (
                          <div className="flex gap-1.5">
                            <dt className="text-muted-foreground">Best match</dt>
                            <dd className="font-mono font-semibold tabular-nums">
                              {Math.round(best * 100)}%
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null,
      )}

      {previewReports.length === 0 ? (
        <div className="mt-8 border border-border bg-card p-8 text-center">
          <Search className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold">No reports yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Report a lost or found item and we start looking for matches right away.
          </p>
          <Button className="mt-5 h-11" render={<Link href="/report/lost" />} nativeButton={false}>
            Report a lost item
          </Button>
        </div>
      ) : null}
    </div>
  );
}
