import { Button } from "@myfinds/ui/components/button";
import {
  ArrowRight,
  Check,
  ClipboardList,
  FilePlus,
  KeyRound,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import HomeBanner from "@/components/home-banner";
import { previewStats } from "@/lib/preview-data";

const steps = [
  {
    number: "01",
    title: "Report",
    description: "Add details, a photo, and the station.",
    icon: FilePlus,
  },
  {
    number: "02",
    title: "Match",
    description: "We search for you every day.",
    icon: Search,
  },
  {
    number: "03",
    title: "Verify",
    description: "Answer a question only the owner would know.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Collect",
    description: "Get the item from the finder or a station with a handover code.",
    icon: KeyRound,
  },
];

const trustPoints = [
  {
    title: "Private contact data",
    description: "Contact details stay private until the owner is verified.",
    icon: LockKeyhole,
  },
  {
    title: "Secure handover code",
    description: "Stations hand items over with a secure 6-digit code.",
    icon: ShieldCheck,
  },
  {
    title: "Audited custody chain",
    description: "Every step and custody transfer is logged.",
    icon: ClipboardList,
  },
];

const stats = [
  { value: previewStats.reported, label: "Items reported", detail: "Across rail, bus, and metro" },
  {
    value: previewStats.returned,
    label: "Items returned",
    detail: `${Math.round((previewStats.returned / previewStats.reported) * 100)}% returned`,
  },
  { value: previewStats.stations, label: "Stations covered", detail: "Active stations" },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <>
      <HomeBanner />

      <div className="mx-auto w-full max-w-[60rem] px-4 sm:px-6">
        <section
          aria-labelledby="hero-title"
          className="grid gap-12 border-b border-border py-14 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-20"
        >
          <div className="max-w-xl">
            <Eyebrow>Transit lost and found</Eyebrow>
            <h1
              id="hero-title"
              className="mt-4 text-[2rem] leading-[1.18] font-bold tracking-tight text-foreground sm:text-[3rem] sm:leading-[1.08]"
            >
              Lost it. Found it.
              <br />
              Matched.
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-6 text-muted-foreground">
              Report a lost or found item at any metro, railway, or bus station. We match it and
              make sure it reaches the real owner.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 w-full px-5 text-sm sm:w-auto"
                render={<Link href="/report/lost" />}
                nativeButton={false}
              >
                <Search data-icon="inline-start" aria-hidden="true" />
                I lost something
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-foreground px-5 text-sm sm:w-auto"
                render={<Link href="/report/found" />}
                nativeButton={false}
              >
                <Plus data-icon="inline-start" aria-hidden="true" />
                I found something
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              <Link
                className="font-medium text-foreground underline underline-offset-4"
                href="/login"
              >
                Station staff? Log in
              </Link>
              <span className="ml-2">Staff accounts are created by an admin.</span>
            </p>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
                From report to return
              </p>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
                Private by design
              </span>
            </div>
            <ol className="flex flex-col gap-3 pt-5">
              <li className="flex items-center gap-4 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-border">
                  <Search className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">A report is submitted</p>
                  <p className="mt-1 text-sm text-muted-foreground">Item details stay private.</p>
                </div>
              </li>
              <li className="ml-9 h-4 border-l border-dashed border-border" aria-hidden="true" />
              <li className="flex items-center gap-4 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-border">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">The owner is verified</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A private question confirms the match.
                  </p>
                </div>
              </li>
              <li className="ml-9 h-4 border-l border-dashed border-border" aria-hidden="true" />
              <li className="flex items-center gap-4 border-2 border-foreground p-4">
                <span className="flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <Check className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium">The item is returned</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A secure code completes handover.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-title" className="border-b border-border py-14 sm:py-16">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="how-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Four steps from loss to return
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <li key={number} className="border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center border border-border">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{number}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="return-title" className="border-b border-border py-14 sm:py-16">
          <Eyebrow>For finders</Eyebrow>
          <h2 id="return-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Two ways to return an item
          </h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            <article className="border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">Keep it and return it yourself</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Hold the item safely until the verified owner claims it with a secure handover
                code.
              </p>
              <ol className="mt-5 flex flex-wrap items-center gap-2 border border-border bg-surface-muted p-3 text-sm font-medium">
                <li className="border border-border bg-card px-3 py-2">Finder</li>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                <li className="border border-border bg-card px-3 py-2">Code</li>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                <li className="border border-border bg-card px-3 py-2">Owner</li>
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">
                Contact details stay private until verified.
              </p>
            </article>
            <article className="border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">
                Hand it to a station or stop, and the station takes over
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Drop it off at the counter and station staff manage custody and verification.
              </p>
              <ol className="mt-5 flex flex-wrap items-center gap-2 border border-border bg-surface-muted p-3 text-sm font-medium">
                <li className="border border-border bg-card px-3 py-2">Drop-off</li>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                <li className="border border-border bg-card px-3 py-2">Station</li>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                <li className="border border-border bg-card px-3 py-2">Claim desk</li>
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">Every step is time-stamped.</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="stats-title" className="border-b border-border py-14 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Public totals</Eyebrow>
              <h2 id="stats-title" className="mt-3 text-2xl font-semibold tracking-tight">
                MyFinds so far
              </h2>
            </div>
            <span className="border border-border px-2.5 py-1 font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
              Sample data
            </span>
          </div>
          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            {stats.map(({ value, label, detail }) => (
              <div key={label} className="border border-border bg-card p-6">
                <dd className="font-mono text-3xl font-semibold tabular-nums">
                  {value.toLocaleString()}
                </dd>
                <dt className="mt-3 text-sm font-medium">{label}</dt>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            We never show item photos or names on this page.
          </p>
        </section>

        <section aria-labelledby="trust-title" className="py-14 sm:py-16">
          <Eyebrow>Integrity and privacy standards</Eyebrow>
          <h2 id="trust-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Built around a safe handover
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {trustPoints.map(({ title, description, icon: Icon }) => (
              <div key={title} className="border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center border border-border">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
