import { Label } from "@myfinds/ui/components/label";
import { cn } from "@myfinds/ui/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-destructive">
      *
    </span>
  );
}

export function FormField({
  id,
  label,
  required = false,
  optional = false,
  description,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required ? <RequiredMark /> : null}
        {optional ? (
          <span className="font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </Label>
      {children}
      {description ? (
        <p id={`${id}-description`} className="text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SectionCard({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`section-${number}`}
      className="border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center bg-primary font-mono text-xs font-semibold text-primary-foreground"
        >
          {String(number).padStart(2, "0")}
        </span>
        <div className="grid gap-1">
          <h2 id={`section-${number}`} className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-sm leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-5 pt-5">{children}</div>
    </section>
  );
}
