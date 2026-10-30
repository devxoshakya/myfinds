"use client";
import Link from "next/link";
import { Search } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 border border-border px-2.5 py-2 font-semibold tracking-tight text-foreground"
        >
          <Search className="size-4" aria-hidden="true" />
          MyFinds
        </Link>
        <nav
          aria-label="Main"
          className="order-3 flex basis-full items-center gap-5 border-t py-2 text-sm sm:order-none sm:basis-auto sm:border-0 sm:py-0"
        >
          <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground">
            How it works
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
