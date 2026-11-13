import type { Metadata } from "next";

import StaffClient from "./staff-client";

export const metadata: Metadata = {
  title: "Staff console",
  robots: { index: false, follow: false },
};

export default function StaffPage() {
  return (
    <div className="mx-auto w-full max-w-[70rem] px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-[1.625rem] leading-8 font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
          Staff console
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Found items handed in at your stations. Confirm receipt once the item is on the shelf —
          matching starts as soon as you do.
        </p>
      </div>

      <StaffClient />
    </div>
  );
}
