import { Fragment } from "react";
import { ContactForm } from "@/components/ui/ContactForm";
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

function sourceName(href: string) {
  if (href.includes("ctftime.org")) return "CTFTIME";
  if (href.includes("linkedin.com")) return "LINKEDIN";
  if (href.includes("github.com")) return "GITHUB";
  if (href.startsWith("/")) return "KN1GHTS.ORG";
  return "SOURCE";
}

function ordinal(label: string) {
  const n = Number.parseInt(label.replace("#", ""), 10);
  if (!Number.isFinite(n)) return label;
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

function date(value: number | null | undefined, fallback: string) {
  const parsed = new Date(value ?? Number.NaN);
  return Number.isFinite(parsed.valueOf())
    ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(parsed).toUpperCase()
    : fallback;
}

export function HomePage({
  data,
  platform,
  preview = false,
  contactReady = false,
}: {
  data: SiteContent;
  platform: HomePlatformData;
  preview?: boolean;
  contactReady?: boolean;
}) {
  const byType = (type: SiteSection["type"]) => data.sections.find((s) => s.type === type && s.enabled);
  const hero = byType("hero");
  const about = byType("about");
  const disciplines = byType("disciplines");
  const results = byType("results");
  const writeups = byType("writeups");
  const team = byType("team");
  const recruitment = byType("recruitment");
  const contact = byType("contact");
  const firstPlaces = (results?.items ?? []).filter((item) => item.label === "#1");

  return (
    <div className="redesign">
      <a className="skip-link" href="#main">
        {data.settings.labels.skipContent}
      </a>
      <HomeHeader site={data} />
      <main id="main" tabIndex={-1}>
        {hero && (
          <header className="hero" id={hero.id}>
            <div className="wrap">
              <div className="hero-kicker">
                <span>
                  <strong>{hero.fields.kicker || hero.eyebrow}</strong>
                </span>
                <span>{hero.fields.dateline || data.settings.headerLine}</span>
              </div>
              <h1>
                <Text value={hero.title} />
              </h1>
              <p className="hero-standfirst">{hero.description}</p>
              <p className="hero-cta">
                <a className="network-cta" href={hero.fields.ctaHref || (results ? `#${results.id}` : "#results")}>
                  <span>{hero.fields.ctaLabel || "SEE THE RESULTS"}</span>
                  <b aria-hidden="true">↓</b>
                </a>
              </p>
              {firstPlaces.length > 0 && (
                <div className="hero-score" aria-label="First-place finishes in 2026">
                  {firstPlaces.map((item) => (
                    <article key={item.id}>
                      <span className="place">
                        <span className="flag-glyph" aria-hidden="true" />
                        {ordinal(item.label)}
                      </span>
                      <div>
                        <h2>
                          <SourceLink href={item.href}>{item.title}</SourceLink>
                        </h2>
                        <p>{item.body}</p>
                      </div>
                      {item.href && (
                        <SourceLink href={item.href}>
                          <span className="source">{sourceName(item.href)} ↗</span>
                        </SourceLink>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {hero.fields.statStrip && (
                <p className="hero-strip">
                  {hero.fields.statStrip.split("·").map((part, i) => (
                    <span key={i}>
                      {i === 0 ? <b>{part.trim()}</b> : part.trim()}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </header>
        )}

        {about && (
          <section id={about.id} aria-labelledby={`${about.id}-heading`}>
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">{about.eyebrow}</p>
                <h2 id={`${about.id}-heading`}>
                  <Text value={about.title} />
                </h2>
              </div>
              <div className="about-copy">
                <p>{about.description}</p>
                {about.fields.secondHeading && (
                  <p>
                    <strong>
                      <Text value={about.fields.secondHeading} />
                    </strong>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {disciplines && disciplines.items.length > 0 && (
          <section id={disciplines.id} aria-label="Disciplines">
            <div className="wrap">
              <ol className="discipline-list">
                {disciplines.items.map((item, i) => (
                  <li key={item.id}>
                    <span className="num">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {results && results.items.length > 0 && (
          <section id={results.id} aria-labelledby={`${results.id}-heading`}>
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">{results.eyebrow}</p>
                <h2 id={`${results.id}-heading`}>
                  <Text value={results.title} />
                </h2>
                {results.description && <p>{results.description}</p>}
              </div>
              <table className="results-table">
                <caption>
                  {results.items.length} ranked results, 2026 — each row links to its public record
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Event</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {results.items.map((item) => (
                    <tr key={item.id}>
                      <td className="place-cell" data-label="Place">
                        {item.label === "#1" ? (
                          <span className="first">
                            <span className="flag-glyph" aria-hidden="true" /> {ordinal(item.label)}
                          </span>
                        ) : (
                          ordinal(item.label)
                        )}
                      </td>
                      <td className="event-cell" data-label="Event">
                        <h3>
                          <SourceLink href={item.href}>{item.title}</SourceLink>
                        </h3>
                        <p>{item.body}</p>
                      </td>
                      <td className="source-cell" data-label="Source">
                        {item.href ? (
                          <SourceLink href={item.href}>{sourceName(item.href)} ↗</SourceLink>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="results-note">
                Ranked as{" "}
                <a className="text-link" href="https://ctftime.org/team/157907" target="_blank" rel="noreferrer">
                  :!Kn^ghts
                </a>{" "}
                on CTFtime — 2026 rating place 457, 175.732 points. The home team is{" "}
                <a className="text-link" href="https://ctftime.org/team/453025" target="_blank" rel="noreferrer">
                  Kn1ghts.org
                </a>
                .
              </p>
            </div>
          </section>
        )}

        {team && team.items.length > 0 && (
          <section id={team.id} aria-labelledby={`${team.id}-heading`}>
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">{team.eyebrow}</p>
                <h2 id={`${team.id}-heading`}>
                  <Text value={team.title} />
                </h2>
                {team.description && <p>{team.description}</p>}
              </div>
              <ol className="roster">
                {team.items.map((member) => (
                  <li key={member.id}>
                    <span className="monogram" aria-hidden="true">
                      {member.title.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{member.title}</h3>
                      <p>{member.meta || member.body}</p>
                    </div>
                    {member.href && (
                      <SourceLink href={member.href}>
                        <span className="profile-link">PROFILE ↗</span>
                      </SourceLink>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {writeups && writeups.items.length > 0 && (
          <section id={writeups.id} aria-labelledby={`${writeups.id}-heading`}>
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">{writeups.eyebrow}</p>
                <h2 id={`${writeups.id}-heading`}>
                  <Text value={writeups.title} />
                </h2>
                {writeups.description && <p>{writeups.description}</p>}
              </div>
              <ol className="writeup-list">
                {writeups.items.map((item, i) => (
                  <li key={item.id}>
                    <span className="num">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>
                        <SourceLink href={item.href}>{item.title}</SourceLink>
                      </h3>
                      <p>{item.body}</p>
                    </div>
                    <span className="meta">
                      {item.href ? <SourceLink href={item.href}>{item.meta || "READ ↗"}</SourceLink> : item.meta}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {platform.events.length > 0 && (
          <section id="events" aria-labelledby="events-heading">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">UPCOMING EVENTS</p>
                <h2 id="events-heading">Meet us in the field.</h2>
              </div>
              <ul className="teaser-list">
                {platform.events.map((event) => (
                  <li key={event.id}>
                    <span className="when">{date(event.startsAt, "FIELD REPORT")}</span>
                    <div>
                      <h3>{event.title}</h3>
                      <p>{event.description}</p>
                    </div>
                    <a className="row-link" href="/events">
                      ALL EVENTS →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {platform.challenge && (
          <section id="weekly" aria-labelledby="weekly-heading">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">IN-HOUSE WEEKLY</p>
                <h2 id="weekly-heading">Try the challenge.</h2>
              </div>
              <ul className="teaser-list">
                <li>
                  <span className="when">
                    {platform.challenge.category} / {platform.challenge.difficulty}
                  </span>
                  <div>
                    <h3>{platform.challenge.title}</h3>
                    <p>{platform.challenge.description}</p>
                  </div>
                  <a className="row-link" href="/inhouse-weekly">
                    TRY IT →
                  </a>
                </li>
              </ul>
            </div>
          </section>
        )}

        {platform.blog.length > 0 && (
          <section id="blog" aria-labelledby="blog-heading">
            <div className="wrap">
              <div className="section-head">
                <p className="eyebrow">FIELD NOTES</p>
                <h2 id="blog-heading">From the blog.</h2>
              </div>
              <ul className="teaser-list">
                {platform.blog.map((post) => (
                  <li key={post.id}>
                    <span className="when">{date(post.publishedAt ?? post.updatedAt, "FIELD REPORT")}</span>
                    <div>
                      <h3>
                        <a href={`/blog/${post.slug}`}>{post.title}</a>
                      </h3>
                      <p>{post.excerpt}</p>
                    </div>
                    <a className="row-link" href={`/blog/${post.slug}`}>
                      READ →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {recruitment && (
          <section id={recruitment.id} aria-labelledby={`${recruitment.id}-heading`}>
            <div className="wrap">
              <div className="recruitment-notice">
                <h2 id={`${recruitment.id}-heading`}>
                  <Text value={recruitment.title} />
                </h2>
                <p>{recruitment.description}</p>
                {recruitment.fields.ctaHref && (
                  <a className="network-cta" href={recruitment.fields.ctaHref} target="_blank" rel="noreferrer">
                    <span>{recruitment.fields.ctaLabel || "FOLLOW KN1GHTS"}</span>
                    <b aria-hidden="true">↗</b>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {contact && (
          <section id={contact.id} aria-labelledby={`${contact.id}-heading`}>
            <div className="wrap contact-grid">
              <div className="section-head">
                <p className="eyebrow">{contact.eyebrow}</p>
                <h2 id={`${contact.id}-heading`}>
                  <Text value={contact.title} />
                </h2>
                {contact.description && <p>{contact.description}</p>}
              </div>
              <ContactForm settings={data.settings.contact} ready={contactReady && !preview} />
            </div>
          </section>
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
