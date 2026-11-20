import {
  ArrowRight,
  ClipboardList,
  KeyRound,
  LockKeyhole,
  ScanEye,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import Reveal from "./reveal";

const POINTS = [
  {
    number: "01",
    title: "Private contact data",
    copy: "Your phone number and email are never public. Even a finder sees them only after your claim has been approved.",
  },
  {
    number: "02",
    title: "One-time handover code",
    copy: "Six digits, single use, 48 hours. Reissuing a code kills the previous one instantly, so an old screenshot cannot open a handover.",
  },
  {
    number: "03",
    title: "Audited custody chain",
    copy: "Every report, verification and transfer is logged with a time and a holder. Staff see the whole trail; you see your own.",
  },
];

const LEDGER = [
  { label: "Contact details", value: "Sealed", icon: LockKeyhole, sealed: true },
  { label: "Handover code", value: "482 916", icon: KeyRound },
  { label: "Custody log", value: "14 entries", icon: ClipboardList },
  { label: "Item photos", value: "Matched owners", icon: ScanEye },
];

export default function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="mf-section">
      <div className="mf-shell mf-trust__grid">
        <Reveal className="mf-trust__intro">
          <p className="mf-eyebrow">Privacy &amp; integrity</p>
          <h2 id="trust-title">
            Private by default.
            <br />
            Not by a <em>setting.</em>
          </h2>
          <p>
            Lost items carry more than value. MyFinds is built so a stranger never learns who you
            are, where you live, or what was inside the bag.
          </p>

          <div className="mf-trust__card" aria-label="Example privacy record">
            <div className="mf-trust__card-head">
              <span>Report MF-1042</span>
              <span>
                <ShieldCheck size={10} strokeWidth={2} aria-hidden />
                Sealed
              </span>
            </div>
            {LEDGER.map(({ label, value, icon: Icon, sealed }) => (
              <div key={label} className="mf-trust__row">
                <span>{label}</span>
                <span data-sealed={sealed || undefined}>
                  <Icon size={11} strokeWidth={1.8} aria-hidden />
                  {value}
                </span>
              </div>
            ))}
          </div>

          <Link className="mf-faq__contact" href="/privacy">
            Read the privacy note
            <ArrowRight size={13} strokeWidth={1.9} aria-hidden />
          </Link>
        </Reveal>

        <Reveal as="ul" className="mf-trust__list" delay={100}>
          {POINTS.map(({ number, title, copy }) => (
            <li key={number} className="mf-trust__item">
              <span className="mf-trust__num">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </li>
          ))}
          <li className="mf-trust__item">
            <span className="mf-trust__num">04</span>
            <h3>Nothing public to browse</h3>
            <p>
              There is no public gallery of found items. A report is visible only to the people
              connected to it, and to the staff handling custody.
            </p>
          </li>
        </Reveal>
      </div>
    </section>
  );
}
