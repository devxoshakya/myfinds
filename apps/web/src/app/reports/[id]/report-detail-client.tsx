"use client";

import { Button } from "@myfinds/ui/components/button";
import { ArrowRight, Info, LoaderCircle, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { ReportNumber, StatusChip, TypeChip } from "@/components/reports/status-badge";
import {
  getReport,
  ReportApiError,
  type ReportDetail,
} from "@/lib/report-api";
import { matchesPath } from "@/lib/routes";
import { getStatusHistoryLabel } from "@/lib/status-history";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function statusMessage(status: ReportDetail["status"]) {
  return {
    SUBMITTED: {
      title: "Report received",
      message: "We saved your report and will search eligible found reports.",
    },
    SUBMITTED_TO_STOP: {
      title: "Waiting for station receipt",
      message: "Matching starts after the station confirms the item is in its care.",
    },
    RECEIVED_BY_STOP: {
      title: "Station receipt confirmed",
      message: "The item is available for matching now.",
    },
    MATCHING: {
      title: "We are checking for a possible match",
      message: "No suitable report has been found yet. We will keep checking until this report expires.",
    },
    MATCH_FOUND: {
      title: "Possible match found",
      message: "Similar details were found. Review them before deciding whether to claim the item.",
    },
    CLAIMED: {
      title: "Claim submitted",
      message: "The custodian is reviewing your private answers.",
    },
    VERIFIED: {
      title: "Ownership confirmed",
      message: "Follow the handover instructions provided by the custodian.",
    },
    RETURNED: {
      title: "Item returned",
      message: "The handover was completed.",
    },
    EXPIRED: {
      title: "Report expired",
      message: "This report is closed. Create a new report if you still need help.",
    },
    WITHDRAWN: {
      title: "Report withdrawn",
      message: "This report is closed and is no longer being matched.",
    },
  }[status];
}

export default function ReportDetailClient({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getReport(id).then(setReport).catch(setError).finally(() => setLoaded(true));
  }, [id]);

  if (error) {
    const unauthenticated = error instanceof ReportApiError && error.status === 401;
    return (
      <StatePanel
        title={unauthenticated ? "Sign in to view this report" : "Report unavailable"}
        message={error instanceof Error ? error.message : "Try again later."}
        action={unauthenticated ? <Link href="/login">Sign in</Link> : undefined}
      />
    );
  }

  if (!loaded) {
    return (
      <StatePanel
        title="Loading report"
        message="Fetching the latest status and history."
        loading
      />
    );
  }
  if (!report) {
    return <StatePanel title="Report not found" message="This report may have been removed or the link is incorrect." />;
  }
  const copy = statusMessage(report.status);

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/reports" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        My Reports
      </Link>
      <article className="mt-4 border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TypeChip type={report.type} />
          <StatusChip status={report.status} />
          <ReportNumber number={report.number} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{report.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          {report.type === "LOST" ? "Lost near" : "Found at"} {report.place.station},{" "}
          {report.place.city}
        </p>
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Category</dt><dd className="mt-1 text-sm font-medium">{report.category}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Event date</dt><dd className="mt-1 text-sm font-medium">{formatDate(report.eventDate)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Active until</dt><dd className="mt-1 text-sm font-medium">{formatDate(report.expiresAt)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Possible matches</dt><dd className="mt-1 text-sm font-medium">{report.status === "MATCH_FOUND" ? "Available" : "None yet"}</dd></div>
        </dl>
      </article>

      {report.status === "MATCH_FOUND" ? (
        <div className="mt-4 flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Possible match found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review the candidate before deciding whether to claim it.</p>
          </div>
          <Button className="h-11" render={<Link href={matchesPath(report.id)} />} nativeButton={false}>
            Review match <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div role="status" className="mt-4 flex items-start gap-3 border border-border bg-card p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.message}</p>
          </div>
        </div>
      )}

      <section className="mt-4 border border-border bg-card p-4 sm:p-6" aria-labelledby="history-title">
        <h2 id="history-title" className="font-semibold">Report history</h2>
        <ol className="mt-4 grid gap-3">
          {report.history.map((entry) => (
            <li key={`${entry.action}-${entry.date}`} className="border-t border-border pt-3">
              <p className="text-sm font-medium">{getStatusHistoryLabel(entry.action)}</p>
              <time className="mt-1 block text-xs text-muted-foreground" dateTime={entry.date}>
                {new Date(entry.date).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function StatePanel({
  title,
  message,
  action,
  loading = false,
}: {
  title: string;
  message: string;
  action?: ReactElement;
  loading?: boolean;
}) {
  return (
    <div role={loading ? "status" : "alert"} className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      {loading ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {action ? <Button className="mt-5 h-11" render={action} nativeButton={false} /> : null}
    </div>
  );
}
