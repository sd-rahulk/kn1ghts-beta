"use client";

import { useState } from "react";

/*
 * Results ticker with a persistent, keyboard-operable pause control
 * (WCAG 2.2.2). The button stays available while the ticker is paused, and
 * its state — not hover or focus — stops and restarts the track. All ticker
 * text comes from the CMS via props; nothing is invented here.
 */
export function Ticker({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className={paused ? "poster-ticker is-paused" : "poster-ticker"}
      aria-label="First-place finishes and season ledger, 2026"
    >
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <span className="ticker-set" key={copy} aria-hidden={copy === 1}>
            {items.map((item, i) => (
              <span className="ticker-item" key={`${copy}-${i}`}>
                {item}
              </span>
            ))}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="ticker-toggle"
        aria-pressed={paused}
        aria-label={paused ? "Resume results ticker" : "Pause results ticker"}
        onClick={() => setPaused((current) => !current)}
      >
        {paused ? "RESUME" : "PAUSE"}
      </button>
    </div>
  );
}
