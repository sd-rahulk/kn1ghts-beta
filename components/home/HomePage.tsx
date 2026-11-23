import { Fragment } from "react";
import type { CSSProperties } from "react";
import { HomeHeader } from "@/components/home/HomeHeader";
import type { SiteContent, SiteSection } from "@/backend/lib/schema";
import type { HomePlatformData } from "@/lib/platform-api";

/* [[...]] renders as italic emphasis; newlines become line breaks. */
function Text({ value }: { value: string }) {
  return value.split(/(\[\[[\s\S]*?\]\]|\n)/).map((part, index) =>
    part === "\n" ? (
      <br key={index} />
    ) : part.startsWith("[[") ? (
      <em key={index}>{part.slice(2, -2)}</em>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function isExternal(href: string) {
  return href.startsWith("http");
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} {...(isExternal(href) ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}
    </a>
  );
}

function ordinal(label: string) {
  const n = Number.parseInt(label.replace("#", ""), 10);
  if (!Number.isFinite(n)) return label;
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

/*
 * THE POSTER — the homepage is bare minimum: masthead + one announcement
 * block + footer. No about / disciplines / record table / member list /
 * writeups / teasers / contact on the homepage; that content already lives
 * on its own pages (/pow, /team, /blog, /contact, /events, /inhouse-weekly)
 * and the nav links out to them. The CMS (default.json) is unchanged — the
 * homepage simply stops rendering most of its sections.
 *
 * Motion is pure CSS (kinetic hero type, results ticker, scroll progress
 * hairline, hover physics) — no JS, no new dependencies. See DESIGN.md.
 */
export function HomePage({
  data,
  preview = false,
}: {
  data: SiteContent;
  /* page.tsx still passes platform; the poster renders no platform teasers. */
  platform: HomePlatformData;
  preview?: boolean;
  contactReady?: boolean;
}) {
  const byType = (type: SiteSection["type"]) => data.sections.find((s) => s.type === type && s.enabled);
  const hero = byType("hero");
  const results = byType("results");
  const recruitment = byType("recruitment");
  const firstPlaces = (results?.items ?? []).filter((item) => item.label === "#1");

  /* Ticker: the four first-place finishes, then the ledger figures parsed
   * from the CMS stat strip ("RATING 457 · 175.732 PTS · …"). If parsing
   * ever fails, the ticker falls back to the four firsts alone — never
   * invented text. */
  const ledger: string[] = [];
  const points = hero?.fields.statStrip?.match(/([\d.]+)\s*PTS/i);
  const rating = hero?.fields.statStrip?.match(/RATING\s+(\d+)/i);
  if (points) ledger.push(`${points[1]} PTS`);
  if (rating) ledger.push(`RATING ${rating[1]}`);
  const tickerItems = [...firstPlaces.map((item) => `${ordinal(item.label)} ${item.title}`), ...ledger];

  const headlineWords = (hero?.title ?? "").split(" ").filter(Boolean);

  return (
    <div className="redesign">
      <a className="skip-link" href="#main">
        {data.settings.labels.skipContent}
      </a>
      <div className="scroll-progress" aria-hidden="true" />
      <HomeHeader site={data} />
      <main id="main" tabIndex={-1}>
        {hero && (
          <header className="hero poster-hero" id={hero.id}>
            <div className="wrap">
              <div className="hero-kicker">
                <span>
                  <strong>{hero.fields.kicker || hero.eyebrow}</strong>
                </span>
                <span>{hero.fields.dateline || data.settings.headerLine}</span>
              </div>
              <h1 aria-label={hero.title}>
                {headlineWords.map((word, i) => (
                  <Fragment key={`${word}-${i}`}>
                    {i > 0 && " "}
                    <span className="hero-word" style={{ "--i": i } as CSSProperties}>
                      <span className="hero-word-inner" aria-hidden="true">
                        <Text value={word} />
                      </span>
                    </span>
                  </Fragment>
                ))}
              </h1>
              <p className="hero-standfirst">{hero.description}</p>
              <p className="hero-cta">
                {/*
                  The CMS ctaHref is "#results" — a dead anchor on the poster
                  page, since the results table no longer lives here. The
                  record now lives at /pow (Proof of Work), so the CTA
                  points there and keeps the CMS label.
                */}
                <a className="network-cta" href="/pow">
                  <span>{hero.fields.ctaLabel || "SEE THE RESULTS"}</span>
                  <b aria-hidden="true">→</b>
                </a>
              </p>
              {recruitment && (
                <p className="poster-gate">
                  <span className="poster-gate-label">RECRUITMENT — </span>
                  <Text value={recruitment.title.replace(/\n/g, " ")} />
                  {recruitment.fields.ctaHref && (
                    <>
                      {" "}
                      <a href={recruitment.fields.ctaHref} target="_blank" rel="noreferrer">
                        {recruitment.fields.ctaLabel || "FOLLOW KN1GHTS"} ↗
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
            {tickerItems.length > 0 && (
              <div className="poster-ticker" aria-label="First-place finishes and season ledger, 2026">
                <div className="ticker-track">
                  {[0, 1].map((copy) => (
                    <span className="ticker-set" key={copy} aria-hidden={copy === 1}>
                      {tickerItems.map((item, i) => (
                        <span className="ticker-item" key={`${copy}-${i}`}>
                          {item}
                        </span>
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </header>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-top">
            <a className="wordmark" href="#home" aria-label={`${data.settings.name} — back to top`}>
              kn<span className="one">1</span>ghts<span className="reg">{data.settings.registrationMark}</span>
            </a>
            <nav className="footer-links" aria-label="Footer">
              {data.settings.footerLinks.map((link) => (
                <SourceLink key={`${link.label}-${link.href}`} href={link.href}>
                  {link.label}
                </SourceLink>
              ))}
              <a href="/security">SECURITY</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>{data.settings.headerLine}</span>
            <span>{data.settings.copyright}</span>
          </div>
        </div>
      </footer>
      {preview && (
        <div className="draft-banner" role="status">
          DRAFT PREVIEW · Not published
        </div>
      )}
    </div>
  );
}
