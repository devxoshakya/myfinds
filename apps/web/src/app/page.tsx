import { Button } from "@myfinds/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@myfinds/ui/components/card";
import {
  ArrowRight,
  Check,
  Clock3,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const steps = [
  {
    number: "01",
    title: "Report",
    description: "Add details, a photo, and the station.",
    icon: Plus,
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
    description:
      "Get the item from the finder or a station with a handover code.",
    icon: Check,
  },
];

const trustPoints = [
  {
    title: "Private contact details",
    description: "Your details stay private until the owner is verified.",
    icon: LockKeyhole,
  },
  {
    title: "Secure handover",
    description: "A one-time code helps make sure an item reaches its owner.",
    icon: ShieldCheck,
  },
  {
    title: "Logged at every step",
    description: "Every custody transfer is recorded for accountability.",
    icon: Clock3,
  },
];

function FlowStep({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-sm font-medium">
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-0 overflow-y-auto bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
        <section
          aria-labelledby="hero-title"
          className="grid gap-12 border-b border-border py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-24"
        >
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Transit lost and found
            </p>
            <h1
              id="hero-title"
              className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]"
            >
              Lost it. Found it.
              <br />
              Matched.
            </h1>
            <p className="mt-6 max-w-[60ch] text-base leading-7 text-muted-foreground sm:text-lg">
              Report a lost or found item at any metro, railway, or bus station. We match it and
              make sure it reaches the real owner.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 w-full px-5 text-sm sm:w-auto"
                render={<a href="/report/lost" />}
                nativeButton={false}
              >
                <Search data-icon="inline-start" />
                Report Lost Item
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full border-foreground px-5 text-sm sm:w-auto"
                render={<a href="/report/found" />}
                nativeButton={false}
              >
                <Plus data-icon="inline-start" />
                Report Found Item
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

          <div
            role="group"
            aria-label="The MyFinds return process"
            className="relative mx-auto w-full max-w-md border border-border bg-background p-5 sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                From report to return
              </p>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span aria-hidden="true" className="size-2 rounded-full bg-foreground" />
                Private by design
              </span>
            </div>
            <div className="flex flex-col gap-3 py-6">
              <div className="flex items-center gap-4 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-border">
                  <Search className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">A report is submitted</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Item details stay private.
                  </p>
                </div>
              </div>
              <div className="ml-9 h-5 border-l border-dashed border-border" aria-hidden="true" />
              <div className="flex items-center gap-4 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-border">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">The owner is verified</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A private question confirms the match.
                  </p>
                </div>
              </div>
              <div className="ml-9 h-5 border-l border-dashed border-border" aria-hidden="true" />
              <div className="flex items-center gap-4 border border-foreground p-4">
                <span className="flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <Check className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">The item is returned</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A secure code completes handover.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              <span>For metro, railway, and bus stations</span>
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-title" className="py-16 sm:py-20">
          <div className="mb-8 max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              A clear path back
            </p>
            <h2 id="how-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Four steps from loss to return
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <Card key={number} className="min-h-48 bg-background">
                <CardHeader className="gap-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center border border-border">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{number}</span>
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="return-title" className="border-y border-border bg-background">
          <div className="py-12 sm:py-16">
            <div className="mb-8 max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                For finders
              </p>
              <h2
                id="return-title"
                className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Two ways to return an item
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-2 border-foreground bg-background">
                <CardHeader>
                  <CardTitle className="text-lg">Keep it and return it yourself</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Hold the item safely until the verified owner claims it with a secure handover
                    code.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/40 p-3">
                    <FlowStep>Finder</FlowStep>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <FlowStep>Code</FlowStep>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <FlowStep>Owner</FlowStep>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Contact details stay private until verified.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground bg-background">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Hand it to a station or stop, and the station takes over
                  </CardTitle>
                  <CardDescription className="text-sm leading-6">
                    Drop it off at the counter and station staff manage custody and verification.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/40 p-3">
                    <FlowStep>Drop-off</FlowStep>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <FlowStep>Station</FlowStep>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    <FlowStep>Claim desk</FlowStep>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Every step is time-stamped.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section aria-labelledby="stats-title" className="py-16 sm:py-20">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Public totals
            </p>
            <h2 id="stats-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              MyFinds so far
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Items reported", "Across rail, bus, and metro"],
              ["Items returned", "Returned to their owners"],
              ["Stations covered", "Active stations"],
            ].map(([label, description]) => (
              <Card key={label} className="bg-background">
                <CardContent className="pt-5">
                  <p
                    className="font-mono text-3xl font-semibold"
                    aria-label={`${label} total unavailable`}
                  >
                    —
                  </p>
                  <p className="mt-3 font-medium">{label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Live totals will appear here. We never show item photos or names on this page.
          </p>
        </section>

        <section aria-labelledby="trust-title" className="border-t border-border py-16 sm:py-20">
          <div className="mb-8 max-w-xl">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Integrity and privacy
            </p>
            <h2 id="trust-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Built around a safe handover
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {trustPoints.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="bg-background">
                <CardHeader className="gap-4">
                  <span className="flex size-10 items-center justify-center border border-border">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-border py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MyFinds. Helping items find their way home.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link className="hover:text-foreground" href="/#how-it-works">
              How it works
            </Link>
            <a className="hover:text-foreground" href="/report/lost">
              Report lost
            </a>
            <a className="hover:text-foreground" href="/report/found">
              Report found
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
