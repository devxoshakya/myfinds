import {
  ArrowRight,
  Camera,
  Clock3,
  FilePlus,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import Reveal from "./reveal";

const STEPS = [
  {
    number: "01",
    title: "Report",
    copy: "Add the item, the station, the time, and a photo if you have one. A found report can be filed by anyone — or logged at a station counter.",
    meta: "About 2 minutes, photo optional",
    metaIcon: Camera,
    icon: FilePlus,
  },
  {
    number: "02",
    title: "Match",
    copy: "The moment a record lands, MyFinds compares place, time, and details. It keeps looking every day until the report closes.",
    meta: "Re-checked every day",
    metaIcon: RefreshCw,
    icon: Search,
  },
  {
    number: "03",
    title: "Verify",
    copy: "A claimant answers a private question only the real owner could know. Contact details stay sealed until that answer passes.",
    meta: "Private answer, 3 attempts",
    metaIcon: LockKeyhole,
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Collect",
    copy: "The verified owner shows a six-digit handover code at the counter, or to the finder. One code, one handover, time-stamped.",
    meta: "Code expires in 48 hours",
    metaIcon: Clock3,
    icon: KeyRound,
  },
] as const;

export default function StepLoop() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mf-section">
      <div className="mf-shell">
        <Reveal className="mf-section-head">
          <p className="mf-eyebrow">How it works</p>
          <h2 id="how-title">
            Four steps from
            <br />
            loss to <em>return.</em>
          </h2>
          <p className="mf-section-lede">
            Not a public notice board. A quiet, private loop between the person who lost
            something, the person who found it, and the station holding it.
          </p>
        </Reveal>

        <ol className="mf-loop__grid">
          {STEPS.map(({ number, title, copy, meta, metaIcon: MetaIcon, icon: Icon }, index) => (
            <Reveal key={number} as="li" className="mf-step" delay={index * 70}>
              <span className="mf-step__dot">
                <Icon size={18} strokeWidth={1.7} aria-hidden />
              </span>
              <span className="mf-step__num">{number}</span>
              <h3 className="mf-step__title">{title}</h3>
              <p className="mf-step__copy">{copy}</p>
              <p className="mf-step__meta">
                <MetaIcon size={11} strokeWidth={1.8} aria-hidden />
                {meta}
              </p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mf-bento__foot" delay={120}>
          <span>
            <Camera size={13} strokeWidth={1.8} aria-hidden />
            Photos are shown only to the person whose claim matches.
          </span>
          <a href="#features" className="mf-text-link">
            See what happens at handover
            <ArrowRight size={13} strokeWidth={1.9} aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
