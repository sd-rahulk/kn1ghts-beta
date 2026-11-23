"use client";

import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/backend/lib/schema";
import { resolvePosterHref } from "@/components/home/posterLinks";

/*
 * Nav resolution — the CMS nav (default.json) is anchor-based (#results,
 * #team, ...), but the poster homepage renders no sections, so those
 * anchors would be dead links. Every published entry is therefore resolved
 * through resolvePosterHref, which uses the entry's AUTHORED href:
 * absolute paths and external URLs render unchanged (so a published entry
 * such as EVENTS -> /events stays in the menus), and fragments map to the
 * page that hosts that section (#results -> /pow, #team -> /team,
 * #writeups -> /blog, #contact -> /contact; #home stays, it is the
 * rendered hero id). Only a fragment with no page on the poster site
 * (#about, #disciplines, #recruitment) resolves to null and is omitted —
 * there is no authored destination that works for it. Labels always come
 * from the CMS, so a relabelled entry (TEAM -> Team) still resolves by
 * its href. Entries that resolve to the same destination are deduped,
 * keeping the first label (WRITEUPS and BLOG both point at /blog).
 */
function resolveNavLinks(navigation: SiteContent["settings"]["navigation"]) {
  const seen = new Set<string>();
  const links: { label: string; href: string }[] = [];
  for (const entry of navigation) {
    const href = resolvePosterHref(entry.href);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    links.push({ label: entry.label, href });
  }
  return links;
}

export function HomeHeader({ site }: { site: SiteContent }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const links = resolveNavLinks(site.settings.navigation);

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

  // Close the mobile menu if the viewport widens past the mobile
  // breakpoint: above 860px the toggle is hidden, so a stale open state
  // would leave the panel visible and scrolling locked with no way to
  // close it. Resetting `open` also restores body scrolling via the
  // effect above.
  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

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
