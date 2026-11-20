"use client";

import { useEffect, useState } from "react";

const format = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export default function DelhiClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="mf-footer__clock">
      <span className="mf-live-dot" aria-hidden />
      <span>New Delhi</span>
      <time>{time ?? "--:--:--"}</time>
      <span>IST</span>
    </span>
  );
}
