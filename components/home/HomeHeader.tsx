"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/backend/lib/schema";

export function HomeHeader({ site }: { site: SiteContent }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const links = site.settings.navigation;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    let frame = 0;
    if (open) {
      frame = requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
      });
    } else if (panelRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus();
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open ]);

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <a className="wordmark" href="#home" aria-label={`${site.settings.name} — back to top`}>
          kn<span className="one">1</span>ghts<span className="reg">{site.settings.registrationMark}</span>
        </a>
        <span className="masthead-dateline">{site.settings.headerLine}</span>
        <nav aria-label="Primary navigation">
          {links.map((link) => (
            <a key={`${link.label}-${link.href}`} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="home-menu"
          aria-label={open ? site.settings.labels.closeMenu : site.settings.labels.openMenu}
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>
      <div ref={panelRef} id="home-menu" className={open ? "menu-panel is-open" : "menu-panel"}>
        <nav aria-label="Sections">
          {links.map((link, index) => (
            <a key={`${link.label}-${link.href}`} href={link.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              {link.label}
              <span>{String(index + 1).padStart(2, "0")}</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
