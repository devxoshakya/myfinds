"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Check, ShieldX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ReportApiError } from "@/lib/report-api";

export type ClaimReviewClaim = {
  id: string;
  attemptNo: number;
  decision: "PENDING" | "APPROVED" | "REJECTED";
  handedOverAt?: string | null;
  answers?: string[];
};

export type ClaimReviewQuestion = { question: string; expectedAnswer: string };

type ClaimReviewProps = {
  claim: ClaimReviewClaim;
  questions: ClaimReviewQuestion[];
  photos?: Array<{ url: string }>;
  /** Optional context line, e.g. the report the claim belongs to. */
  heading?: string;
  onDecide: (claimId: string, decision: "APPROVED" | "REJECTED") => Promise<void>;
  onHandover: (claimId: string, code: string) => Promise<void>;
};

export function ClaimReview({ claim, questions, photos, heading, onDecide, onHandover }: ClaimReviewProps) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (cause: unknown) {
      toast.error(cause instanceof ReportApiError ? cause.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  }

  const answers: string[] = claim.answers ?? [];

  if (claim.decision === "REJECTED") {
    return (
      <article className="border border-border bg-card p-4 sm:p-5">
        {heading ? <h3 className="font-semibold">{heading}</h3> : null}
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldX className="size-4 shrink-0" aria-hidden="true" />
          Claim {claim.attemptNo} was rejected.
        </p>
      </article>
    );
  }

  return (
    <article className="border border-border bg-card p-4 sm:p-5">
      {heading ? <h3 className="font-semibold">{heading}</h3> : null}
      <p className="mt-1 font-mono text-xs text-muted-foreground uppercase">
        Claim attempt {claim.attemptNo} · {claim.decision === "PENDING" ? "awaiting your review" : "approved"}
      </p>

      {photos && photos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <img
              key={photo.url.slice(-24) ?? index}
              src={photo.url}
              alt={`Item photo ${index + 1}`}
              loading="lazy"
              className="size-20 border border-border object-cover"
            />
          ))}
        </div>
      ) : null}

      <dl className="mt-4 grid gap-4">
        {(questions.length > 0 ? questions : [{ question: "Only the owner would know", expectedAnswer: "" }]).map(
          (entry, index) => (
            <div key={`${claim.id}-${index}`} className="grid gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <dt className="text-sm font-medium">{entry.question}</dt>
              <dd className="text-sm leading-6">{answers[index] ?? <span className="text-muted-foreground">No answer given</span>}</dd>
              {entry.expectedAnswer ? (
                <dd className="text-sm text-muted-foreground">
                  Expected: <span className="text-foreground">{entry.expectedAnswer}</span>
                </dd>
              ) : null}
            </div>
          ),
        )}
      </dl>

      {claim.decision === "PENDING" ? (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            className="h-11 border-foreground"
            disabled={busy}
            onClick={() => void run(() => onDecide(claim.id, "REJECTED"))}
          >
            {busy ? "Working…" : "Reject claim"}
          </Button>
          <Button className="h-11" disabled={busy} onClick={() => void run(() => onDecide(claim.id, "APPROVED"))}>
            <Check data-icon="inline-start" aria-hidden="true" />
            Approve claim
          </Button>
        </div>
      ) : claim.handedOverAt ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4 text-success" aria-hidden="true" />
          Item handed over and report closed.
        </p>
      ) : (
        <form
          className="mt-5 grid gap-2 border-t border-border pt-4 sm:flex sm:items-start sm:gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim().length !== 6) {
              setCodeError("Enter the 6-digit code shown to the claimant.");
              return;
            }
            setCodeError("");
            void run(async () => {
              await onHandover(claim.id, code.trim());
              setCode("");
            });
          }}
        >
          <div className="grid flex-1 gap-1">
            <label htmlFor={`handover-code-${claim.id}`} className="text-sm font-medium">
              Claimant's handover code
            </label>
            <Input
              id={`handover-code-${claim.id}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="h-11 max-w-[12rem] rounded-sm px-3 font-mono text-base tracking-[0.2em]"
              value={code}
              aria-required="true"
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError("");
              }}
            />
            {codeError ? (
              <p role="alert" className="text-sm text-destructive">
                {codeError}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? "Checking…" : "Confirm handover"}
          </Button>
        </form>
      )}
    </article>
  );
}
