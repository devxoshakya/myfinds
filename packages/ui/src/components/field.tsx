import { cn } from "@myfinds/ui/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type FieldProps = {
  children: ReactNode;
  description?: string;
  error?: string;
  id?: string;
  label?: ReactNode;
  required?: boolean;
  className?: string;
};

export function Field({
  children,
  description,
  error,
  id,
  label,
  required = false,
  className,
}: FieldProps) {
  const descriptionId = id && description ? `${id}-description` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;

  return (
    <div
      className={cn("grid gap-2", className)}
      data-invalid={error ? true : undefined}
    >
      {label ? (
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-destructive">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {description ? (
        <p id={descriptionId} className="text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldDescribedBy(id: string, description?: string, error?: string) {
  return [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}
