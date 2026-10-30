import { cn } from "@myfinds/ui/lib/utils";
import { Check } from "lucide-react";

import type { PreviewReport, ReportStatus } from "@/lib/preview-data";

type Step = {
  key: string;
  title: string;
  description: string;
  statuses: ReportStatus[];
};

const baseSteps: Step[] = [
  {
    key: "SUBMITTED",
    title: "Submitted",
    description: "Your report is in.",
    statuses: ["SUBMITTED"],
  },
  {
    key: "MATCHING",
    title: "Matching",
    description: "We search every day.",
    statuses: ["MATCHING"],
  },
  {
    key: "MATCH_FOUND",
    title: "Match found",
    description: "A possible match appeared.",
    statuses: ["MATCH_FOUND"],
  },
  {
    key: "CLAIMED",
    title: "Claimed",
    description: "Ownership answers sent.",
    statuses: ["CLAIMED"],
  },
  {
    key: "VERIFIED",
    title: "Verified",
    description: "Approved, code issued.",
    statuses: ["VERIFIED"],
  },
  {
    key: "RETURNED",
    title: "Returned",
    description: "Handover complete.",
    statuses: ["RETURNED"],
  },
];

const stationSteps: Step[] = [
  {
    key: "SUBMITTED_TO_STOP",
    title: "Submitted to stop",
    description: "The item is on its way.",
    statuses: ["SUBMITTED_TO_STOP"],
  },
  {
    key: "RECEIVED_BY_STOP",
    title: "Received by stop",
    description: "Staff confirmed receipt.",
    statuses: ["RECEIVED_BY_STOP"],
  },
];

const currentIndexByStatus: Record<ReportStatus, number> = {
  SUBMITTED: 0,
  SUBMITTED_TO_STOP: 0,
  RECEIVED_BY_STOP: 1,
  MATCHING: 1,
  MATCH_FOUND: 2,
  CLAIMED: 3,
  VERIFIED: 4,
  RETURNED: 5,
  EXPIRED: 0,
  WITHDRAWN: 0,
};

export function StatusTimeline({ report }: { report: PreviewReport }) {
  const isStationHeld = report.custodian === "STATION" && Boolean(report.custodyStation);
  const steps = isStationHeld ? [...stationSteps, ...baseSteps] : baseSteps;

  const closed = report.status === "RETURNED";
  const offset = isStationHeld ? 2 : 0;
  const stationIndex =
    report.status === "SUBMITTED_TO_STOP"
      ? 0
      : report.status === "RECEIVED_BY_STOP"
        ? 1
        : currentIndexByStatus[report.status] + offset;
  const currentIndex = Math.min(
    isStationHeld ? stationIndex : currentIndexByStatus[report.status],
    steps.length - 1,
  );

  return (
    <section aria-labelledby="timeline-title" className="border border-border bg-card p-4 sm:p-6">
      <h2 id="timeline-title" className="text-base font-semibold">
        Progress
      </h2>

      <ol className="mt-5 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        {steps.map((step, index) => {
          const complete = closed || index < currentIndex;
          const current = !closed && index === currentIndex;

          return (
            <li
              key={step.key}
              aria-current={current ? "step" : undefined}
              className={cn(
                "relative border p-3",
                current
                  ? "border-2 border-foreground bg-card"
                  : complete
                    ? "border-border bg-card"
                    : "border-border bg-surface-muted",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[0.625rem] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {complete ? (
                  <Check className="size-3.5 text-success" aria-label="Completed" />
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-2 text-sm font-semibold",
                  !complete && !current && "text-muted-foreground",
                )}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{step.description}</p>
              {current ? (
                <span className="mt-2 inline-flex bg-primary px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-[0.04em] text-primary-foreground uppercase">
                  Current
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">Other outcomes</span>
        {(["EXPIRED", "WITHDRAWN"] as const).map((outcome) => {
          const occurred = report.status === outcome;
          return (
            <span
              key={outcome}
              className={cn(
                "border px-2 py-1 font-mono text-[0.625rem] tracking-[0.04em] uppercase",
                occurred
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {outcome === "EXPIRED" ? "Expired" : "Withdrawn"}
            </span>
          );
        })}
        <span
          className={cn(
            "border px-2 py-1 font-mono text-[0.625rem] tracking-[0.04em] uppercase",
            report.history.some((entry) => entry.action.toLowerCase().includes("rejected"))
              ? "border-foreground text-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          Claim rejected
        </span>
      </div>
    </section>
  );
}
