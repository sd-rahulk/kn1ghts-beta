import Image from "next/image";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaBookOpen, FaBug, FaBullhorn, FaCalendarAlt, FaCode, FaCrosshairs, FaEnvelope, FaFileCode, FaFlag, FaLayerGroup, FaLock, FaNetworkWired, FaNewspaper, FaSatelliteDish, FaSearch, FaShieldAlt, FaTerminal, FaTools, FaTrophy, FaUserShield, FaUsers } from "react-icons/fa";
import { availableLink, type SiteContent, type SiteSection } from "@/backend/lib/schema";
import { MemberPortrait } from "@/components/ui/MemberPortrait";
import { ContactForm } from "@/components/ui/ContactForm";
import { LogoIntro } from "@/components/site/LogoIntro";
import { Arrow, Pill } from "@/components/site/Pill";
import { LOGO } from "@/components/site/ui";
import { Plain, Title } from "@/components/site/Title";
import { accent, card, container, mutedButton, secondaryButton, textLink } from "@/components/site/ui";
import type { HomePlatformData } from "@/lib/platform-api";

const sectionIcons: Record<string, IconType> = {
  hero: FaShieldAlt, updates: FaBullhorn, about: FaCrosshairs, disciplines: FaLayerGroup, results: FaTrophy, writeups: FaFileCode,
  projects: FaCode, team: FaUsers, journal: FaBookOpen, events: FaCalendarAlt, challenge: FaFlag, blog: FaNewspaper,
  recruitment: FaUserShield, finale: FaSatelliteDish, contact: FaEnvelope,
};
const iconFor = (type: string) => sectionIcons[type] ?? FaTerminal;
const disciplineIcons: [RegExp, IconType][] = [[/compet|ctf/i, FaTrophy], [/research|investigat/i, FaSearch], [/build|tool/i, FaTools]];
const fallbackIcons = [FaTerminal, FaBug, FaLock, FaNetworkWired];
const disciplineIcon = (title: string, index: number) => disciplineIcons.find(([pattern]) => pattern.test(title))?.[1] ?? fallbackIcons[index % fallbackIcons.length];

const pad = (value: number) => String(value).padStart(2, "0");
// Reference grids are four across; fewer items stay centred instead of leaving empty columns.
function columns(count: number) {
  if (count >= 4) return "md:grid-cols-2 lg:grid-cols-4";
  if (count === 3) return "md:grid-cols-3";
  if (count === 2) return "md:grid-cols-2 max-w-4xl mx-auto";
  return "max-w-xl mx-auto";
}
// Date-only values parse as UTC midnight; format in UTC so the month never shifts with the runtime's
// time zone and the server and browser render the same text.
function date(value: string, fallback: string) {
  const parsed = new Date(value);
  return value && Number.isFinite(parsed.valueOf()) ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(parsed).toUpperCase() : fallback;
}

