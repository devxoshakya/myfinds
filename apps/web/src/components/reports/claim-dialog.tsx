"use client";

import { Button } from "@myfinds/ui/components/button";
import { Input } from "@myfinds/ui/components/input";
import { Label } from "@myfinds/ui/components/label";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

type ClaimDialogProps = {
  open: boolean;
  onClose: () => void;
  questions: string[];
};

export function ClaimDialog({ open, onClose, questions }: ClaimDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<string[]>(() =>
    questions.length > 0 ? questions.map(() => "") : [""],
  );
  const [confirm, setConfirm] = useState(false);
  const [proof, setProof] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (answers.some((answer) => answer.trim().length === 0)) {
      setError("Answer every question before you send the claim.");
      return;
    }

    if (!confirm) {
      setError("Confirm that this item is yours.");
      return;
    }

    setError(null);
    setAnswers(questions.length > 0 ? questions.map(() => "") : [""]);
    setConfirm(false);
    setProof([]);
    onClose();
    toast.success("Claim sent. You'll get an email when it's decided.");
  };

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
              You'll answer a question only the owner would know. You have 3 attempts.
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

          <div className="grid gap-2">
            <Label htmlFor="claim-proof" className="text-sm font-semibold">
              Add proof (up to 2)
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="claim-proof"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="h-11 rounded-sm border-input bg-card px-3 text-sm file:text-sm"
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []).slice(0, 2);
                setProof(files);
              }}
            />
            <p className="text-sm text-muted-foreground">
              A receipt or an older photo with the item.
              {proof.length > 0 ? ` ${proof.length} attached.` : ""}
            </p>
          </div>

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
          <p className="font-mono text-xs text-muted-foreground">Attempt 1 of 3</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button type="button" variant="outline" className="h-11 border-foreground" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-11 px-5 text-sm">
              Submit claim
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
