"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { submitReportClaim, ReportApiError } from "@/lib/report-api";

type ClaimDialogProps = {
  open: boolean;
  onClose: () => void;
  matchId: string;
  questions: string[];
  attemptsUsed: number;
  /** Called after the claim was accepted by the server. */
  onClaimed: () => void;
};

const MAX_CLAIM_ATTEMPTS = 3;

export function ClaimDialog({ open, onClose, matchId, questions, attemptsUsed, onClaimed }: ClaimDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<string[]>(() =>
    questions.length > 0 ? questions.map(() => "") : [""],
  );
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      if (answers.some((answer) => answer.trim().length === 0)) {
        setError("Answer every question before you send the claim.");
        return;
      }
      if (!confirm) {
        setError("Confirm that this item is yours.");
        return;
      }

      setError(null);
      setPending(true);
      try {
        await submitReportClaim(matchId, answers.map((answer) => answer.trim()));
        toast.success("Claim sent. The custodian will review your answers.");
        onClaimed();
        onClose();
      } catch (cause: unknown) {
        setError(
          cause instanceof ReportApiError
            ? cause.message
            : "The claim could not be sent. Try again.",
        );
      } finally {
        setPending(false);
      }
    })();
  };

  const attemptsLeft = MAX_CLAIM_ATTEMPTS - attemptsUsed;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="claim-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none border border-border bg-card p-0 text-foreground backdrop:bg-foreground/40 sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="claim-title" className="text-lg font-semibold">
              Prove it's yours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You'll answer a question only the owner would know. You have {Math.max(attemptsLeft, 0)}{" "}
              {attemptsLeft === 1 ? "attempt" : "attempts"} left.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5 grid gap-4">
          {questions.length > 0 ? (
            questions.map((question, index) => (
              <div key={question} className="grid gap-2">
                <Label htmlFor={`claim-answer-${index}`} className="text-sm font-semibold">
                  {question}
                </Label>
                <Input
                  id={`claim-answer-${index}`}
                  className="h-11 rounded-sm px-3 text-sm"
                  value={answers[index] ?? ""}
                  aria-required="true"
                  onChange={(event) => {
                    const next = [...answers];
                    next[index] = event.target.value;
                    setAnswers(next);
                    setError(null);
                  }}
                />
              </div>
            ))
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="claim-answer-0" className="text-sm font-semibold">
                Describe something only the owner would know
              </Label>
              <Input
                id="claim-answer-0"
                className="h-11 rounded-sm px-3 text-sm"
                value={answers[0] ?? ""}
                aria-required="true"
                onChange={(event) => {
                  setAnswers([event.target.value]);
                  setError(null);
                }}
              />
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 border border-border bg-surface-muted p-3 text-sm leading-5">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(event) => {
                setConfirm(event.target.checked);
                setError(null);
              }}
              className="mt-0.5 size-4 shrink-0 accent-foreground"
            />
            <span>I confirm this item is mine.</span>
          </label>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-muted-foreground">
            Attempt {attemptsUsed + 1} of {MAX_CLAIM_ATTEMPTS}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" className="h-11 border-foreground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-11 px-5 text-sm" disabled={pending}>
              {pending ? "Sending…" : "Submit claim"}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
