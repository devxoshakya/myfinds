"use client";

import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  KeyRound,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import { Button, Field, Stage, Window, type Act } from "../stageshow/kit";
import "./hero-demo.css";

/*
  The hero's case file: a lost phone, its match, the owner's private question,
  and the one-time code that ends the search. One scripted loop that plays once
  and holds on the code, so the still is the payoff.
*/

type Scene = {
  claimOpen: boolean;
  focused: boolean;
  answer: string;
  verified: boolean;
};

const initial: Scene = {
  claimOpen: false,
  focused: false,
  answer: "",
  verified: false,
};

const poster: Scene = { ...initial, verified: true };

const REST = {
  wide: { x: 714, y: 424 },
  compact: { x: 330, y: 398 },
};

const TOKENS = {
  "--ss-canvas": "#ece8de",
  "--ss-well": "#ece8de",
  "--ss-surface": "#fffefa",
  "--ss-chrome": "#fffefa",
  "--ss-raised": "#fffefa",
  "--ss-line": "rgba(17, 17, 17, 0.11)",
  "--ss-line-faint": "rgba(17, 17, 17, 0.065)",
  "--ss-text": "#6b675e",
  "--ss-text-strong": "#111111",
  "--ss-text-faint": "#9a958a",
  "--ss-icon": "#6b675e",
  "--ss-icon-faint": "#b8b2a5",
  "--ss-accent": "#111111",
  "--ss-accent-soft": "rgba(17, 17, 17, 0.08)",
  "--ss-success": "#0b7a43",
  "--ss-success-soft": "rgba(11, 122, 67, 0.12)",
  "--ss-success-text": "#0b7a43",
  "--ss-warning-soft": "rgba(201, 149, 11, 0.14)",
  "--ss-warning-text": "#8a6500",
  "--ss-font": "var(--font-inter)",
  "--ss-mono": "var(--font-jetbrains-mono)",
  "--ss-radius-sm": "2px",
  "--ss-radius-md": "4px",
  "--ss-radius-lg": "7px",
  "--ss-radius-window": "10px",
} as const;

async function play(a: Act<Scene>) {
  await a.wait(900);

  await a.move("claim", { duration: 850 });
  await a.wait(350);
  await a.click("claim");
  await a.set({ claimOpen: true });
  await a.wait(520);

  await a.click("answer");
  await a.set({ focused: true });
  await a.wait(260);
  await a.type("answer", "Miso, our dog", { interval: 52 });
  await a.wait(420);

  await a.click("submit");
  await a.set({ claimOpen: false, focused: false, answer: "", verified: true });
  await a.wait(1900);

  await a.move("rest", { duration: 900 });
  await a.wait(3000);
}

function CodeCard({ compact }: { compact?: boolean }) {
  return (
    <div className="mfh-code" data-compact={compact || undefined}>
      <div className="mfh-code__head">
        <span className="mfh-code__label">
          <KeyRound size={11} strokeWidth={1.8} aria-hidden />
          One-time handover code
        </span>
        <span className="mfh-code__live">
          <span aria-hidden />
          Active
        </span>
      </div>
      <div className="mfh-code__digits">
        482 <span>916</span>
      </div>
      <div className="mfh-code__foot">
        <span>Expires in 47h 58m</span>
        <span>Single use</span>
      </div>
    </div>
  );
}

