"use client";

import { Button } from "@myfinds/ui/components/button";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";

import { formatDateTime } from "@/lib/preview-data";

type HandoverCodeProps = {
  code: string;
  expiresAt: string;
  stationName?: string;
  counterHours?: string;
};

export function HandoverCode({ code, expiresAt, stationName, counterHours }: HandoverCodeProps) {
  const digits = code.split("");

  return (
    <div className="grid gap-4 border border-dashed border-foreground p-4 sm:p-5">
      <div>
        <p className="font-mono text-xs tracking-[0.04em] text-muted-foreground uppercase">
          One-time handover code
        </p>
        <p
          aria-label={digits.join(" ")}
          className="mt-2 flex flex-wrap gap-2 font-mono text-[2.25rem] leading-none font-bold tracking-[0.2em] tabular-nums"
        >
          {code}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Expires {formatDateTime(expiresAt)}
        </p>
      </div>

      {stationName ? (
        <div className="border border-border bg-surface-muted p-3 text-sm leading-5">
          <p className="font-medium">{stationName}</p>
          {counterHours ? <p className="text-muted-foreground">Counter hours: {counterHours}</p> : null}
          <p className="mt-1 text-muted-foreground">Bring a government ID and your handover code.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-11 border-foreground"
          onClick={() => {
            void navigator.clipboard
              .writeText(code)
              .then(() => toast.success("Code copied."))
              .catch(() => toast.error("Could not copy the code."));
          }}
        >
          <Copy data-icon="inline-start" aria-hidden="true" />
          Copy code
        </Button>
        <Button variant="outline" className="h-11 border-foreground" onClick={() => window.print()}>
          <Printer data-icon="inline-start" aria-hidden="true" />
          Print slip
        </Button>
      </div>
    </div>
  );
}
