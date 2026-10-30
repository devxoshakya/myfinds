import { ChevronRight, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchReview } from "@/components/reports/match-review";
import { formatDate, getMatches, getReport } from "@/lib/preview-data";
import { reportPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Possible matches",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MatchesPage({ params }: PageProps) {
  const { id } = await params;
  const report = getReport(id);
  if (!report || report.type !== "LOST") notFound();

  const matches = getMatches(report.id);

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 pt-6 pb-24 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/reports" className="text-muted-foreground underline-offset-4 hover:underline">
          My Reports
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <Link
          href={reportPath(report.id)}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          {report.title}
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-current="page" className="font-medium">
          Possible matches
        </span>
      </nav>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
            {matches.length > 0
              ? `We found ${matches.length} possible ${matches.length === 1 ? "match" : "matches"}`
              : "No matches yet"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Review the found item against your lost report. If you recognize it, start a claim.
          </p>
        </div>

        <div className="shrink-0 border border-border bg-card p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Your report:</span> {report.title}
          </p>
          <p className="mt-1 text-muted-foreground">
            Lost at {report.place.station} on {formatDate(report.eventDate)}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Sample data. Claims are not sent to a server in this build.
      </p>

      <MatchReview report={report} matches={matches} />
    </div>
  );
}
