import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Clock3,
  KeyRound,
  LockKeyhole,
  Store,
  UserRound,
} from "lucide-react";

import Reveal from "./reveal";

const PATHS = [
  {
    kicker: "Finder keeps custody",
    icon: UserRound,
    title: "Keep it, and hand it back yourself.",
    copy: "Hold the item somewhere safe. When the owner's claim is verified, you meet with a single-use code and hand it over. You never see their phone number or email.",
    nodes: [
      { label: "Finder", icon: UserRound },
      { label: "Code", icon: KeyRound, signal: true },
      { label: "Owner", icon: UserRound },
    ],
    foot: "Contact details unlock only after approval.",
    tone: "dark" as const,
  },
  {
    kicker: "Station takes custody",
    icon: Building2,
    title: "Or leave it at the counter.",
    copy: "Hand the item to station staff and they take over. The counter logs the receipt, stores it, and releases it to a verified owner during counter hours.",
    nodes: [
      { label: "Drop-off", icon: Store },
      { label: "Station", icon: Building2, signal: true },
      { label: "Claim desk", icon: ClipboardCheck },
    ],
    foot: "Every receipt and transfer is time-stamped.",
    tone: "light" as const,
  },
];

export default function ReturnPaths() {
  return (
    <section id="return" aria-labelledby="return-title" className="mf-section">
      <div className="mf-shell">
        <Reveal className="mf-section-head">
          <p className="mf-eyebrow">For finders</p>
          <h2 id="return-title">
            Two ways to return.
            <br />
            One chain of <em>custody.</em>
          </h2>
          <p className="mf-section-lede">
            You decide what happens after you report it. Either way, the item stays tracked — and
            the owner still has to prove it is theirs.
          </p>
        </Reveal>

        <div className="mf-paths__grid">
          {PATHS.map(({ kicker, icon: KickerIcon, title, copy, nodes, foot, tone }, index) => (
            <Reveal
              key={title}
              as="article"
              className={`mf-path${tone === "dark" ? " mf-path--dark" : ""}`}
              delay={index * 90}
            >
              <span className="mf-path__kicker">
                <KickerIcon size={11} strokeWidth={1.8} aria-hidden />
                {kicker}
              </span>
              <h3 className="mf-path__title">{title}</h3>
              <p className="mf-path__copy">{copy}</p>

              <div className="mf-path__flow" aria-hidden>
                {nodes.map(({ label, icon: NodeIcon, signal }, nodeIndex) => (
                  <span key={label} className="mf-path__step">
                    <span className={`mf-path__node${signal ? " mf-path__node--signal" : ""}`}>
                      <NodeIcon size={11} strokeWidth={1.8} />
                      {label}
                    </span>
                    {nodeIndex < nodes.length - 1 && (
                      <ArrowRight className="mf-path__arrow" size={14} strokeWidth={1.8} />
                    )}
                  </span>
                ))}
              </div>

              <p className="mf-path__foot">
                {tone === "dark" ? (
                  <LockKeyhole size={12} strokeWidth={1.8} aria-hidden />
                ) : (
                  <Clock3 size={12} strokeWidth={1.8} aria-hidden />
                )}
                {foot}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
