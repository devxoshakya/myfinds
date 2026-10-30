"use client";

import { Button } from "@myfinds/ui/components/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/reports", label: "My Reports", signedInOnly: true },
] as const;

export default function Header() {
  const { data: session, isPending } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleLinks = links.filter((link) => !("signedInOnly" in link) || session);

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[70rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-sm border border-border px-2 py-1.5"
          >
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center bg-foreground font-mono text-[0.625rem] font-bold tracking-tight text-primary-foreground"
            >
              MF
            </span>
            <span className="text-sm font-semibold tracking-tight">MyFinds</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-5 text-sm md:flex">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isPending ? (
            <span
              aria-hidden="true"
              className="h-9 w-24 animate-pulse rounded-sm bg-muted"
            />
          ) : session ? (
            <UserMenu user={{ name: session.user.name, email: session.user.email }} />
          ) : (
            <>
              <Button
                variant="link"
                className="hidden h-11 px-2 text-sm sm:inline-flex"
                render={<Link href="/login" />}
                nativeButton={false}
              >
                Log in
              </Button>
              <Button
                variant="outline"
                className="hidden h-10 border-foreground px-4 text-sm sm:inline-flex"
                render={<Link href="/signup" />}
                nativeButton={false}
              >
                Sign up
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-11 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-nav" className="border-t border-border md:hidden">
          <nav
            aria-label="Mobile"
            className="mx-auto flex w-full max-w-[70rem] flex-col px-4 py-2 text-sm sm:px-6"
          >
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-border py-3 font-medium last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
            {isPending ? null : session ? (
              <button
                type="button"
                className="py-3 text-left font-medium text-muted-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  void authClient.signOut({ fetchOptions: { onSuccess: () => location.assign("/") } });
                }}
              >
                Log out
              </button>
            ) : (
              <div className="flex flex-col gap-2 py-3">
                <Button
                  variant="outline"
                  className="h-11 border-foreground"
                  render={<Link href="/signup" onClick={() => setMenuOpen(false)} />}
                  nativeButton={false}
                >
                  Sign up
                </Button>
                <Button
                  variant="link"
                  className="h-11"
                  render={<Link href="/login" onClick={() => setMenuOpen(false)} />}
                  nativeButton={false}
                >
                  Log in
                </Button>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
