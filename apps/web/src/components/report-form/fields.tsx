import { Field } from "@myfinds/ui/components/field";
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
    <Field
      id={id}
      className={className}
      description={description}
      error={error}
      required={required}
      label={
        <>
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
          ) : null}
        </>
      }
    >
      {children}
    </Field>
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