function CustodySteps({ verified }: { verified: boolean }) {
  return (
    <ol className="mfh-steps">
      <li data-done>
        <span className="mfh-steps__dot">
          <Check size={8} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="mfh-steps__text">
          <b>Report filed</b>
          <em>12 Oct, 6:44 pm</em>
        </span>
      </li>
      <li data-done>
        <span className="mfh-steps__dot">
          <Check size={8} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="mfh-steps__text">
          <b>Item matched</b>
          <em>92% · 7:02 pm</em>
        </span>
      </li>
      <li data-done={verified || undefined} data-current={!verified || undefined}>
        <span className="mfh-steps__dot">
          {verified ? <Check size={8} strokeWidth={2.4} aria-hidden /> : <span className="mfh-steps__ring" />}
        </span>
        <span className="mfh-steps__text">
          <b>Owner verified</b>
          <em>{verified ? "Approved · 7:18 pm" : "Waiting on you"}</em>
        </span>
      </li>
      <li data-current={verified || undefined}>
        <span className="mfh-steps__dot">
          <span className="mfh-steps__ring" />
        </span>
        <span className="mfh-steps__text">
          <b>Handover</b>
          <em>{verified ? "At the station counter" : "After approval"}</em>
        </span>
      </li>
    </ol>
  );
}

