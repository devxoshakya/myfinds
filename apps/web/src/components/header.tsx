"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { usePathname } from "next/navigation";

import UserMenu from "./user-menu";

const MARKETING_LINKS = [
  { href: "/#how-it-works", label: "How it works", number: "01" },
  { href: "/#features", label: "At the handover", number: "02" },
  { href: "/#coverage", label: "Coverage", number: "03" },
  { href: "/#trust", label: "Privacy", number: "04" },
  { href: "/#faq", label: "FAQ", number: "05" },
] as const;

export default function Header() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role;
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isAppRoute =
    pathname.startsWith("/reports") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/status");

  const appLinks =
    role === "STATION_STAFF" || role === "ADMIN"
      ? [
          { href: "/staff", label: role === "ADMIN" ? "Admin console" : "Staff console", number: "01" },
          { href: "/reports", label: "My reports", number: "02" },
          { href: "/report/found", label: "Report found", number: "03" },
        ]
      : [
          { href: "/reports", label: "My reports", number: "01" },
          { href: "/report/lost", label: "Report lost", number: "02" },
          { href: "/report/found", label: "Report found", number: "03" },
        ];
  const activeLinks = isAppRoute ? appLinks : MARKETING_LINKS;

  useEffect(() => {
    if (!menuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (isAuthRoute) return null;

  const close = () => setMenuOpen(false);

  return (
    <header id="top" className={`mf-header${isAppRoute ? " mf-header--app" : ""}`}>
      <div className="mf-shell mf-header__inner">
        <Link href="/" className="mf-wordmark" aria-label="MyFinds home">
          <span aria-hidden="true" className="mf-wordmark__mark">
            MF
          </span>
          <span className="mf-wordmark__text">
            <span className="mf-wordmark__name">MyFinds</span>
            <span className="mf-wordmark__sub">Delhi-NCR · Lost &amp; found</span>
          </span>
        </Link>

        <nav aria-label="Main" className="mf-nav">
          {activeLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className="mf-nav__link"
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mf-header__actions">
          {isPending ? (
            <span aria-hidden="true" className="h-9 w-24 animate-pulse rounded-sm bg-muted" />
          ) : session ? (
            <UserMenu
              user={{ name: session.user.name, email: session.user.email, role: role ?? undefined }}
            />
          ) : (
            <>
              <Link href="/login" className="mf-header__login">
                Log in
              </Link>
              <Link href="/report/lost" className="mf-header__cta">
                Report an item
                <ArrowRight size={14} strokeWidth={2} aria-hidden />
              </Link>
            </>
          )}

          <button
            type="button"
            className="mf-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-nav" className="mf-mobile">
          <div className="mf-mobile__inner">
            <nav aria-label="Mobile" className="contents">
              {activeLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  onClick={close}
                  className="mf-mobile__link"
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  {link.label}
                  <span className="mf-mobile__num">{link.number}</span>
                </Link>
              ))}
            </nav>

            <div className="mf-mobile__actions">
              {isPending ? null : session ? (
                <>
                  <Link href="/report/lost" onClick={close} className="mf-btn mf-btn--primary">
                    Report a lost item
                    <ArrowRight size={15} strokeWidth={2} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className="mf-btn mf-btn--ghost"
                    onClick={() => {
                      close();
                      void authClient.signOut({
                        fetchOptions: { onSuccess: () => location.assign("/") },
                      });
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signup" onClick={close} className="mf-btn mf-btn--primary">
                    Create an account
                    <ArrowRight size={15} strokeWidth={2} aria-hidden />
                  </Link>
                  <Link href="/login" onClick={close} className="mf-btn mf-btn--ghost">
                    Log in
                  </Link>
                </>
              )}
            </div>

            <p className="mf-mobile__meta">
              <span className="mf-live-dot" aria-hidden />
              Metro · Railway · Bus · Delhi-NCR
            </p>
          </div>
        </div>
      ) : null}
    </header>
  );
}
