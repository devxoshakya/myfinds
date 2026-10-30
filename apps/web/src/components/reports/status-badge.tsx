import { cn } from "@myfinds/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { statusLabels, type ReportStatus, type ReportType } from "@/lib/preview-data";

export function StatusChip({ status }: { status: ReportStatus }) {
  return (
    <span className="inline-flex items-center bg-primary px-2 py-1 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-primary-foreground uppercase">
      {statusLabels[status]}
    </span>
  );
}

export function TypeChip({ type }: { type: ReportType }) {
  return (
    <span className="inline-flex items-center border border-border px-2 py-1 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-foreground uppercase">
      {type}
    </span>
  );
}

export function OutlineChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-border px-2 py-1 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function NeedsAttentionChip() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-warning-bg px-2 py-1 font-mono text-[0.625rem] font-medium tracking-[0.04em] text-warning uppercase">
      <AlertTriangle className="size-3" aria-hidden="true" />
      Needs attention
    </span>
  );
}

export function ReportNumber({ number }: { number: string }) {
  return <span className="font-mono text-xs text-muted-foreground">{number}</span>;
}
