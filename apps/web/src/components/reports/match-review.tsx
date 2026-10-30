"use client";

import { Button } from "@myfinds/ui/components/button";
import { cn } from "@myfinds/ui/lib/utils";
import { Check, LockKeyhole, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  formatDate,
  type PreviewMatch,
  type PreviewReport,
} from "@/lib/preview-data";

import { ClaimDialog } from "./claim-dialog";

const same = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

function MarkChip({ matched }: { matched: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[0.5625rem] tracking-[0.04em] uppercase",
        matched ? "border-foreground text-foreground" : "border-border text-muted-foreground",
      )}
    >
      {matched ? (
        <Check className="size-3" aria-hidden="true" />
      ) : (
        <Minus className="size-3" aria-hidden="true" />
      )}
      {matched ? "Match" : "Similar"}
    </span>
  );
}

function daysBetween(older: string, newer: string) {
  const start = new Date(`${older.slice(0, 10)}T00:00:00`);
  const end = new Date(`${newer.slice(0, 10)}T00:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function matchSummary(match: PreviewMatch, lostDate: string) {
  const place =
    match.breakdown.place === 1
      ? "Same station"
      : match.breakdown.place >= 0.5
        ? "Same place type in your city"
        : "Same city";
  const text =
    match.breakdown.text >= 0.75 ? "similar name and description" : "similar name";
  const days = daysBetween(lostDate, match.found.eventDate);
  const when = days === 0 ? "found the same day" : `found ${days} ${days === 1 ? "day" : "days"} later`;

  return `${place}, ${text}, ${when}.`;
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full bg-surface-muted"
      >
        <div className="h-full bg-foreground" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MatchReview({ report, matches }: { report: PreviewReport; matches: PreviewMatch[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(matches[0]?.id);
  const [claimOpen, setClaimOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"lost" | "found">("lost");

  const visible = matches.filter((match) => !dismissed.includes(match.id));

  if (visible.length === 0) {
    return (
      <div className="border border-border bg-card p-8 text-center">
        <h2 className="text-base font-semibold">No matches yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          We keep looking every day until {formatDate(report.expiresAt)}. Add a photo or more
          detail to improve your chances.
        </p>
        <Button
          className="mt-5 h-11"
          render={<Link href="/report/lost" />}
          nativeButton={false}
        >
          Edit my report
        </Button>
      </div>
    );
  }

  const active = visible.find((match) => match.id === activeId) ?? visible[0];
  const found = active.found;

  const rows = [
    {
      label: "Item name",
      lost: report.title,
      found: found.title,
      matched: same(report.title, found.title) || active.breakdown.text >= 0.8,
    },
    {
      label: "Category",
      lost: report.category,
      found: found.category,
      matched: same(report.category, found.category),
    },
    {
      label: "Brand and color",
      lost: [report.brand, report.color].filter(Boolean).join(" · "),
      found: [found.brand, found.color].filter(Boolean).join(" · "),
      matched: same(report.brand, found.brand),
    },
    {
      label: "Description",
      lost: report.description,
      found: found.description,
      matched: active.breakdown.text >= 0.85,
    },
    {
      label: "Place",
      lost: `${report.place.state} › ${report.place.city} › ${report.place.placeType} › ${report.place.station}${report.place.note ? ` (${report.place.note})` : ""}`,
      found: `${found.place.state} › ${found.place.city} › ${found.place.placeType} › ${found.place.station}${found.place.note ? ` (${found.place.note})` : ""}`,
      matched: same(report.place.station, found.place.station),
    },
    {
      label: "Date",
      lost: formatDate(report.eventDate),
      found: formatDate(found.eventDate),
      matched: same(report.eventDate, found.eventDate),
    },
  ];

  return (
    <>
      <div
        role="tablist"
        aria-label="Possible matches"
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
      >
        {visible.map((match, index) => (
          <button
            key={match.id}
            role="tab"
            aria-selected={match.id === active.id}
            aria-controls="match-panel"
            onClick={() => setActiveId(match.id)}
            className={cn(
              "shrink-0 border px-3 py-2 text-sm",
              match.id === active.id
                ? "border-2 border-foreground bg-card font-medium"
                : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block text-left">Match {index + 1}: {match.found.place.station}</span>
            <span className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums">{Math.round(match.score * 100)}%</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(match.found.eventDate)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div id="match-panel" role="tabpanel" aria-label={`Match ${active.id}`} className="mt-4 grid gap-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <div
            className={cn(
              "border border-border bg-surface-muted p-4 sm:p-5",
              mobileView === "lost" ? "block" : "hidden lg:block",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Your lost report</h2>
              <span className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                {report.number}
              </span>
            </div>
            <div className="mt-4 flex h-32 items-center justify-center border border-border bg-card">
              <span className="text-xs text-muted-foreground">
                {report.photoCount > 0 ? `${report.photoCount} photos on file` : "No photo"}
              </span>
            </div>
            <dl className="mt-2">
              {rows.map((row) => (
                <div key={row.label} className="border-t border-border py-3 first:border-t-0">
                  <dt className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-5">{row.lost}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            className={cn(
              "border-2 border-foreground bg-card p-4 sm:p-5",
              mobileView === "found" ? "block" : "hidden lg:block",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Found item</h2>
              <span className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                {found.custodian === "STATION" ? "At station" : "With finder"}
              </span>
            </div>
            <div className="mt-4 flex h-32 items-center justify-center border border-border bg-surface-muted">
              <span className="text-xs text-muted-foreground">
                {found.photoCount > 0 ? `${found.photoCount} photos on file` : "No photo"}
              </span>
            </div>
            <dl className="mt-2">
              {rows.map((row) => (
                <div key={row.label} className="border-t border-border py-3 first:border-t-0">
                  <dt className="font-mono text-[0.625rem] tracking-[0.04em] text-muted-foreground uppercase">
                    {row.label}
                  </dt>
                  <dd className="mt-1 flex flex-wrap items-start gap-2 text-sm leading-5">
                    <MarkChip matched={row.matched} />
                    <span className="min-w-0 flex-1">{row.found}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("lost")}
            aria-pressed={mobileView === "lost"}
            className={cn(
              "h-11 flex-1 border text-sm font-medium",
              mobileView === "lost" ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            Your report
          </button>
          <button
            type="button"
            onClick={() => setMobileView("found")}
            aria-pressed={mobileView === "found"}
            className={cn(
              "h-11 flex-1 border text-sm font-medium",
              mobileView === "found" ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card",
            )}
          >
            Found item
          </button>
        </div>

        <section aria-labelledby="why-title" className="border border-border bg-card p-5">
          <h2 id="why-title" className="text-base font-semibold">
            Why it matched
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BreakdownBar label="Place" value={active.breakdown.place} />
            <BreakdownBar label="Description" value={active.breakdown.text} />
            <BreakdownBar label="Date" value={active.breakdown.date} />
            <BreakdownBar label="Details (brand, color)" value={active.breakdown.attributes} />
          </div>
          <p className="mt-4 border-t border-border pt-3 text-sm leading-5 text-muted-foreground">
            {matchSummary(active, report.eventDate)} Proceed to claim if this looks right.
          </p>
        </section>

        <section aria-labelledby="holder-title" className="border border-border bg-card p-5">
          <h2 id="holder-title" className="flex items-center gap-2 text-base font-semibold">
            <LockKeyhole className="size-4" aria-hidden="true" />
            Who holds this item
          </h2>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {found.custodian === "STATION"
              ? `Held at ${found.place.station}, ${found.place.city}. Counter hours: ${found.place.counterHours ?? "ask at the counter"}. Bring a government ID and your handover code.`
              : "Held by the finder. Contact details are shared after your claim is approved."}
          </p>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 shadow-[0_2px_12px_rgba(0,0,0,0.12)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[70rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Minus className="mt-0.5 size-4 shrink-0 lg:hidden" aria-hidden="true" />
            You'll answer a question only the owner would know. You have 3 attempts.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <Button
              variant="link"
              className="h-11 justify-start px-0 text-sm sm:px-2"
              render={<Link href="/help" />}
              nativeButton={false}
            >
              Report a problem
            </Button>
            <Button
              variant="outline"
              className="h-11 border-foreground"
              onClick={() => {
                setDismissed((current) => [...current, active.id]);
                toast.success("Match marked as not yours for this report.");
              }}
            >
              Not mine
            </Button>
            <Button className="col-span-2 h-11 px-5 text-sm sm:col-span-1" onClick={() => setClaimOpen(true)}>
              This is mine
            </Button>
          </div>
        </div>
      </div>

      <ClaimDialog
        key={active.id}
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        questions={found.questions ?? []}
      />
    </>
  );
}
