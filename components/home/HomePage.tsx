import { Fragment } from "react";
import type { CSSProperties } from "react";
import { HomeHeader } from "@/components/home/HomeHeader";
import { Ticker } from "@/components/home/Ticker";
import { resolvePosterHref } from "@/components/home/posterLinks";
import type { SiteContent, SiteSection } from "@/backend/lib/schema";

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

/* Plain text of a CMS title: emphasis markers stripped, newlines flattened.
 * Used for the h1 accessible name, so it never carries the [[...]]
 * delimiters the visible heading omits. */
function plainTitle(value: string) {
  return value
    .replace(/\[\[([\s\S]*?)\]\]/g, "$1")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Headline words for the kinetic type treatment. CMS emphasis is parsed
 * FIRST, then each part is split into words — so "Four [[first places]]
 * in 2026." animates as an emphasized "first places", never as the broken
 * fragments "[[first" / "places]]". Plain titles still get one animation
 * span per word. */
type HeadlineWord = { text: string; em: boolean };

function headlineWords(value: string): HeadlineWord[] {
  const words: HeadlineWord[] = [];
  for (const part of value.split(/(\[\[[\s\S]*?\]\]|\n)/)) {
    if (!part || part === "\n") continue;
    const em = part.startsWith("[[");
    const text = em ? part.slice(2, -2) : part;
    for (const word of text.split(" ").filter(Boolean)) words.push({ text: word, em });
  }
  return words;
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
  preview?: boolean;
  contactReady?: boolean;
}) {
  const byType = (type: SiteSection["type"]) => data.sections.find((s) => s.type === type && s.enabled);
  const hero = byType("hero");
  const results = byType("results");
  const recruitment = byType("recruitment");
  const firstPlaces = (results?.items ?? []).filter((item) => item.label === "#1");

  /* Ticker: the four first-place finishes, then the ledger figures parsed
   * from the CMS stat strip ("RATING 457 · 175.732 PTS · …"). Each figure is
   * matched as a COMPLETE field: a partial number (e.g. "1,175.732 PTS"
   * read as "175.732 PTS") is rejected and the field is omitted, never
   * published as a lower score. */
  const ledger: string[] = [];
  const stripFields = (hero?.fields.statStrip ?? "").split("·").map((field) => field.trim());
  const pointsField = stripFields.find((field) => /PTS$/i.test(field));
  const pointsMatch = pointsField?.match(/^([\d,]+(?:\.\d+)?)\s*PTS$/i);
  if (pointsMatch) ledger.push(`${pointsMatch[1]} PTS`);
  const ratingField = stripFields.find((field) => /^RATING\s/i.test(field));
  const ratingMatch = ratingField?.match(/^RATING\s+([\d,]+)$/i);
  if (ratingMatch) ledger.push(`RATING ${ratingMatch[1]}`);
  const tickerItems = [...firstPlaces.map((item) => `${ordinal(item.label)} ${item.title}`), ...ledger];

  const words = headlineWords(hero?.title ?? "");

  /* The CMS CTA destination may be an obsolete fragment (#results): resolve
   * it to its replacement page and keep the CMS label with it. A real
   * destination ("/events", an external URL) is used as authored, label and
   * destination together. An unresolvable fragment falls back to the record
   * page with the results label, so the label never describes a destination
   * the button does not open. */
  const ctaHref = hero?.fields.ctaHref;
  const ctaResolved = ctaHref ? resolvePosterHref(ctaHref) : null;
  const cta = ctaResolved
    ? { href: ctaResolved, label: hero?.fields.ctaLabel || "SEE THE RESULTS" }
    : { href: "/pow", label: "SEE THE RESULTS" };

  /* Footer links are resolved the same way as the nav: a link to a removed
   * section resolves to its replacement page, links to rendered targets
   * (#home, #main) and real pages stay as authored, and a fragment with no
   * page is omitted rather than rendered as a dead anchor. */
  const footerLinks = data.settings.footerLinks
    .map((link) => ({ label: link.label, href: resolvePosterHref(link.href) }))
    .filter((link): link is { label: string; href: string } => link.href !== null);

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
                  <strong>kn1ghts · competitive cybersecurity &amp; CTFs</strong>
                </span>
                <span>{hero.fields.dateline || data.settings.headerLine}</span>
              </div>
              <h1 aria-label={plainTitle(hero.title)}>
                {words.map((word, i) => (
                  <Fragment key={`${word.text}-${i}`}>
                    {i > 0 && " "}
                    <span className="hero-word" style={{ "--i": i } as CSSProperties}>
                      <span className="hero-word-inner" aria-hidden="true">
                        {word.em ? <em>{word.text}</em> : word.text}
                      </span>
                    </span>
                  </Fragment>
                ))}
              </h1>
              <p className="hero-standfirst">{hero.description}</p>
              <p className="hero-cta">
                <a className="network-cta" href={cta.href}>
                  <span>{cta.label}</span>
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
            {tickerItems.length > 0 && <Ticker items={tickerItems} />}
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
              {footerLinks.map((link) => (
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
