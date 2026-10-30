"use client";

import { Toaster } from "@myfinds/ui/components/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-center" theme="light" />
    </>
  );
}
