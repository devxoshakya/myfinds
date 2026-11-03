import { Button } from "@myfinds/ui/components/button";
import { cn } from "@myfinds/ui/lib/utils";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { HandoverCode } from "@/components/reports/handover-code";
import {
  OutlineChip,
  ReportNumber,
  StatusChip,
  TypeChip,
} from "@/components/reports/status-badge";
import { StatusTimeline } from "@/components/reports/status-timeline";
import {
  formatDate,
  formatDateTime,
  getBestMatchScore,
  getMatches,
  getReport,
  type PreviewReport,
} from "@/lib/preview-data";
import { matchesPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Report status",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function Banner({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "success" | "warning";
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "success" ? Check : tone === "warning" ? Clock : Info;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border p-4 sm:flex-row sm:items-start sm:justify-between",
        tone === "success" && "border-success/40 bg-success-bg text-success",
        tone === "warning" && "border-warning/40 bg-warning-bg text-warning",
        tone === "info" && "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <div className="mt-1 text-sm leading-5">{children}</div>
        </div>
      </div>
      {action ? <div className="shrink-0 sm:pl-4">{action}</div> : null}
    </div>
  );
}

function NextAction({ report }: { report: PreviewReport }) {
  const matches = getMatches(report.id);

  if (report.status === "VERIFIED" && report.handover) {
    return (
      <section
        aria-labelledby="handover-title"
        className="grid gap-5 border-2 border-foreground bg-card p-4 sm:p-6 lg:grid-cols-[1fr_0.9fr]"
      >
        <div>
          <h2 id="handover-title" className="text-xl font-semibold tracking-tight">
            Claim verified
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Show this code to the person holding your item.
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Held at</dt>
              <dd className="text-right font-medium">
                {report.custodyStation?.station ?? "The finder"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Counter hours</dt>
              <dd className="text-right font-medium">
                {report.custodyStation?.counterHours ?? "Agree with the finder"}
              </dd>
            </div>
          </dl>
        </div>
        <HandoverCode
          code={report.handover.code}
          expiresAt={report.handover.expiresAt}
          stationName={report.custodyStation?.station}
          counterHours={report.custodyStation?.counterHours}
        />
      </section>
    );
  }

  if (report.status === "MATCH_FOUND") {
    return (
      <Banner
        title={`${matches.length} possible ${matches.length === 1 ? "match" : "matches"}.`}
        action={
          <Button
            className="h-11 w-full sm:w-auto"
            render={<Link href={matchesPath(report.id)} />}
            nativeButton={false}
          >
            Review matches
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        }
      >
        Compare the found item with your report and start a claim if it looks right.
      </Banner>
    );
  }

  if (report.status === "MATCHING") {
    return (
      <Banner title="We're looking for matches." action={<OutlineChip>Checking daily</OutlineChip>}>
        Nothing has matched yet. We keep searching until {formatDate(report.expiresAt)}.
      </Banner>
    );
  }

  if (report.status === "CLAIMED") {
    return report.type === "LOST" ? (
      <Banner title="Your claim is with the custodian." tone="warning">
        You'll get an email when it's approved or rejected. After 3 rejected attempts the match
        locks.
      </Banner>
    ) : (
      <Banner
        title="Someone claimed this item."
        tone="warning"
        action={
          <Button
            variant="outline"
            className="h-11 w-full border-foreground sm:w-auto"
            render={<a href="#claims" />}
            nativeButton={false}
          >
            Review claim
          </Button>
        }
      >
        Compare their answers with your verification question before you decide.
      </Banner>
    );
  }

  if (report.status === "SUBMITTED_TO_STOP") {
    return (
      <Banner title="Waiting for the station to confirm receipt." tone="warning">
        {report.custodyStation?.station ?? "The station"} will confirm they have the item. Items
        are not matchable until then.
      </Banner>
    );
  }

  if (report.status === "RECEIVED_BY_STOP") {
    return (
      <Banner title="The station has the item." tone="success">
        Matching is running again now that the item is available.
      </Banner>
    );
  }

  if (report.status === "RETURNED") {
    return (
      <Banner title="All done. This item has been returned." tone="success">
        Both reports are closed. Photos are removed 30 days after close.
      </Banner>
    );
  }

  if (report.status === "EXPIRED" || report.status === "WITHDRAWN") {
    return (
      <Banner title="This report is closed." tone="warning">
        {report.status === "EXPIRED"
          ? `Expired on ${formatDate(report.expiresAt)}.`
          : "You withdrew this report."}{" "}
        Create a new report if you still need help.
      </Banner>
    );
  }

  return (
    <Banner title="Matching is running." action={<OutlineChip>Just submitted</OutlineChip>}>
      We search as soon as a report is created and once a day after that.
    </Banner>
  );
}

export default async function ReportStatusPage({ params }: PageProps) {
  const { id } = await params;
  const report = getReport(id);
  if (!report) notFound();

  const best = getBestMatchScore(report);
  const isStationHeld = report.custodian === "STATION" && Boolean(report.custodyStation);
  const heldBy = isStationHeld
    ? (report.custodyStation?.station ?? "Station")
    : report.type === "FOUND"
      ? "You"
      : "The finder";

  const history = [...report.history].reverse();

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link href="/reports" className="text-muted-foreground underline-offset-4 hover:underline">
          My Reports
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span aria-current="page" className="font-medium">
          {report.title}
        </span>
      </nav>

      <article className="mt-4 border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 border border-border bg-surface-muted text-muted-foreground sm:h-[120px] sm:w-[120px]">
            <Camera className="size-5" aria-hidden="true" />
            <span className="text-[0.625rem]">
              {report.photoCount > 0 ? `${report.photoCount} photos` : "No photo"}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <TypeChip type={report.type} />
              <StatusChip status={report.status} />
              <ReportNumber number={report.number} />
            </div>

            <h1 className="mt-3 text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
              {report.title}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {report.type === "LOST" ? "Lost near" : "Found at"} {report.place.station},{" "}
              {report.place.city}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
              {[
                { label: "Reported on", value: formatDate(report.createdAt) },
                { label: "Active until", value: formatDate(report.expiresAt) },
                { label: "Held by", value: heldBy },
                {
                  label: "Best match",
                  value: best === null ? "None yet" : `${Math.round(best * 100)}%`,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <Button
              variant="outline"
              className="h-11 border-foreground"
              render={<Link href={report.type === "LOST" ? "/report/lost" : "/report/found"} />}
              nativeButton={false}
            >
              Edit report
            </Button>
          </div>
        </div>
      </article>

      <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Sample report. Actions such as withdrawing or approving claims need the reports service.
      </p>

      <div className="mt-4 grid gap-4">
        <NextAction report={report} />
        <StatusTimeline report={report} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid gap-4">
          <details open className="group border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-base font-semibold">
              Item details
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <dl className="grid gap-3 px-4 pb-4 text-sm">
              {[
                { label: "Category", value: report.category },
                { label: "Color", value: report.color || "Not given" },
                { label: "Brand", value: report.brand || "Not given" },
                {
                  label: report.type === "LOST" ? "Lost at" : "Found at",
                  value: `${report.place.station}, ${report.place.city}`,
                },
                { label: "Place note", value: report.place.note || "None" },
                { label: "Date", value: formatDate(report.eventDate) },
                ...(report.eventTime ? [{ label: "Approximate time", value: report.eventTime }] : []),
                { label: "Description", value: report.description || "No description" },
                {
                  label: "Photos",
                  value:
                    report.photoCount > 0
                      ? `${report.photoCount} attached, visible only to allowed roles`
                      : "None",
                },
              ].map((row) => (
                <div key={row.label} className="grid gap-0.5 border-t border-border pt-2 first:border-t-0 first:pt-0">
                  <dt className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                    {row.label}
                  </dt>
                  <dd className="leading-5">{row.value}</dd>
                </div>
              ))}
            </dl>
          </details>

          {isStationHeld ? (
            <details open className="group border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-base font-semibold">
                Chain of custody
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="grid gap-3 px-4 pb-4 text-sm">
                <div className="border border-border bg-surface-muted p-3">
                  <p className="text-muted-foreground">Current location</p>
                  <p className="mt-0.5 font-medium">{report.custodyStation?.station}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                      Storage compartment
                    </p>
                    <p className="mt-1 font-mono text-sm">{report.storageRef ?? "Not recorded"}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                      Intake
                    </p>
                    <p className="mt-1">Received by station staff</p>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Every custody transfer is time-stamped and logged.
                </p>
              </div>
            </details>
          ) : null}

          <section aria-labelledby="activity-title" className="border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 id="activity-title" className="text-base font-semibold">
                Activity log
              </h2>
            </div>
            <ol className="grid gap-0 p-4 text-sm">
              {history.map((entry, index) => (
                <li
                  key={`${entry.at}-${index}`}
                  className="grid gap-1 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{entry.at}</span>
                    <OutlineChip>{entry.role}</OutlineChip>
                  </div>
                  <p>
                    {entry.action} <span className="text-muted-foreground">· {entry.actor}</span>
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid gap-4">
          {report.claims && report.claims.length > 0 ? (
            <section id="claims" aria-labelledby="claims-title" className="border border-border bg-card">
              <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
                <h2 id="claims-title" className="text-sm font-semibold">
                  Custodian panel
                </h2>
                <span className="font-mono text-[0.625rem] tracking-[0.04em] uppercase">
                  Finder
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-surface-muted">
                      {["Claimant", "Attempts", "Submitted", "Answer", "Similarity"].map((heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-3 py-2 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-muted-foreground uppercase"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.claims.map((claim) => (
                      <tr key={claim.id} className="border-t border-border align-top">
                        <td className="px-3 py-3 font-medium">{claim.claimant}</td>
                        <td className="px-3 py-3 font-mono text-xs">{claim.attempts}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDateTime(claim.submittedAt)}
                        </td>
                        <td className="px-3 py-3">{claim.answer}</td>
                        <td className="px-3 py-3 font-mono text-xs tabular-nums">
                          {claim.similarity}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-border p-4">
                <p className="flex items-start gap-2 text-sm leading-5 text-muted-foreground">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Approve or reject decisions, and the handover code box, unlock when the claims
                  service is connected.
                </p>
              </div>
            </section>
          ) : (
            <section aria-labelledby="help-title" className="border border-border bg-card p-5">
              <h2 id="help-title" className="text-base font-semibold">
                What happens next
              </h2>
              <ul className="mt-3 grid gap-3 text-sm leading-5 text-muted-foreground">
                <li className="flex gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  We re-run matching once a day until the report expires.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Ownership is checked before any contact detail is shared.
                </li>
                <li className="flex gap-2">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  One-time handover codes expire 48 hours after they are issued.
                </li>
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
