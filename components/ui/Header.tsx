"use client";

import { useEffect, useRef, useState } from "react";
import { availableLink, type SiteContent } from "@/backend/lib/schema";

export function Header({ site }: { site: SiteContent }) {
  const chapters = site.settings.navigation.filter((link) => availableLink(site, link.href));
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const story = document.getElementById("story");
    const skipLink = document.querySelector<HTMLElement>(".skip-link");
    document.body.style.overflow = open ? "hidden" : "";
    if (story) story.inert = open;
    if (skipLink) skipLink.inert = open;

    let focusFrame = 0;
    if (open) {
      focusFrame = requestAnimationFrame(() => {
        menuRef.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
      });
    } else if (menuRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus();
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = "";
      if (story) story.inert = false;
      if (skipLink) skipLink.inert = false;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <header className="header">
      <button className="wordmark magnetic" tabIndex={open ? -1 : 0} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={site.settings.labels.backToTop}>{site.settings.name}<span>{site.settings.registrationMark}</span></button>
      <span className="header-coord">{site.settings.headerLine}</span>
      {chapters.length > 0 && <button ref={toggleRef} className={open ? "menu-toggle is-open magnetic" : "menu-toggle magnetic"} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="menu-overlay" aria-label={open ? site.settings.labels.closeMenu : site.settings.labels.openMenu}><span /><span /><span /></button>}
    </header>
    <div ref={menuRef} id="menu-overlay" className={open ? "menu-overlay is-open" : "menu-overlay"} role="dialog" aria-modal={open || undefined} aria-label="Site navigation" aria-hidden={!open}>
      <div className="menu-scan" aria-hidden="true" />
      <nav aria-label={`${site.settings.name} sections`}>
        {chapters.map((chapter, index) => <a key={`${chapter.href}-${index}`} href={chapter.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} {...(chapter.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}><span>{String(index).padStart(2, "0")}</span>{chapter.label}<i>{index % 2 ? "↗" : "→"}</i></a>)}
      </nav>
      <div className="menu-foot">{site.settings.headerLine}</div>
    </div>
  </>;
}
