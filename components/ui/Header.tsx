"use client";

import { useEffect, useState } from "react";

const chapters = ["SIGNAL", "RECON", "ANALYZE", "EXPLOIT", "PROOF", "ARSENAL", "TEAM", "WRITEUPS"];

export function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const jump = (index: number) => {
    const target = document.querySelectorAll<HTMLElement>("[data-chapter]")[index];
    setOpen(false);
    window.setTimeout(() => target?.scrollIntoView({ behavior: "smooth" }), 120);
  };

  return <>
    <header className="header">
      <button className="wordmark magnetic" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">KN1GHTS<span>®</span></button>
      <span className="header-coord">31.2304° N / 121.4737° E</span>
      <button className={open ? "menu-toggle is-open magnetic" : "menu-toggle magnetic"} onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu-overlay" aria-label={open ? "Close menu" : "Open menu"}><span /><span /><span /></button>
    </header>
    <div id="menu-overlay" className={open ? "menu-overlay is-open" : "menu-overlay"} aria-hidden={!open}>
      <div className="menu-scan" aria-hidden="true" />
      <nav aria-label="Chapters">
        {chapters.map((chapter, index) => <button key={chapter} onClick={() => jump(index)} tabIndex={open ? 0 : -1}><span>{String(index).padStart(2, "0")}</span>{chapter}<i>{index % 2 ? "↗" : "→"}</i></button>)}
      </nav>
      <div className="menu-foot">OFFENSIVE SECURITY COLLECTIVE / EST. 2021</div>
    </div>
  </>;
}
