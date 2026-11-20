"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import DelhiClock from "./marketing/delhi-clock";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#features", label: "At the handover" },
      { href: "/#coverage", label: "Coverage" },
      { href: "/#trust", label: "Privacy & trust" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Start a record",
    links: [
      { href: "/report/lost", label: "Report a lost item" },
      { href: "/report/found", label: "Report a found item" },
      { href: "/reports", label: "My reports" },
      { href: "/signup", label: "Create an account" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/login", label: "Station staff" },
    ],
  },
] as const;

export default function SiteFooter() {
  const pathname = usePathname();
  const hideFooter =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/status");

  if (hideFooter) return null;

  return (
    <footer className="mf-footer">
      <div className="mf-shell">
        <div className="mf-footer__top">
          <div className="mf-footer__brand">
            <Link href="/" className="mf-wordmark mf-footer__wordmark" aria-label="MyFinds home">
              <span aria-hidden="true" className="mf-wordmark__mark">
                MF
              </span>
              <span className="mf-wordmark__text">
                <span className="mf-wordmark__name">MyFinds</span>
                <span className="mf-wordmark__sub">Delhi-NCR · Lost &amp; found</span>
              </span>
            </Link>

            <p className="mf-footer__blurb">
              One quiet lost-property desk for metro, railway and bus. A private record follows
              every item from the platform to the right hands.
            </p>

            <DelhiClock />
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title} className="mf-footer__col">
              <p className="mf-footer__col-title">{column.title}</p>
              <ul className="mf-footer__links">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link href={link.href} className="mf-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mf-footer__signoff">
          <p className="mf-footer__giant" aria-hidden>
            MyFinds<b>.</b>
          </p>
        </div>

        <div className="mf-footer__bottom">
          <p className="mf-footer__copyright">
            © {new Date().getFullYear()} MyFinds
            <span aria-hidden>·</span>
            Built for Delhi-NCR metro, railway and bus.
          </p>
          <span className="mf-footer__legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/help">Help</Link>
          </span>
          <a href="#top" className="mf-footer__top-link">
            Back to top
            <ArrowUp size={11} strokeWidth={2} aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}
