import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";

import { ReportNumber, StatusChip } from "@/components/reports/status-badge";
import { StatusTimeline } from "@/components/reports/status-timeline";
import { getPrivateReportStatus } from "@/lib/report-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private report status",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PrivateReportStatusPage({ params }: PageProps) {
  const { token } = await params;
  const report = await getPrivateReportStatus(token);

  if (!report) notFound();

  const relevantDate = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${report.eventDate}T00:00:00.000Z`));

  return (
    <article className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8 sm:px-6 sm:py-12">
      <header className="grid gap-3 border border-border bg-card p-5 sm:p-7">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Private report status
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Your report</h1>
          <StatusChip status={report.status} />
        </div>
        <ReportNumber number={report.reportNumber} />
        <dl className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Category</dt>
            <dd className="mt-1 text-sm font-medium">
              {report.category
                .toLowerCase()
                .split("_")
                .map((word) => word[0]?.toUpperCase() + word.slice(1))
                .join(" ")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Relevant date</dt>
            <dd className="mt-1 text-sm font-medium">{relevantDate}</dd>
          </div>
        </dl>
      </header>

      <StatusTimeline report={report} />
      <p className="border border-border bg-surface-muted p-3 text-xs leading-5 text-muted-foreground">
        Anyone with this private link can view limited status information. Do not post it publicly
        or share it in a public message.
      </p>
    </article>
  );
}
