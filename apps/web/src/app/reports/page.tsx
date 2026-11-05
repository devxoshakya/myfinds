import { Button } from "@myfinds/ui/components/button";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import MyReportsClient from "./my-reports-client";

export const metadata: Metadata = {
  title: "My reports",
};

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
            My reports
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Every item you reported, and where it stands.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-11" render={<Link href="/report/lost" />} nativeButton={false}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Report a lost item
          </Button>
          <Button
            variant="outline"
            className="h-11 border-foreground"
            render={<Link href="/report/found" />}
            nativeButton={false}
          >
            Report a found item
          </Button>
        </div>
      </div>

      <MyReportsClient />
    </div>
  );
}
