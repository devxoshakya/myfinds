"use client";

import { Button } from "@myfinds/ui/components/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { ReportNumber, StatusChip } from "@/components/reports/status-badge";
import { ClaimReview } from "@/components/reports/claim-review";
import {
  confirmReportHandover,
  confirmReportReceipt,
  decideReportClaim,
  getStaffClaims,
  getStaffQueue,
  ReportApiError,
  type StaffClaim,
  type StaffQueueReport,
} from "@/lib/report-api";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function isStaffRole(role: string | undefined) {
  return role === "STATION_STAFF" || role === "ADMIN";
}

function ConfirmReceiptButton({
  report,
  onConfirmed,
}: {
  report: StaffQueueReport;
  onConfirmed: (reportId: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await confirmReportReceipt(report.id);
      toast.success(`Receipt confirmed for ${report.number}. Matching is running now.`);
      onConfirmed(report.id);
    } catch (cause: unknown) {
      toast.error(
        cause instanceof ReportApiError ? cause.message : "Receipt confirmation failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button className="mt-4 h-10" onClick={() => void handleConfirm()} disabled={pending}>
      {pending ? "Confirming…" : "Confirm receipt"}
    </Button>
  );
}

export default function StaffClient() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [reports, setReports] = useState<StaffQueueReport[] | null>(null);
  const [claims, setClaims] = useState<StaffClaim[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setReports(null);
    setError(null);
    getStaffQueue()
      .then((result) => {
        if (active) setReports(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      });
    getStaffClaims()
      .then((result) => {
        if (active) setClaims(result);
      })
      .catch(() => {
        if (active) setClaims([]);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const reloadClaims = () => {
    getStaffClaims()
      .then(setClaims)
      .catch(() => setClaims([]));
  };

  async function handleDecide(claimId: string, decision: "APPROVED" | "REJECTED") {
    await decideReportClaim(claimId, decision);
    toast.success(decision === "APPROVED" ? "Claim approved. Handover code issued to the claimant." : "Claim rejected.");
    reloadClaims();
  }

  async function handleHandover(claimId: string, code: string) {
    await confirmReportHandover(claimId, code);
    toast.success("Handover confirmed. The item is marked returned.");
    reloadClaims();
  }

  // The API enforces authorization; this guard only shapes the UI.
  if (!sessionPending && !isStaffRole(session?.user?.role)) {
    return (
      <div role="alert" className="mt-8 border border-border bg-card p-6">
        <ShieldX className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm leading-6">
          {session
            ? "This console is only for station staff and admins."
            : "Sign in with a station staff account to view the queue."}
        </p>
        {session ? null : (
          <Button className="mt-4 h-11" render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
        )}
      </div>
    );
  }

  if (error !== null) {
    return (
      <div role="alert" className="mt-8 border border-border bg-card p-6">
        <p className="text-sm leading-6">
          {error instanceof ReportApiError && error.status === 401
            ? "Sign in to view the staff queue."
            : error instanceof Error
              ? error.message
              : "The staff queue is unavailable."}
        </p>
        <Button className="mt-4 h-11" variant="outline" onClick={() => setRetry((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (reports === null) {
    return <p role="status" className="mt-8 text-sm text-muted-foreground">Loading the queue…</p>;
  }

  const awaiting = reports.filter((report) => report.status === "SUBMITTED_TO_STOP");
  const received = reports.filter((report) => report.status === "RECEIVED_BY_STOP");
  const groups = [
    { title: "Awaiting receipt confirmation", reports: awaiting },
    { title: "Received at your stations", reports: received },
  ];

  return (
    <>
      {claims !== null && claims.length > 0 ? (
        <section aria-labelledby="staff-claims" className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2
              id="staff-claims"
              className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase"
            >
              Claims at your stations
            </h2>
            <span className="font-mono text-xs text-muted-foreground">{claims.length}</span>
          </div>
          <div className="mt-3 grid gap-3">
            {claims.map((claim) => (
              <ClaimReview
                key={claim.id}
                claim={claim}
                questions={claim.questions}
                photos={claim.report.photos}
                heading={`${claim.report.number} · ${claim.report.title}${claim.report.station ? ` · ${claim.report.station}` : ""}`}
                onDecide={handleDecide}
                onHandover={handleHandover}
              />
            ))}
          </div>
        </section>
      ) : null}

      {groups.map((group) =>
        group.reports.length > 0 ? (
          <section key={group.title} aria-labelledby={`staff-group-${group.title}`} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2
                id={`staff-group-${group.title}`}
                className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase"
              >
                {group.title}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {group.reports.length}
              </span>
            </div>

            <ul className="mt-3 grid gap-2">
              {group.reports.map((report) => (
                <li key={report.id}>
                  <article className="border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip status={report.status} />
                      <ReportNumber number={report.number} />
                    </div>

                    <h3 className="mt-3 text-base font-semibold">{report.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Handed in at {report.place.station}, {report.place.city} ·{" "}
                      {formatDate(report.eventDate)}
                    </p>

                    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">Category</dt>
                        <dd className="font-medium">{report.category}</dd>
                      </div>
                    </dl>

                    {report.status === "SUBMITTED_TO_STOP" ? (
                      <ConfirmReceiptButton
                        report={report}
                        onConfirmed={(reportId) =>
                          setReports((current) =>
                            current
                              ? current.map((entry) =>
                                  entry.id === reportId
                                    ? { ...entry, status: "RECEIVED_BY_STOP" as const }
                                    : entry,
                                )
                              : current,
                          )
                        }
                      />
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Receipt confirmed — item is ready for matching and claims.
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}

      {reports.length === 0 ? (
        <div className="mt-8 border border-border bg-card p-8 text-center">
          <h2 className="text-base font-semibold">Nothing at your stations</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            When someone hands a found item in at one of your stations, it shows up here for
            receipt confirmation.
          </p>
        </div>
      ) : null}
    </>
  );
}
