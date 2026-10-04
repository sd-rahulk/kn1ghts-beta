import { Fragment } from "react";
import { availableLink, type SiteContent, type SiteSection } from "@/backend/lib/schema";
import { MemberPortrait } from "@/components/ui/MemberPortrait";
import { ContactForm } from "@/components/ui/ContactForm";

function Text({ value }: { value: string }) {
  return value.split(/(\[\[[\s\S]*?\]\]|\n)/).map((part, index) => part === "\n" ? <br key={index} /> : part.startsWith("[[") ? <em key={index}>{part.slice(2, -2)}</em> : <Fragment key={index}>{part}</Fragment>);
}
function Tagline({ value }: { value: string }) {
  return value.split("/").map((part, index) => <Fragment key={index}>{index > 0 && <i aria-hidden="true">/</i>}{part.trim()}</Fragment>);
}
// `fallback` renders in place of the link when it is empty or points at a hidden section, so content
// that only happens to be linked (a title, an empty state) stays visible.
function Link({ site, href, children, fallback = null, ...props }: { site: SiteContent; href: string; children: React.ReactNode; fallback?: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (!href || !availableLink(site, href)) return fallback;
  return <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} {...props}>{children}</a>;
}
function Index({ section, index }: { section: SiteSection; index: number }) {
  return <span className="chapter-index">{String(index).padStart(2, "0")} / {section.eyebrow}</span>;
}
function Copy({ section, index, className = "chapter-copy align-left" }: { section: SiteSection; index: number; className?: string }) {
  return <div className={className} data-reveal><Index section={section} index={index} /><h2><Text value={section.title} /></h2>{section.description && <p>{section.description}</p>}</div>;
}
// Date-only values parse as UTC midnight; format in UTC so the month never shifts with the runtime's
// time zone and the server and browser render the same text.
function date(value: string, fallback: string) {
  const parsed = new Date(value);
  return value && Number.isFinite(parsed.valueOf()) ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(parsed).toUpperCase() : fallback;
}

