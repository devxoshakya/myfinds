import { cn } from "@myfinds/ui/lib/utils";
import { Upload } from "lucide-react";
import * as React from "react";

type FileInputProps = React.ComponentProps<"input"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
};

function FileInput({ className, label = "Upload file", description, ...props }: FileInputProps) {
  return (
    <label
      className={cn(
        "flex min-h-16 cursor-pointer items-center gap-3 rounded-sm border border-dashed border-border bg-surface-muted px-4 py-3 hover:bg-muted focus-within:ring-2 focus-within:ring-ring",
        props.disabled && "cursor-not-allowed opacity-70",
        className,
      )}
    >
      <Upload className="size-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <input {...props} type="file" className="sr-only" />
    </label>
  );
}

export { FileInput };
