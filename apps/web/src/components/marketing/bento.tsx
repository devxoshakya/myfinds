"use client";

import {
  ArrowRight,
  Backpack,
  Building2,
  Check,
  Clock3,
  KeyRound,
  LockKeyhole,
  MapPin,
  PackageSearch,
  ShieldCheck,
  User,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { Bar, Connector, Count, Meter, Row, Stage, Text, Window, type Act } from "../stageshow/kit";
import Reveal, { useInView } from "./reveal";
import "./bento.css";

type Beat = { on: boolean };
const before: Beat = { on: false };
const after: Beat = { on: true };

const TOKENS = {
  "--ss-canvas": "#ece8de",
  "--ss-well": "#ece8de",
  "--ss-surface": "#fffefa",
  "--ss-chrome": "#fffefa",
  "--ss-line": "rgba(17, 17, 17, 0.11)",
  "--ss-line-faint": "rgba(17, 17, 17, 0.06)",
  "--ss-text": "#6b675e",
  "--ss-text-strong": "#111111",
  "--ss-text-faint": "#9a958a",
  "--ss-icon": "#6b675e",
  "--ss-icon-faint": "#b8b2a5",
  "--ss-ink-5": "#1a1a1a",
  "--ss-accent": "#111111",
  "--ss-accent-soft": "rgba(17, 17, 17, 0.08)",
  "--ss-success": "#0b7a43",
  "--ss-success-soft": "rgba(11, 122, 67, 0.12)",
  "--ss-success-text": "#0b7a43",
  "--ss-font": "var(--font-inter)",
  "--ss-mono": "var(--font-jetbrains-mono)",
  "--ss-radius-sm": "2px",
  "--ss-radius-md": "4px",
  "--ss-radius-lg": "7px",
  "--ss-radius-window": "10px",
} as const;

function usePictureWidth(initial = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => setWidth(Math.max(1, node.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/* ------------------------------------------------------------------ */
/* The hero tile: two reports, one match, checked side by side.        */
/* ------------------------------------------------------------------ */

async function matchBeat(a: Act<Beat>) {
  await a.wait(400);
  await a.set({ on: true });
  await a.wait(3000);
}

const MATCH_ROWS = [
  {
    id: "row-1",
    name: "Brown leather satchel",
    place: "Kashmere Gate Metro · 12 Oct",
    score: 92,
    selected: true,
    icon: <Backpack size={17} strokeWidth={1.6} aria-hidden />,
  },
  {
    id: "row-2",
    name: "Black laptop sleeve",
    place: "Rajiv Chowk Metro · 13 Oct",
    score: 71,
    selected: false,
    icon: <PackageSearch size={17} strokeWidth={1.6} aria-hidden />,
  },
];

function MatchLedger({ on }: { on: boolean }) {
  return (
    <div className="mfb-ledger">
      <div className="mfb-ledger__bar">
        <span className="mfb-ledger__filters">
          <span data-on>Best</span>
          <span>Metro</span>
          <span>Rail</span>
        </span>
        <span className="mfb-ledger__sort">
          <Clock3 size={10} strokeWidth={1.8} aria-hidden />
          Newest
        </span>
      </div>

      <div className="mfb-ledger__list">
        {MATCH_ROWS.map((row) => (
          <Row
            key={row.id}
            pad={10}
            selected={row.selected}
            className="mfb-row"
            lead={<span className="mfb-row__icon">{row.icon}</span>}
            title={<Text className="mfb-row__name">{row.name}</Text>}
            meta={
              <span className="mfb-row__score">
                <Count value={on ? row.score : 0} duration={900} />
                <span>%</span>
              </span>
            }
            subtitle={
              <span className="mfb-row__under">
                <Text className="mfb-row__place">{row.place}</Text>
                <span className="mfb-row__meter">
                  <Meter value={on ? row.score / 100 : 0.03} tone="ink" />
                </span>
              </span>
            }
          />
        ))}

        <Row
          pad={10}
          className="mfb-row mfb-row--filler"
          lead={<Bar w={30} h={30} r={4} tone={2} />}
          title={<Bar w={112} h={6} tone={3} />}
          meta={<Bar w={28} h={7} tone={2} />}
          subtitle={
            <span className="mfb-row__under">
              <Bar w={92} h={5} tone={2} />
              <span className="mfb-row__meter">
                <Bar w={74} h={3} r={2} tone={2} />
              </span>
            </span>
          }
        />
      </div>

      <div className="mfb-ledger__foot">
        <span>
          <ShieldCheck size={11} strokeWidth={1.8} aria-hidden />
          Details stay private until a claim is approved
        </span>
        <span className="mfb-ledger__review">
          Review
          <ArrowRight size={11} strokeWidth={1.9} aria-hidden />
        </span>
      </div>
    </div>
  );
}

function MatchTile() {
  const [picture, width] = usePictureWidth();
  const compact = width < 620;

  return (
    <section className="mf-tile mf-tile--hero" data-crop>
      <p className="mf-tile__copy">
        <b>A match you can check.</b> Place, time and details sit side by side before anything
        moves.
      </p>
      <div ref={picture} className="mf-tile__picture mf-tile__picture--hero">
        <Stage<Beat>
          width={width}
          height={compact ? 320 : 330}
          compact={{ below: 620, width, height: 320 }}
          initial={before}
          poster={after}
          play="once"
          script={matchBeat}
          tokens={TOKENS}
          fidelity="realistic"
          className="mfb-stage"
        >
          {(s) => (
            <Window
              title="Possible matches"
              className="mfb-window"
              style={{
                position: "absolute",
                top: 12,
                left: 16,
                width: width - 32,
                height: compact ? 296 : 306,
              }}
              body={{ "data-crop": "", className: "mfb-window__body" }}
            >
              <MatchLedger on={s.on} />
            </Window>
          )}
        </Stage>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The statement tile.                                                 */
/* ------------------------------------------------------------------ */

function StatementTile() {
  return (
    <section className="mf-tile mf-tile--statement">
      <span className="mf-tile__stamp">
        <LockKeyhole size={13} strokeWidth={1.8} aria-hidden />
        Sealed
      </span>
      <p className="mf-statement">
        Nothing moves until the <em>owner</em> is verified.
      </p>
      <p className="mf-tile__small">
        The finder never sees your phone number or email. Not before approval, not after a
        handover.
      </p>
      <span className="mf-tile__rule" aria-hidden />
      <span className="mf-statement__foot">
        <span>01</span>
        Privacy is a setting we cannot turn off.
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The handover code tile.                                             */
/* ------------------------------------------------------------------ */

function CodeTile() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);

  return (
    <section className="mf-tile mf-tile--code">
      <p className="mf-tile__copy">
        <b>One code. One handover.</b> Reissuing it kills the old one instantly.
      </p>
      <div ref={ref} className="mf-code" data-visible={seen || undefined}>
        <div className="mf-code__row mf-code__row--dead">
          <span className="mf-code__num">591 204</span>
          <span className="mf-code__state">Void</span>
        </div>
        <div className="mf-code__row mf-code__row--live">
          <span className="mf-code__num">482 916</span>
          <span className="mf-code__state">
            <span className="mf-code__dot" aria-hidden />
            Active
          </span>
        </div>
        <div className="mf-code__meta">
          <span>
            <KeyRound size={11} strokeWidth={1.8} aria-hidden />
            6 digits
          </span>
          <span>48 hours</span>
          <span>Single use</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The custody tile.                                                   */
/* ------------------------------------------------------------------ */

const NODES = [
  { id: "finder", label: "Finder", meta: "Holds the item", icon: <User size={17} strokeWidth={1.6} aria-hidden /> },
  { id: "station", label: "Station", meta: "Logs receipt", icon: <Building2 size={17} strokeWidth={1.6} aria-hidden /> },
  { id: "owner", label: "Owner", meta: "Shows the code", icon: <KeyRound size={17} strokeWidth={1.6} aria-hidden /> },
];

async function custodyBeat(a: Act<Beat>) {
  await a.wait(300);
  await a.set({ on: true });
  await a.wait(2800);
}

function CustodyTile() {
  const [picture, width] = usePictureWidth();

  return (
    <section className="mf-tile mf-tile--custody">
      <p className="mf-tile__copy">
        <b>Custody is visible the whole way.</b> Every move is logged, from the platform to the
        counter.
      </p>
      <div ref={picture} className="mf-tile__picture mf-tile__picture--custody">
        <Stage<Beat>
          width={width}
          height={190}
          initial={before}
          poster={after}
          play="once"
          script={custodyBeat}
          tokens={TOKENS}
          className="mfc-stage"
        >
          {(s, rect) => {
            const points = (name: string) => {
              const r = rect(name);
              return {
                left: { x: r.x, y: r.y + r.height / 2 },
                right: { x: r.x + r.width, y: r.y + r.height / 2 },
              };
            };
            const finder = points("finder-icon");
            const station = points("station-icon");
            const owner = points("owner-icon");
            const placed = finder.right.x > 0 && station.left.x > 0 && owner.left.x > 0;
            return (
              <>
                <div className="mfc-track">
                  {NODES.map((node) => (
                    <div key={node.id} className="mfc-node" data-target={node.id}>
                      <span
                        className="mfc-node__icon"
                        data-target={`${node.id}-icon`}
                      >
                        {node.icon}
                      </span>
                      <span className="mfc-node__label">{node.label}</span>
                      <span className="mfc-node__meta">{node.meta}</span>
                    </div>
                  ))}
                </div>
                {placed && (
                  <>
                    <Connector
                      from={finder.right}
                      to={station.left}
                      route="h"
                      show={s.on}
                      dots="none"
                      arrow
                      className="mfc-connector"
                    />
                    <Connector
                      from={station.right}
                      to={owner.left}
                      route="h"
                      show={s.on}
                      dots="none"
                      arrow
                      className="mfc-connector"
                    />
                  </>
                )}
                <span className="mfc-code-chip" data-on={s.on || undefined}>
                  <KeyRound size={10} strokeWidth={1.9} aria-hidden />
                  6-digit code
                </span>
              </>
            );
          }}
        </Stage>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The owner question tile.                                            */
/* ------------------------------------------------------------------ */

function QuestionTile() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);

  return (
    <section className="mf-tile mf-tile--question">
      <p className="mf-tile__copy">
        <b>A question only the owner can answer.</b> The finder decides; the system only shows a
        hint.
      </p>
      <div ref={ref} className="mf-question" data-visible={seen || undefined}>
        <span className="mf-question__kicker">
          <LockKeyhole size={10} strokeWidth={1.8} aria-hidden />
          Owner verification
        </span>
        <p className="mf-question__ask">What is on the lock screen?</p>
        <div className="mf-question__answer">
          <span>Miso, our dog</span>
          <span className="mf-question__check">
            <Check size={11} strokeWidth={2.5} aria-hidden />
          </span>
        </div>
        <div className="mf-question__verdict">
          <span className="mf-question__dot" aria-hidden />
          Matches the finder&apos;s note
        </div>
        <div className="mf-question__foot">
          <span>Attempt 1 of 3</span>
          <span>Answer hidden from claimants</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export default function BentoSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="mf-section mf-bento-section">
      <div className="mf-shell">
        <Reveal className="mf-section-head">
          <p className="mf-eyebrow">Built for the handover</p>
          <h2 id="features-title">
            Not a notice board.
            <br />
            A chain of <em>custody.</em>
          </h2>
          <p className="mf-section-lede">
            Search is the easy part. MyFinds is designed around the moment an item changes hands —
            who holds it, who proved it, and who watched it happen.
          </p>
        </Reveal>

        <div className="mf-bento">
          <Reveal className="mf-bento__hero" delay={40}>
            <MatchTile />
          </Reveal>
          <Reveal delay={90}>
            <StatementTile />
          </Reveal>
          <Reveal delay={130}>
            <CodeTile />
          </Reveal>
          <Reveal delay={170}>
            <CustodyTile />
          </Reveal>
          <Reveal delay={210}>
            <QuestionTile />
          </Reveal>
        </div>

        <Reveal className="mf-bento__foot" delay={250}>
          <span>
            <MapPin size={13} strokeWidth={1.8} aria-hidden />
            Every report carries a station, a timestamp and a holder.
          </span>
          <a href="#how-it-works" className="mf-text-link">
            See the four-step loop
            <ArrowRight size={13} strokeWidth={1.9} aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
