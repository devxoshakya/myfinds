"use client";

import { Button, buttonVariants } from "@myfinds/ui/components/button";
import { Info, LoaderCircle, ShieldX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  getStaffMatchDetails,
  ReportApiError,
  type StaffMatchDetails,
} from "@/lib/report-api";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeZone: "UTC",
});

const scoreDimensions = [
  { key: "place", label: "Place" },
  { key: "text", label: "Description" },
  { key: "date", label: "Date" },
  { key: "attributes", label: "Details" },
] as const;

function isStaffRole(role: string | undefined) {
  return role === "STATION_STAFF" || role === "ADMIN";
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function State({
  title,
  message,
  loading = false,
}: {
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <div
      role={loading ? "status" : "alert"}
      className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center"
    >
      {loading ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ItemDetails({
  heading,
  item,
}: {
  heading: string;
  item: StaffMatchDetails["lost"];
}) {
  return (
    <article className="border border-border bg-card p-4 sm:p-5">
      <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
        {heading}
      </p>
      <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Category" value={item.category} />
        <Detail label="Date" value={formatDate(item.eventDate)} />
        <Detail label="Brand" value={item.brand ?? "Not provided"} />
        <Detail label="Color" value={item.color ?? "Not provided"} />
        <Detail label="Place" value={`${item.place.station}, ${item.place.city}`} />
        {item.description ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap font-medium">{item.description}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

export default function StaffMatchClient({ id }: { id: string }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const staffRole = isStaffRole(session?.user?.role);
  const [match, setMatch] = useState<StaffMatchDetails | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (sessionPending || !staffRole) return;

    let active = true;
    setMatch(null);
    setError(null);
    setLoading(true);
    getStaffMatchDetails(id)
      .then((result) => {
        if (active) setMatch(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, retry, sessionPending, staffRole]);

  if (sessionPending) {
    return <State title="Checking staff access" message="Loading your session." loading />;
  }

  if (!staffRole) {
    return (
      <div role="alert" className="mx-auto mt-8 w-full max-w-xl border border-border bg-card p-6">
        <ShieldX className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-sm leading-6">
          {session
            ? "This page is only for station staff and admins."
            : "Sign in with a station staff account to view match details."}
        </p>
        {session ? null : (
          <Link href="/login" className={buttonVariants({ className: "mt-4 h-11" })}>
            Sign in
          </Link>
        )}
      </div>
    );
  }

  if (error !== null) {
    const message =
      error instanceof ReportApiError && error.status === 401
        ? "Sign in to view staff match details."
        : error instanceof Error
          ? error.message
          : "Staff match details are unavailable.";
    return (
      <div role="alert" className="mx-auto mt-8 w-full max-w-xl border border-border bg-card p-6">
        <p className="text-sm leading-6">{message}</p>
        <Button
          className="mt-4 h-11"
          variant="outline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (loading) {
    return <State title="Loading match details" message="Fetching the latest comparison." loading />;
  }

  if (!match) {
    return (
      <State
        title="Match not found"
        message="This match may have been removed or may not be assigned to one of your stations."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/staff" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to staff console
      </Link>
      <div className="mt-4">
        <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
          Staff match review
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Compare item details
        </h1>
      </div>

      <div className="mt-4 flex items-start gap-2 border border-border bg-surface-muted p-3 text-sm font-medium">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        A score is not proof of ownership
      </div>

      <section aria-label="Lost and found item comparison" className="mt-5 grid gap-3 md:grid-cols-2">
        <ItemDetails heading="Lost Item" item={match.lost} />
        <ItemDetails heading="Found Item · staff details" item={match.found} />
      </section>

      <section aria-labelledby="match-score-heading" className="mt-5 border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="match-score-heading" className="text-base font-semibold">
            Match score
          </h2>
          <p className="font-mono text-lg font-semibold">{Math.round(match.score * 100)}%</p>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {scoreDimensions.map(({ key, label }) => {
            const value = match.scoreBreakdown[key];
            const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
            return (
              <div key={key}>
                <div className="flex justify-between gap-2 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{percent}%</dd>
                </div>
                <div
                  className="mt-2 h-2 bg-muted"
                  role="progressbar"
                  aria-label={`${label} score`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div className="h-full bg-foreground" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Why it matched</h3>
          {match.reasons.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {match.reasons.map((reason) => (
                <li key={reason} className="border border-border px-2 py-1">
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No specific match reasons were generated.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