export default function HeroDemo() {
  return (
    <Stage<Scene>
      width={760}
      height={470}
      compact={{ below: 560, width: 358, height: 430 }}
      initial={initial}
      poster={poster}
      script={play}
      play="once"
      fidelity="realistic"
      cursor={{ at: REST, kind: "pointer", idle: 2600 }}
      tokens={TOKENS}
      className="mfh-stage"
    >
      {(s, _rect, layout) => {
        const compact = layout === "compact";

        return (
          <>
            <span className="mfh-field" aria-hidden />

            <Window
              url="myfinds.local/reports/MF-1042"
              nav
              className="mfh-window"
              body={{ className: "mfh-window__body", "data-crop": "" }}
            >
              <div className="mfh-app">
                <div className="mfh-crumbs">
                  <span>My reports</span>
                  <ChevronRight size={10} strokeWidth={1.7} aria-hidden />
                  <span>MF-1042</span>
                  <span className="mfh-crumbs__private">
                    <LockKeyhole size={10} strokeWidth={1.8} aria-hidden />
                    Private
                  </span>
                </div>

                <div className="mfh-body" data-compact={compact || undefined}>
                  <main className="mfh-main">
                    <div className="mfh-head">
                      <span className="mfh-item-icon">
                        <Smartphone size={18} strokeWidth={1.6} aria-hidden />
                      </span>
                      <div className="mfh-head__text">
                        <span className="mfh-kicker">Lost report · MF-1042</span>
                        <span className="mfh-title">Blue iPhone 15</span>
                        <span className="mfh-sub">
                          <MapPin size={10} strokeWidth={1.8} aria-hidden />
                          Rajiv Chowk Metro · 12 Oct, 6:40 pm
                        </span>
                      </div>
                      <span className="mfh-status" data-state={s.verified ? "verified" : "matched"}>
                        <span className="mfh-status__dot" aria-hidden />
                        {s.verified ? "Verified" : "Match found"}
                      </span>
                    </div>

                    {!s.verified ? (
                      <>
                        <div className="mfh-match">
                          <div className="mfh-match__head">
                            <span className="mfh-match__label">Possible match</span>
                            <span className="mfh-score">
                              92<span>%</span>
                            </span>
                          </div>

                          <div className="mfh-match__item">
                            <span className="mfh-found-icon">
                              <Smartphone size={16} strokeWidth={1.6} aria-hidden />
                            </span>
                            <span className="mfh-match__item-text">
                              <span className="mfh-found-title">Blue iPhone 15</span>
                              <span className="mfh-found-meta">Found 18 min later · Platform 3</span>
                            </span>
                            <ChevronRight size={13} strokeWidth={1.7} aria-hidden />
                          </div>

                          <div className="mfh-match__facts">
                            <span>
                              <Building2 size={11} strokeWidth={1.8} aria-hidden />
                              Held at Rajiv Chowk Metro
                            </span>
                            <span>
                              <Clock3 size={11} strokeWidth={1.8} aria-hidden />
                              Counter 06:00–23:00
                            </span>
                          </div>

                          <div className="mfh-reasons">
                            <div>
                              <span>Place</span>
                              <span className="mfh-meter">
                                <i style={{ width: "100%" }} />
                              </span>
                            </div>
                            <div>
                              <span>Details</span>
                              <span className="mfh-meter">
                                <i style={{ width: "88%" }} />
                              </span>
                            </div>
                            <div>
                              <span>Date</span>
                              <span className="mfh-meter">
                                <i style={{ width: "96%" }} />
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="large"
                          icon={<ArrowRight size={13} strokeWidth={1.9} aria-hidden />}
                          data-target="claim"
                          className="mfh-claim"
                        >
                          This is mine
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="mfh-verified">
                          <span className="mfh-verified__badge">
                            <Check size={10} strokeWidth={2.4} aria-hidden />
                            Claim verified
                          </span>
                          <span className="mfh-verified__title">
                            Your item is ready at Rajiv Chowk Metro.
                          </span>
                          <span className="mfh-verified__copy">
                            Bring a government ID and show the one-time code. Contact details stay
                            private.
                          </span>
                          <div className="mfh-verified__row">
                            <span>
                              <Clock3 size={11} strokeWidth={1.8} aria-hidden />
                              06:00–23:00
                            </span>
                            <span>
                              <MapPin size={11} strokeWidth={1.8} aria-hidden />
                              Counter 4
                            </span>
                          </div>
                          {compact && <CodeCard compact />}
                        </div>

                        {!compact && (
                          <div className="mfh-record">
                            <div className="mfh-record__head">
                              <span>Report details</span>
                              <span>Sealed to you</span>
                            </div>
                            <div className="mfh-record__row">
                              <span>Colour</span>
                              <b>Blue</b>
                            </div>
                            <div className="mfh-record__row">
                              <span>Case</span>
                              <b>Clear silicone</b>
                            </div>
                            <div className="mfh-record__row">
                              <span>Photos</span>
                              <b>2 attached</b>
                            </div>
                          </div>
                        )}

                        <span className="mfh-verified__foot">
                          <ShieldCheck size={11} strokeWidth={1.8} aria-hidden />
                          Every handover is logged and time-stamped
                        </span>
                      </>
                    )}
                  </main>

                  {!compact && (
                    <aside className="mfh-side">
                      <span className="mfh-side__label">Chain of custody</span>
                      <CustodySteps verified={s.verified} />
                      {s.verified ? (
                        <CodeCard />
                      ) : (
                        <div className="mfh-sealed">
                          <LockKeyhole size={12} strokeWidth={1.8} aria-hidden />
                          <span>Contact details stay sealed until the claim is approved.</span>
                        </div>
                      )}
                    </aside>
                  )}
                </div>
              </div>
            </Window>

            <div className="mfh-scrim" data-show={s.claimOpen || undefined} aria-hidden />
            <div
              className="mfh-modal"
              data-show={s.claimOpen || undefined}
              data-compact={compact || undefined}
            >
              <div className="mfh-modal__head">
                <span className="mfh-modal__kicker">Claim MF-1042</span>
                <span className="mfh-modal__title">Prove it&apos;s yours</span>
              </div>
              <span className="mfh-modal__sub">
                Answer one question only the owner would know. You have 3 attempts.
              </span>
              <Field
                label="What is on the lock screen?"
                value={s.answer}
                focused={s.focused}
                placeholder="Something only you would know"
                box={{ "data-target": "answer" }}
              />
              <div className="mfh-modal__foot">
                <span>
                  <LockKeyhole size={10} strokeWidth={1.8} aria-hidden />
                  Only you and station staff see this
                </span>
                <span>Attempt 1 of 3</span>
              </div>
              <div className="mfh-modal__actions">
                <Button variant="tertiary" size="large">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="large"
                  data-target="submit"
                  icon={<ArrowRight size={13} strokeWidth={1.9} aria-hidden />}
                >
                  Submit claim
                </Button>
              </div>
            </div>

            <span
              data-target="rest"
              style={{ position: "absolute", left: REST[layout].x, top: REST[layout].y }}
            />
          </>
        );
      }}
    </Stage>
  );
}
