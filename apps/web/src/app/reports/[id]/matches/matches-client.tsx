"use client";

import { Button } from "@myfinds/ui/components/button";
import { Info, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getReportMatches, ReportApiError, type ReportMatch } from "@/lib/report-api";
import { reportPath } from "@/lib/routes";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

export default function MatchesClient({ id }: { id: string }) {
  const [data, setData] = useState<ReportMatch | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getReportMatches(id).then(setData).catch(setError).finally(() => setLoaded(true));
  }, [id]);

  if (error) {
    const unauthenticated = error instanceof ReportApiError && error.status === 401;
    return <State title={unauthenticated ? "Sign in to view matches" : "Matches unavailable"} message={error instanceof Error ? error.message : "Try again later."} />;
  }
  if (!loaded) return <State title="Loading possible matches" message="Fetching the latest candidates." loading />;
  if (!data) return <State title="Report not found" message="This report may have been removed or the link is incorrect." />;

  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-6 sm:px-6 sm:py-8">
      <Link href={reportPath(data.report.id)} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to report
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        {data.matches.length > 0 ? `${data.matches.length} possible ${data.matches.length === 1 ? "match" : "matches"}` : "No possible matches yet"}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Similarity is a suggestion, not proof of ownership. Review the details before starting a claim.
      </p>
      <div className="mt-5 flex items-start gap-2 border border-border bg-surface-muted p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Do not share private report details or claim an item based only on color or appearance.
      </div>
      {data.matches.length === 0 ? (
        <section className="mt-5 border border-border bg-card p-6">
          <h2 className="font-semibold">We are still checking</h2>
          <p className="mt-2 text-sm text-muted-foreground">New found reports will be checked until {formatDate(data.report.expiresAt.slice(0, 10))}.</p>
        </section>
      ) : (
        <ul className="mt-5 grid gap-3">
          {data.matches.map((match) => (
            <li key={match.id} className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase">Possible match</p>
                  <h2 className="mt-1 text-lg font-semibold">{match.candidate.title}</h2>
                </div>
                <span className="border border-border px-2 py-1 font-mono text-xs">{Math.round(match.score * 100)}% similarity</span>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{match.candidate.category}</dd></div>
                <div><dt className="text-muted-foreground">Found date</dt><dd className="font-medium">{formatDate(match.candidate.eventDate)}</dd></div>
                <div><dt className="text-muted-foreground">Place</dt><dd className="font-medium">{match.candidate.place.station}, {match.candidate.place.city}</dd></div>
              </dl>
              <Button className="mt-5 h-11" variant="outline" render={<Link href={reportPath(data.report.id)} />} nativeButton={false}>
                Review report
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function State({ title, message, loading = false }: { title: string; message: string; loading?: boolean }) {
  return (
    <div role={loading ? "status" : "alert"} className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      {loading ? <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      <h1 className="mt-3 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
