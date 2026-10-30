"use client";

import { Button } from "@myfinds/ui/components/button";
import { ImagePlus, LockKeyhole, Trash2, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";

const accept = "image/jpeg,image/png,image/webp";

type PhotoUploaderProps = {
  id: string;
  label: string;
  description: string;
  files: File[];
  max: number;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
};

export function PhotoUploader({
  id,
  label,
  description,
  files,
  max,
  error,
  onChange,
  onRemove,
}: PhotoUploaderProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return (
    <fieldset className="grid gap-3" aria-describedby={error ? `${id}-error` : `${id}-description`}>
      <legend className="text-sm font-semibold">
        {label} <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p id={`${id}-description`} className="text-sm leading-5 text-muted-foreground">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {previews.map((src, index) => (
          <div
            key={src}
            className="relative aspect-square overflow-hidden border border-border bg-surface-muted"
          >
            {/* Object URLs cannot use next/image; the preview is decorative. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute top-1 right-1 flex size-8 items-center justify-center border border-border bg-background/95 text-foreground hover:bg-surface-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}

        {files.length < max ? (
          <label
            htmlFor={id}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-border bg-surface-muted p-2 text-center hover:bg-muted focus-within:ring-2 focus-within:ring-ring"
          >
            <ImagePlus className="size-5" aria-hidden="true" />
            <span className="text-xs font-medium">
              {files.length === 0 ? "Add photos" : "Add another"}
            </span>
            <span className="text-[0.6875rem] text-muted-foreground">Click to browse</span>
            <input
              id={id}
              type="file"
              accept={accept}
              multiple
              className="sr-only"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : `${id}-description`}
              onChange={onChange}
            />
          </label>
        ) : null}
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Attached: {files.length} of {max}. JPEG, PNG or WebP, up to 5 MB each.
      </p>

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

type PrivatePhotoUploaderProps = {
  id: string;
  file: File | null;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

export function PrivatePhotoUploader({
  id,
  file,
  error,
  onChange,
  onRemove,
}: PrivatePhotoUploaderProps) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold" id={`${id}-label`}>
        Private proof photo <span className="font-normal text-muted-foreground">(optional)</span>
      </span>
      <p id={`${id}-description`} className="text-sm leading-5 text-muted-foreground">
        A close-up of something only the owner would know, such as a serial number. It is never
        shown to the person claiming the item.
      </p>
      <label
        htmlFor={id}
        className="flex min-h-16 cursor-pointer items-center gap-3 border border-dashed border-border bg-surface-muted px-4 py-3 hover:bg-muted focus-within:ring-2 focus-within:ring-ring"
      >
        <LockKeyhole className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {file ? file.name : "Upload private verification proof"}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            JPEG, PNG or WebP, up to 5 MB
          </span>
        </span>
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-description`}
          onChange={onChange}
        />
      </label>
      {file ? (
        <Button type="button" variant="link" className="w-fit justify-start px-0" onClick={onRemove}>
          <Trash2 data-icon="inline-start" aria-hidden="true" />
          Remove private photo
        </Button>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
