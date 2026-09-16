"use client";

import { useEffect, useState } from "react";

export function SystemLoader({ onComplete }: { onComplete: () => void }) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (new URLSearchParams(window.location.search).has("skipIntro")) {
      frame = requestAnimationFrame(() => {
        setValue(100);
        setDone(true);
        onComplete();
      });
      return () => cancelAnimationFrame(frame);
    }
    const started = performance.now();
    const tick = (time: number) => {
      const next = Math.min(100, Math.floor(((time - started) / 1850) * 100));
      setValue(next);
      if (next < 100) frame = requestAnimationFrame(tick);
      else timer = window.setTimeout(() => { setDone(true); onComplete(); }, 280);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [onComplete]);

  return (
    <div className={done ? "loader is-done" : "loader"} role="status" aria-live="polite" aria-label={`Initializing system ${value}%`}>
      <div className="loader-grid" aria-hidden="true" />
      <div className="loader-center"><span className="loader-word">KN1GHTS</span><span className="loader-status">INITIALIZING SYSTEM</span></div>
      <span className="loader-count">{String(value).padStart(3, "0")}</span>
      <span className="loader-line" style={{ transform: `scaleX(${value / 100})` }} />
    </div>
  );
}
