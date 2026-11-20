import { KeyRound, LockKeyhole, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";

import Reveal from "./reveal";

export default function FinalCta() {
  return (
    <section className="mf-cta" aria-labelledby="cta-title">
      <div className="mf-shell mf-cta__inner">
        <div className="mf-cta__route" aria-hidden>
          METRO <span /> RAIL <span /> BUS <i /> NCR
        </div>

        <Reveal>
          <span className="mf-cta__kicker">
            <KeyRound size={11} strokeWidth={1.9} aria-hidden />
            The search starts with a record
          </span>

          <h2 id="cta-title" className="mf-cta__title">
            Lost something?
            <br />
            Start the <em>record.</em>
          </h2>

          <p className="mf-cta__copy">
            It takes about two minutes. If the item turns up — today, or three weeks from now — the
            match has somewhere to land, and a safe way to get back to you.
          </p>

          <div className="mf-cta__actions">
            <Link className="mf-btn mf-btn--primary" href="/report/lost">
              <Search size={17} strokeWidth={1.9} aria-hidden />
              Report a lost item
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/report/found">
              <Plus size={17} strokeWidth={1.9} aria-hidden />
              I found something
            </Link>
          </div>

          <p className="mf-cta__meta">
            <span>
              <LockKeyhole size={11} strokeWidth={1.9} aria-hidden />
              Free to report
            </span>
            <span>Private by default</span>
            <span>Delhi-NCR metro, rail &amp; bus</span>
            <span>
              <UserRound size={11} strokeWidth={1.9} aria-hidden />
              Staff accounts by admin
            </span>
          </p>
        </Reveal>

        <span className="mf-cta__code" aria-hidden>
          482 916
        </span>
      </div>
    </section>
  );
}