function Section({ section: s, index, site, contactReady }: { section: SiteSection; index: number; site: SiteContent; contactReady: boolean }) {
  const f = s.fields;
  const base = { id: s.id, "data-chapter": true, "data-section-type": s.type };
  switch (s.type) {
    case "hero": return <section {...base} className="chapter hero">
      <div className="hero-type" data-reveal>
        <h1 className="sr-only">{s.title}</h1>
        <p className="hero-manifesto"><Tagline value={f.tagline || ""} /></p>
        <span className="hero-kicker">{s.eyebrow}</span>
        <Link site={site} className="hero-contact" href={f.ctaHref || ""}>{f.ctaLabel}<span aria-hidden="true">↗</span></Link>
        <p className="hero-mindset"><Text value={f.mindset || ""} /></p>
        <ul className="hero-path">{(f.path || "").split("\n").filter(Boolean).map((entry, i) => <li key={i}>{entry}</li>)}</ul>
      </div>
      <p className="hero-copy" data-reveal>{s.description}</p>
      <div className="hero-meta"><span>{f.metaLeft}</span><span>{f.metaRight}</span></div>
      <Link site={site} className="hero-scroll" href={f.scrollHref || ""}><span />{f.scrollLabel}</Link>
    </section>;
    case "updates": return <section {...base} className="chapter updates-chapter" style={{ "--updates-height": `${Math.max(190, 100 + s.items.length * 65)}dvh` } as React.CSSProperties}>
      <Copy section={s} index={index} />
      {s.items.map((item, i) => <article className="update-feature" key={item.id} data-reveal style={{ "--update-index": i } as React.CSSProperties}>
        <span className="update-label">{item.label} / {date(item.date, site.settings.labels.fieldReport)}</span><h3>{item.title}</h3><p>{item.body}</p>
        <Link site={site} href={item.href}>{f.linkLabel}<b aria-hidden="true">↗</b></Link>
      </article>)}
      <span className="telemetry telemetry-a" aria-hidden="true"><span>{f.feedLabel}</span><b>{f.feedStatus}</b></span>
    </section>;
    case "about": return <section {...base} className="chapter approach-chapter">
      <div className="approach-copy" data-reveal><Index section={s} index={index} /><h2><Text value={s.title} /></h2>{f.secondHeading && <h2><Text value={f.secondHeading} /></h2>}<p>{s.description}</p></div>
      <div className="code-rail" aria-hidden="true">{(f.rail || "").split("\n").map((entry, i) => <span key={i}>{entry}</span>)}</div>
    </section>;
    case "disciplines": return <section {...base} className="chapter arsenal">
      <Copy section={s} index={index} className="chapter-copy align-center" />
      <div className="disciplines" data-reveal>{s.items.map((item, i) => <article key={item.id}><span>{String(i + 1).padStart(2, "0")}</span><strong>{item.title}</strong><p>{item.body}</p><b aria-hidden="true">↗</b></article>)}</div>
    </section>;
    case "results": return <section {...base} className="chapter results-chapter" style={{ "--results-height": `calc(75dvh + ${Math.max(s.items.length, 1) * 190}px)` } as React.CSSProperties}>
      <Copy section={s} index={index} /><div className="results-list">{s.items.map((item, i) => <article key={item.id} data-reveal><span>{String(i + 1).padStart(2, "0")} / {item.label}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><Link site={site} href={item.href} aria-label={`${f.sourceLabel || ""} ${item.title}`}>↗</Link></article>)}</div>
    </section>;
    case "writeups": return <section {...base} className="chapter writeups" style={{ "--writeups-height": `${Math.max(180, 120 + Math.max(s.items.length, 1) * 45)}dvh` } as React.CSSProperties}>
      <Copy section={s} index={index} className="writeup-head" />
      <div className="writeup-track-wrap"><div className="writeup-track" data-track>{s.items.length ? s.items.map((item, i) => <article key={item.id}><span>{String(i + 1).padStart(2, "0")} / {item.label || f.itemLabel}</span><strong><Text value={item.title} /></strong><em>{item.body}</em><Link site={site} href={item.href} className="article-link">{item.meta || item.label || f.itemLabel} ↗</Link></article>) : <article className="writeup-empty"><span>{f.emptyLabel}</span><strong><Text value={f.emptyTitle || ""} /></strong><em>{f.emptyDescription}</em></article>}</div></div>
    </section>;
    case "projects": return <section {...base} className="chapter projects-chapter">
      <Copy section={s} index={index} className="chapter-copy align-right" />
      {s.items.length ? <div className="project-list">{s.items.map((item, i) => <article key={item.id} data-reveal><span>{String(i + 1).padStart(2, "0")} / {item.label || item.tags[0]}</span><strong><Link site={site} href={item.href} fallback={item.title}>{item.title}</Link></strong><p>{item.body}</p><Link site={site} href={item.href} aria-label={item.title}>↗</Link></article>)}</div> : <Link site={site} className="project-note" href={f.emptyHref || ""} data-reveal fallback={<div className="project-note" data-reveal><span>{f.emptyLabel}</span><strong><Text value={f.emptyTitle || ""} /></strong><p>{f.emptyDescription}</p></div>}><span>{f.emptyLabel}</span><strong><Text value={f.emptyTitle || ""} /><b aria-hidden="true">↗</b></strong><p>{f.emptyDescription}</p></Link>}
    </section>;
    case "team": return <section {...base} className="chapter team-chapter" style={{ "--team-height": `${76 + Math.ceil(Math.max(s.items.length, 1) / 2) * 77}dvh` } as React.CSSProperties}>
      <Copy section={s} index={index} className="team-intro" /><div className="team-grid">{s.items.map((item, i) => <article className="team-card" key={item.id} data-cursor={site.settings.labels.profile} data-reveal><MemberPortrait src={item.imageUrl || null} name={item.title} /><div className="portrait-scan" aria-hidden="true" /><span>{f.itemLabel} / {String(i + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p><em>{item.meta || item.tags.join(" · ")}</em><Link site={site} href={item.href} className="member-link">↗</Link></article>)}</div>
    </section>;
    case "journal": return <section {...base} className="chapter journal-chapter">
      <Copy section={s} index={index} />{s.items.length ? <div className="journal-list">{s.items.map((item, i) => <article key={item.id} data-reveal><span>{String(i + 1).padStart(2, "0")} / {item.label || f.itemLabel}</span><div><h3><Link site={site} href={item.href} fallback={item.title}>{item.title} ↗</Link></h3><p>{item.body}</p></div><time>{date(item.date, site.settings.labels.fieldReport)}</time></article>)}</div> : <div className="content-note" data-reveal><span>{f.emptyLabel}</span><strong>{f.emptyTitle}</strong><p>{f.emptyDescription}</p></div>}
    </section>;
    case "recruitment": return <section {...base} className="chapter recruitment-chapter"><div className="recruitment-copy" data-reveal><Index section={s} index={index} /><h2><Text value={s.title} /></h2><p>{s.description}</p><Link site={site} className="network-cta" href={f.ctaHref || ""}><span>{f.ctaLabel}</span><b aria-hidden="true">↗</b></Link></div><div className="recruitment-mark" aria-hidden="true">{f.mark}</div></section>;
    case "finale": return <section {...base} className="chapter finale"><div className="final-copy" data-reveal><h2 className="sr-only">{s.title}</h2><p className="final-tagline"><Tagline value={f.tagline || ""} /></p><span>{s.eyebrow}</span><p>{s.description}</p><Link site={site} className="network-cta magnetic" href={f.ctaHref || ""} data-cursor="ENTER"><span>{f.ctaLabel}</span><b aria-hidden="true">↗</b></Link></div></section>;
    case "contact": return <section {...base} className="chapter contact-chapter" aria-labelledby={`${s.id}-heading`}><div className="contact-section"><div className="contact-copy" data-reveal><Index section={s} index={index} /><h2 id={`${s.id}-heading`}><Text value={s.title} /></h2><p>{s.description}</p></div><ContactForm settings={site.settings.contact} ready={contactReady} /></div></section>;
    default: return <section {...base} className="chapter custom-chapter"><Copy section={s} index={index} />{s.items.length > 0 && <div className="custom-grid">{s.items.map((item) => <article key={item.id} data-reveal>{item.imageUrl && <div className="content-image"><MemberPortrait src={item.imageUrl} name={item.title} /></div>}<span>{item.label}</span><h3>{item.title}</h3><p>{item.body}</p><Link site={site} href={item.href}>{item.meta || item.title} ↗</Link></article>)}</div>}<Link site={site} className="network-cta" href={f.ctaHref || ""}><span>{f.ctaLabel}</span><b aria-hidden="true">↗</b></Link></section>;
  }
}
export function Story({ site, contactReady }: { site: SiteContent; contactReady: boolean }) {
  return <div id="story" className="story">{site.sections.filter((section) => section.enabled).map((section, index) => <Section key={section.id} section={section} index={index} site={site} contactReady={contactReady} />)}<div className="chapter finale site-footer-wrap"><footer>{site.settings.footerLinks.filter((link) => availableLink(site, link.href)).map((link, i) => <Link site={site} key={i} href={link.href}>{link.label}</Link>)}<span>{site.settings.copyright}</span></footer></div></div>;
}