// `fallback` renders in place of the link when it is empty or points at a hidden section, so content
// that only happens to be linked (a title, an empty state) stays visible.
function Link({ site, href, children, fallback = null, ...props }: { site: SiteContent; href: string; children: ReactNode; fallback?: ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  if (!href || !availableLink(site, href)) return fallback;
  return <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} {...props}>{children}</a>;
}
function Block({ section, alt, narrow = false, children }: { section: SiteSection; alt: boolean; narrow?: boolean; children: ReactNode }) {
  return <section id={section.id} data-section-type={section.type} className={`relative py-24 ${alt ? "bg-ink-deep/30" : ""}`}>
    <div className={narrow ? "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" : container}>{children}</div>
  </section>;
}
function Head({ section }: { section: SiteSection }) {
  return <div className="text-center mb-16">
    {section.eyebrow && <Pill icon={iconFor(section.type)}>{section.eyebrow}</Pill>}
    <h2 className="font-cyber text-4xl md:text-5xl font-bold mb-4"><Title value={section.title} /></h2>
    {section.description && <p className="text-gray-400 max-w-2xl mx-auto text-lg">{section.description}</p>}
  </div>;
}
function Card({ icon: Icon, index, label, title, body, link }: { icon: IconType; index: number; label?: string; title: ReactNode; body?: string; link?: ReactNode }) {
  return <article className={`${card} flex flex-col`}>
    <Icon className={`w-12 h-12 ${accent(index).text} mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true" />
    {label && <p className="font-mono text-sm text-ember uppercase mb-2">{label}</p>}
    <h3 className="font-cyber text-xl font-semibold text-white mb-2">{title}</h3>
    {body && <p className="text-gray-400 leading-relaxed">{body}</p>}
    {link && <div className="mt-auto pt-4">{link}</div>}
  </article>;
}
function Empty({ label, title, description, children }: { label?: string; title?: string; description?: string; children?: ReactNode }) {
  return <div className="cyber-card p-12 text-center max-w-3xl mx-auto">
    {label && <p className="font-mono text-sm text-ember uppercase tracking-wider mb-4">{label}</p>}
    {title && <h3 className="font-cyber text-2xl md:text-3xl font-bold text-white mb-4"><Plain value={title} /></h3>}
    {description && <p className="text-gray-400">{description}</p>}
    {children && <div className="mt-6">{children}</div>}
  </div>;
}
function ViewAll({ site, href, children }: { site: SiteContent; href: string; children: ReactNode }) {
  return <Link site={site} href={href}><span className="block text-center mt-12"><span className={textLink}><span>{children}</span><Arrow /></span></span></Link>;
}
function CallToAction({ icon: Icon, children }: { icon: IconType; children: ReactNode }) {
  return <div className="cyber-card p-12 relative overflow-hidden text-center">
    <div className="absolute inset-0 bg-gradient-to-br from-ember/10 via-gold/10 to-steel/10" />
    <div className="relative z-10"><Icon className="w-16 h-16 text-ember mx-auto mb-6" aria-hidden="true" />{children}</div>
  </div>;
}

function Hero({ section: s, site }: { section: SiteSection; site: SiteContent }) {
  const f = s.fields;
  const path = (f.path || "").split("\n").map((entry) => entry.trim()).filter(Boolean);
  return <section id={s.id} data-section-type={s.type} className="hero-bg min-h-screen flex items-center justify-center pt-20">
    <LogoIntro />
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <h1 className="sr-only">{s.title}</h1>
      <div className="relative inline-block mb-8">
        {/* Glow sits behind the logo so it does not tint the logo's own colours. */}
        <div className="absolute inset-0 bg-ember/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] mx-auto animate-float intro-float" data-intro-target>
          <Image src={LOGO} alt="" fill priority sizes="(max-width: 768px) 280px, (max-width: 1024px) 400px, 500px" className="intro-logo object-contain drop-shadow-[0_0_30px_rgba(255,122,61,0.5)]" />
        </div>
      </div>
      {s.description && <p className="intro-fade text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed" style={{ "--i": 1 } as React.CSSProperties}>{s.description}</p>}
      {f.tagline && <div className="intro-fade" style={{ "--i": 2 } as React.CSSProperties}><div className="inline-flex items-center space-x-3 bg-panel/80 border border-edge rounded-full px-6 py-3 mb-12">
        <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
        <span className="font-mono text-steel tracking-wider">{f.tagline}</span>
      </div></div>}
      {path.length > 0 && <div className="intro-fade mb-12" style={{ "--i": 3 } as React.CSSProperties}>
        {f.mindset && <h3 className="font-cyber text-lg text-gray-400 mb-6 uppercase tracking-wider">{f.mindset.replace(/\s*\n\s*/g, " ")}</h3>}
        <ol className="flex flex-wrap justify-center gap-4 md:gap-6">
          {path.map((step, index) => <li key={index} className="text-center">
            <div className="countdown-digit gradient-text" aria-hidden="true">{pad(index + 1)}</div>
            <p className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-wider">{step}</p>
          </li>)}
        </ol>
      </div>}
      <div className="intro-fade flex flex-col sm:flex-row justify-center gap-4" style={{ "--i": 4 } as React.CSSProperties}>
        <Link site={site} className="cyber-button" href={f.ctaHref || ""}>{f.ctaLabel}</Link>
        <Link site={site} className={secondaryButton} href={f.scrollHref || ""}>{f.scrollLabel}</Link>
      </div>
    </div>
    <div className="intro-fade absolute bottom-8 left-1/2" style={{ "--i": 5 } as React.CSSProperties}>
      <Link site={site} href={f.scrollHref || ""} className="block -translate-x-1/2 animate-bounce" aria-label={f.scrollLabel}>
        <span className="w-6 h-10 border-2 border-steel/50 rounded-full flex justify-center"><span className="w-1 h-3 bg-steel rounded-full mt-2 animate-pulse" /></span>
      </Link>
    </div>
  </section>;
}

function Section({ section: s, alt, site, platform, contactReady }: { section: SiteSection; alt: boolean; site: SiteContent; platform: HomePlatformData; contactReady: boolean }) {
  const f = s.fields;
  const icon = iconFor(s.type);
  const props = { section: s, alt };
  switch (s.type) {
    case "hero": return <Hero section={s} site={site} />;
    case "updates": return <Block {...props}><Head section={s} />
      <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item, i) => <Card key={item.id} icon={icon} index={i} label={`${item.label} / ${date(item.date, site.settings.labels.fieldReport)}`} title={item.title} body={item.body} link={<Link site={site} className={textLink} href={item.href}>{f.linkLabel}<Arrow /></Link>} />)}</div>
    </Block>;
    case "about": {
      const rail = (f.rail || "").split("\n").map((entry) => entry.trim()).filter(Boolean);
      return <Block {...props}><div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          {s.eyebrow && <Pill icon={icon}>{s.eyebrow}</Pill>}
          <h2 className="font-cyber text-4xl font-bold mb-6"><Title value={s.title} glow="neon-ember" /></h2>
          {f.secondHeading && <h2 className="font-cyber text-4xl font-bold mb-6"><Title value={f.secondHeading} glow="neon-ember" /></h2>}
          {s.description && <div className="space-y-4 text-gray-300 leading-relaxed"><p>{s.description}</p></div>}
        </div>
        {rail.length > 0 && <div className="cyber-card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-ember/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-steel/20 rounded-full blur-3xl" />
          <div className="relative z-10 grid grid-cols-1 gap-6">{rail.map((entry, i) => <div key={i} className="text-center p-4">
            <div className="font-cyber text-4xl font-bold gradient-text mb-2">{pad(i + 1)}</div>
            <div className="text-gray-400 text-sm font-mono uppercase tracking-wider">{entry}</div>
          </div>)}</div>
        </div>}
      </div></Block>;
    }
    case "disciplines": return <Block {...props}><Head section={s} />
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${s.items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-6`}>{s.items.map((item, i) => {
        const Icon = disciplineIcon(item.title, i);
        return <div key={item.id} className="relative group"><div className="cyber-card p-8 text-center h-full flex flex-col items-center justify-center group-hover:border-steel/50 transition-all duration-300">
          <Icon className="w-16 h-16 text-gold mb-4 group-hover:text-steel transition-colors duration-300" aria-hidden="true" />
          <h3 className="font-cyber text-lg font-semibold text-white mb-2">{item.title}</h3>
          {item.body && <p className="font-mono text-sm text-ember">{item.body}</p>}
        </div></div>;
      })}</div>
    </Block>;
    case "results": return <Block {...props}><Head section={s} />
      <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item) => <article key={item.id} className={`${card} text-center flex flex-col items-center`}>
        <div className="font-cyber text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform duration-300">{item.label}</div>
        <h3 className="font-cyber text-xl font-semibold text-white mb-2">{item.title}</h3>
        <p className="text-gray-400 leading-relaxed">{item.body}</p>
        <Link site={site} className={`${textLink} mt-auto pt-4`} href={item.href}>{f.sourceLabel}<Arrow /></Link>
      </article>)}</div>
    </Block>;
    case "writeups": return <Block {...props}><Head section={s} />
      {s.items.length ? <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item, i) => <Card key={item.id} icon={icon} index={i} label={item.label || f.itemLabel} title={<Plain value={item.title} />} body={item.body} link={<Link site={site} className={textLink} href={item.href}>{item.meta || item.label || f.itemLabel}<Arrow /></Link>} />)}</div>
        : <Empty label={f.emptyLabel} title={f.emptyTitle} description={f.emptyDescription} />}
    </Block>;
    case "projects": return <Block {...props}><Head section={s} />
      {s.items.length ? <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item, i) => <Card key={item.id} icon={icon} index={i} label={item.label || item.tags[0]} title={<Link site={site} href={item.href} fallback={item.title}>{item.title}</Link>} body={item.body} link={<Link site={site} className={textLink} href={item.href} aria-label={item.title}>{item.meta || "View project"}<Arrow /></Link>} />)}</div>
        : <Empty label={f.emptyLabel} title={f.emptyTitle} description={f.emptyDescription}>{f.emptyHref && <Link site={site} className="cyber-button" href={f.emptyHref}>{(f.emptyTitle || "").replace(/\s*\n\s*/g, " ")}</Link>}</Empty>}
    </Block>;
    case "team": return <Block {...props}><Head section={s} />
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${s.items.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-6`}>{s.items.map((item, i) => <article key={item.id} className="cyber-card group hover:-translate-y-2 transition-all duration-300 overflow-hidden">
        <div className="relative aspect-square w-full bg-ink-deep overflow-hidden"><MemberPortrait src={item.imageUrl || null} name={item.title} /></div>
        <div className="p-4">
          <p className="font-mono text-xs text-steel uppercase mb-1">{f.itemLabel} / {pad(i + 1)}</p>
          <h3 className="font-cyber text-base font-semibold text-white mb-1">{item.title}</h3>
          <p className="text-gray-400 text-xs leading-relaxed">{item.body}</p>
          {(item.meta || item.tags.length > 0) && <p className="font-mono text-xs text-ember mt-2">{item.meta || item.tags.join(" · ")}</p>}
          <Link site={site} href={item.href} className={`${textLink} text-sm mt-3`} aria-label={`${item.title} profile`}>{site.settings.labels.profile}<Arrow /></Link>
        </div>
      </article>)}</div>
    </Block>;
    case "journal": return <Block {...props}><Head section={s} />
      {s.items.length ? <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item, i) => <Card key={item.id} icon={icon} index={i} label={`${item.label || f.itemLabel} / ${date(item.date, site.settings.labels.fieldReport)}`} title={<Link site={site} href={item.href} fallback={item.title}>{item.title}</Link>} body={item.body} />)}</div>
        : <Empty label={f.emptyLabel} title={f.emptyTitle} description={f.emptyDescription} />}
    </Block>;
    case "events": return <Block {...props}><Head section={s} />
      {platform.events.length ? <div className={`grid grid-cols-1 ${columns(platform.events.length)} gap-6`}>{platform.events.map((event) => <article key={event.id} className="cyber-card p-6 text-center group hover:-translate-y-2 transition-all duration-300">
        <div className="w-14 h-14 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/30 transition-colors duration-300"><FaCalendarAlt className="w-7 h-7 text-gold" aria-hidden="true" /></div>
        <p className="font-mono text-steel text-sm mb-2">{date(new Date(event.startsAt).toISOString(), site.settings.labels.fieldReport)}</p>
        <h3 className="font-cyber text-lg font-semibold text-white mb-1">{event.title}</h3>
        <p className="text-gray-400 text-sm">{event.description}</p>
      </article>)}</div> : <Empty label="EVENTS / 00" title="No upcoming events are published." />}
      <ViewAll site={site} href="/events">VIEW ALL EVENTS</ViewAll>
    </Block>;
    case "challenge": return <Block {...props} narrow><Head section={s} />
      <CallToAction icon={FaFlag}>
        {platform.challenge ? <>
          <p className="font-mono text-sm text-steel uppercase tracking-wider mb-4">{platform.challenge.category} / {platform.challenge.difficulty}</p>
          <h3 className="font-cyber text-3xl md:text-4xl font-bold text-white mb-4">{platform.challenge.title}</h3>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">{platform.challenge.description}</p>
        </> : <>
          <p className="font-mono text-sm text-steel uppercase tracking-wider mb-4">WEEKLY / STANDBY</p>
          <h3 className="font-cyber text-3xl md:text-4xl font-bold text-white mb-4">Next challenge incoming.</h3>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">The next in-house brief will appear here after it is published.</p>
        </>}
        <Link site={site} className="cyber-button" href="/inhouse-weekly">TRY THE CHALLENGE</Link>
      </CallToAction>
    </Block>;
    case "blog": return <Block {...props}><Head section={s} />
      {platform.blog.length ? <div className={`grid grid-cols-1 ${columns(platform.blog.length)} gap-6`}>{platform.blog.map((post, i) => <Card key={post.id} icon={icon} index={i} label={date(new Date(post.publishedAt ?? post.updatedAt).toISOString(), site.settings.labels.fieldReport)} title={post.title} body={post.excerpt} link={<Link site={site} className={textLink} href={`/blog/${post.slug}`}>READ<Arrow /></Link>} />)}</div>
        : <Empty label="BLOG / 00" title="The first field note is being prepared." />}
      <ViewAll site={site} href="/blog">EXPLORE THE BLOG</ViewAll>
    </Block>;
    case "recruitment": return <Block {...props} narrow><CallToAction icon={icon}>
      {s.eyebrow && <p className="font-mono text-sm text-steel uppercase tracking-wider mb-4">{s.eyebrow}</p>}
      <h2 className="font-cyber text-3xl md:text-4xl font-bold text-white mb-4"><Title value={s.title} /></h2>
      <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">{s.description}</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4"><Link site={site} className="cyber-button" href={f.ctaHref || ""}>{f.ctaLabel}</Link></div>
    </CallToAction></Block>;
    case "finale": return <Block {...props} narrow><CallToAction icon={icon}>
      {s.eyebrow && <p className="font-mono text-sm text-steel uppercase tracking-wider mb-4">{s.eyebrow}</p>}
      <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4"><span className="sr-only">{s.title} — </span><span className="gradient-text">{f.tagline || s.title}</span></h2>
      <p className="text-gray-400 max-w-xl mx-auto mb-8 text-lg">{s.description}</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4"><Link site={site} className="cyber-button" href={f.ctaHref || ""}>{f.ctaLabel}</Link></div>
    </CallToAction></Block>;
    case "contact": return <section id={s.id} data-section-type={s.type} className={`relative py-20 ${alt ? "bg-ink-deep/30" : ""}`} aria-labelledby={`${s.id}-heading`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-2">
          {s.eyebrow && <Pill icon={icon}>{s.eyebrow}</Pill>}
          <h2 id={`${s.id}-heading`} className="font-cyber text-3xl font-bold mb-4"><Title value={s.title} /></h2>
          <p className="text-gray-400 leading-relaxed mb-6">{s.description}</p>
        </div>
        <div className="lg:col-span-3"><ContactForm settings={site.settings.contact} ready={contactReady} /></div>
      </div></div>
    </section>;
    default: return <Block {...props}><Head section={s} />
      {s.items.length > 0 && <div className={`grid grid-cols-1 ${columns(s.items.length)} gap-6`}>{s.items.map((item, i) => item.imageUrl
        ? <article key={item.id} className="cyber-card group hover:-translate-y-2 transition-all duration-300 overflow-hidden">
          <div className="relative aspect-square w-full bg-ink-deep overflow-hidden"><MemberPortrait src={item.imageUrl} name={item.title} /></div>
          <div className="p-4">
            {item.label && <p className="font-mono text-xs text-steel uppercase mb-1">{item.label}</p>}
            <h3 className="font-cyber text-base font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">{item.body}</p>
            <Link site={site} className={`${textLink} text-sm mt-3`} href={item.href}>{item.meta || item.title}<Arrow /></Link>
          </div>
        </article>
        : <Card key={item.id} icon={icon} index={i} label={item.label} title={item.title} body={item.body} link={<Link site={site} className={textLink} href={item.href}>{item.meta || item.title}<Arrow /></Link>} />)}</div>}
      {f.ctaLabel && <div className="flex justify-center mt-12"><Link site={site} className={mutedButton} href={f.ctaHref || ""}>{f.ctaLabel}</Link></div>}
    </Block>;
  }
}

export function Story({ site, platform, contactReady }: { site: SiteContent; platform: HomePlatformData; contactReady: boolean }) {
  const sections = site.sections.filter((section) => section.enabled);
  const templates: SiteSection[] = [
    { id: "events", type: "events", enabled: true, eyebrow: "UPCOMING EVENTS", title: "MEET US\nIN THE FIELD.", description: "Competitions, sessions, and public appearances.", fields: {}, items: [] },
    { id: "weekly", type: "challenge", enabled: true, eyebrow: "IN-HOUSE WEEKLY", title: "TRY THE\nCHALLENGE.", description: "A fresh security problem for the community.", fields: {}, items: [] },
    { id: "blog", type: "blog", enabled: true, eyebrow: "FIELD NOTES", title: "EXPLORE\nTHE BLOG.", description: "Research, writeups, and lessons from the arena.", fields: {}, items: [] },
  ];
  const missing = templates.filter((template) => !sections.some((section) => section.type === template.type));
  const insertAt = sections.findIndex((section) => ["recruitment", "finale", "contact"].includes(section.type));
  const rendered = insertAt < 0 ? [...sections, ...missing] : [...sections.slice(0, insertAt), ...missing, ...sections.slice(insertAt)];
  let band = 0;
  return <div id="story">{rendered.map((section) => <Section key={section.id} section={section} alt={section.type !== "hero" && band++ % 2 === 1} site={site} platform={platform} contactReady={contactReady} />)}</div>;
}
