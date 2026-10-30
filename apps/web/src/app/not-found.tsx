import { Button } from "@myfinds/ui/components/button";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex size-12 items-center justify-center border border-border bg-surface-muted">
        <LockKeyhole className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        You don't have access to this page
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The link may be wrong, or this report belongs to someone else.
      </p>
      <Button className="mt-6 h-11" render={<Link href="/reports" />} nativeButton={false}>
        Go to My Reports
      </Button>
    </div>
  );
}
