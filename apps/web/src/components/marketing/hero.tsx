import { LockKeyhole, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import HeroDemo from "./hero-demo";
import RouteMarquee from "./route-marquee";

export default function Hero() {
  return (
    <section className="mf-hero" aria-labelledby="hero-title">
      <div className="mf-shell mf-hero__grid">
        <div className="mf-hero__copy">
          <p className="mf-eyebrow">Delhi-NCR transit lost &amp; found</p>

          <h1 id="hero-title" className="mf-hero__title">
            <span>Lost it.</span>
            <span>
              <em>Found it.</em>
            </span>
            <span>Matched.</span>
          </h1>

          <p className="mf-hero__lede">
            Report a lost or found item at any metro, railway, or bus station.{" "}
            <strong>One private record</strong> follows it from the platform to the counter — and
            into the right hands.
          </p>

          <div className="mf-hero__actions">
            <Link className="mf-btn mf-btn--primary" href="/report/lost">
              <Search size={17} strokeWidth={1.9} aria-hidden />
              I lost something
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/report/found">
              <Plus size={17} strokeWidth={1.9} aria-hidden />
              I found something
            </Link>
          </div>

          <p className="mf-hero__staff">
            <Link href="/login">Station staff? Log in</Link>
            <span>Staff accounts are created by an admin.</span>
          </p>

          <dl className="mf-hero__facts">
            <div className="mf-hero__fact">
              <dt>339 places</dt>
              <dd>Metro, rail and bus</dd>
            </div>
            <div className="mf-hero__fact">
              <dt>One record</dt>
              <dd>From report to return</dd>
            </div>
            <div className="mf-hero__fact">
              <dt>6-digit code</dt>
              <dd>Single use, 48 hours</dd>
            </div>
          </dl>
        </div>

        <div className="mf-hero__demo">
          <div className="mf-hero__demo-label">
            <span>
              <span className="mf-live-dot" aria-hidden />
              What the owner sees
            </span>
            <span>MF-1042</span>
          </div>

          <div className="mf-hero__frame">
            <HeroDemo />
          </div>

          <div className="mf-hero__demo-meta">
            <span>
              <LockKeyhole size={12} strokeWidth={1.8} aria-hidden />
              Contact details stay sealed
            </span>
            <span>
              <ShieldCheck size={12} strokeWidth={1.8} aria-hidden />
              Every handover logged
            </span>
            <span className="mf-hero__demo-flow">Match → verify → collect</span>
          </div>
        </div>
      </div>

      <RouteMarquee />
    </section>
  );
}
