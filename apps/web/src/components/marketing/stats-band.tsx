"use client";

import { ArrowRight, CircleDot, MapPinned, Route, TrainFront } from "lucide-react";

import { Count } from "../stageshow/kit";
import { useInView } from "./reveal";

const OPERATORS = [
  { name: "Delhi Metro", code: "DMRC", count: 324, icon: <TrainFront size={14} strokeWidth={1.7} aria-hidden /> },
  { name: "Indian Railways", code: "IR", count: 6, icon: <Route size={14} strokeWidth={1.7} aria-hidden /> },
  { name: "Delhi Transport", code: "DTC", count: 6, icon: <MapPinned size={14} strokeWidth={1.7} aria-hidden /> },
  { name: "Interstate buses", code: "ISBT", count: 3, icon: <CircleDot size={14} strokeWidth={1.7} aria-hidden /> },
];

export default function StatsBand() {
  const [ref, seen] = useInView<HTMLElement>(0.2);

  return (
    <section ref={ref} id="coverage" aria-labelledby="coverage-title" className="mf-stats">
      <div className="mf-shell">
        <div className="mf-stats__top">
          <div className="mf-stats__intro">
            <p className="mf-eyebrow mf-eyebrow--light">Coverage</p>
            <h2 id="coverage-title">
              One desk for
              <br />
              the whole <em>NCR.</em>
            </h2>
            <p>
              Metro platforms, railway coaches, bus stands and interstate terminals. One directory,
              one report, one place to check back.
            </p>
            <a className="mf-stats__link" href="#how-it-works">
              See how a report travels
              <ArrowRight size={14} strokeWidth={1.8} aria-hidden />
            </a>
          </div>

          <dl className="mf-stats__figures">
            <div>
              <dd>
                <Count value={seen ? 339 : 0} duration={1100} />
              </dd>
              <dt>places indexed</dt>
              <p>Metro, rail and bus</p>
            </div>
            <div>
              <dd>
                <Count value={seen ? 913 : 0} duration={1300} />
              </dd>
              <dt>items returned</dt>
              <p>Demo activity</p>
            </div>
            <div>
              <dd>
                <Count value={seen ? 71 : 0} duration={1500} />
                <span className="mf-stats__unit">%</span>
              </dd>
              <dt>return rate</dt>
              <p>Demo activity</p>
            </div>
          </dl>
        </div>

        <div className="mf-operators">
          {OPERATORS.map((operator) => (
            <div key={operator.code} className="mf-operator">
              <span className="mf-operator__icon">{operator.icon}</span>
              <span className="mf-operator__name">
                <b>{operator.name}</b>
                <em>{operator.code}</em>
              </span>
              <span className="mf-operator__count">
                <Count value={seen ? operator.count : 0} duration={1200} />
              </span>
            </div>
          ))}
        </div>

        <p className="mf-stats__note">
          Directory counts from the live places list. Activity figures are sample data from the
          demo seed, not a public claim.
        </p>
      </div>
    </section>
  );
}
