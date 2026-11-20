import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import Reveal from "./reveal";

const QUESTIONS = [
  {
    q: "Is there a fee to report a lost item?",
    a: "No. Reporting, matching and claiming are free. MyFinds never asks for payment to release an item, and station staff will never ask for one either.",
  },
  {
    q: "Who can see my contact details?",
    a: "Not the public, and not a finder by default. Your contact details are released only after a claim is approved, and only to the person holding your item so the handover can happen.",
  },
  {
    q: "How does the handover code work?",
    a: "Once your claim is verified, you get a six-digit code. It is single use and expires after 48 hours. If you reissue it, the old code stops working immediately.",
  },
  {
    q: "Can I browse found items?",
    a: "No. A public gallery would expose photos, descriptions and station details to anyone. Instead, MyFinds checks every report privately and shows you only the plausible matches.",
  },
  {
    q: "Which stations are covered?",
    a: "339 places across Delhi-NCR: Delhi Metro stations, Indian Railways terminals, DTC stops and interstate bus terminals. The directory is checked against the operators' own lists.",
  },
  {
    q: "I found something valuable. What should I do?",
    a: "Hand it to the station counter if you can — valuables are safest in staff custody. If you keep it, report it and hold it safely until a verified owner claims it with a code.",
  },
];

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mf-section">
      <div className="mf-shell mf-faq__grid">
        <Reveal className="mf-faq__aside">
          <p className="mf-eyebrow">Questions</p>
          <h2 id="faq-title">
            Before you
            <br />
            <em>ask.</em>
          </h2>
          <p>
            The short answers. If something is still unclear, the help page walks through every
            step and every status.
          </p>
          <Link className="mf-faq__contact" href="/help">
            Open help
            <ArrowRight size={13} strokeWidth={1.9} aria-hidden />
          </Link>
        </Reveal>

        <div className="mf-faq__list">
          {QUESTIONS.map(({ q, a }, index) => (
            <Reveal key={q} className="mf-faq__item" delay={index * 45}>
              <details>
                <summary className="mf-faq__q">
                  {q}
                  <span className="mf-faq__icon" aria-hidden>
                    <Plus size={13} strokeWidth={2} />
                  </span>
                </summary>
                <div className="mf-faq__a">{a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>

    </section>
  );
}
