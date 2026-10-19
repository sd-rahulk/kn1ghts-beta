"use client";
import type { SiteContent } from "@/lib/schema";
import { hiddenLabels, hiddenSettings, labelHints, settingHints } from "@/lib/field-guide";
import { Field, StringFields, pretty } from "./Fields";

const linkNotes = {
  navigation: "Shown in the footer's Explore column. Section links use # followed by the section ID; links to hidden sections stay off the site. The top navigation always lists the site's pages (POW, Team, Events, Weekly, Blog, Join, Account).",
  footerLinks: "Shown in the footer's Connect column. GitHub, LinkedIn, Discord, X, Instagram, YouTube and email links also appear as icons under the logo.",
} as const;

export function SettingsEditor({ site, onChange, readOnly }: { site: SiteContent; onChange: (value: SiteContent) => void; readOnly: boolean }) {
  const settings = site.settings;
  const update = (patch: Partial<SiteContent["settings"]>) => onChange({ ...site, settings: { ...settings, ...patch } });
  return <div className="settings-editor"><div className="editor-heading"><div><span className="eyebrow">SITE-WIDE</span><h2>Settings</h2><p className="muted">These changes are included in the same draft as your sections.</p></div></div><fieldset disabled={readOnly}>
    <div className="form-section"><h3>Identity & search</h3><div className="fields-grid">{(["name", "registrationMark", "headerLine", "title", "publicUrl", "copyright"] as const).filter((key) => !hiddenSettings.has(key)).map((key) => <Field key={key} label={pretty(key)} value={settings[key]} hint={settingHints[key]} onChange={(value) => update({ [key]: value })} />)}</div><Field label="Search description" value={settings.description} multiline hint="Search results, and under the logo in the footer." onChange={(value) => update({ description: value })} /></div>
    {(["navigation", "footerLinks"] as const).map((group) => <div className="form-section" key={group}><div className="subheading"><h3>{pretty(group)}</h3><button onClick={() => update({ [group]: [...settings[group], { label: "New link", href: `#${site.sections[0].id}` }] })} disabled={settings[group].length >= 20}>Add link +</button></div><p className="muted">{linkNotes[group]}</p>{settings[group].map((link, index) => <div className="link-row" key={index}><Field label="Label" value={link.label} onChange={(value) => update({ [group]: settings[group].map((entry, i) => i === index ? { ...entry, label: value } : entry) })} /><Field label="Destination" value={link.href} onChange={(value) => update({ [group]: settings[group].map((entry, i) => i === index ? { ...entry, href: value } : entry) })} /><button aria-label={`Move ${link.label} up`} disabled={index === 0} onClick={() => { const links = [...settings[group]]; [links[index - 1], links[index]] = [links[index], links[index - 1]]; update({ [group]: links }); }}>↑</button><button className="danger-text" onClick={() => update({ [group]: settings[group].filter((_, i) => i !== index) })}>Remove</button></div>)}</div>)}
    <div className="form-section"><h3>Contact form</h3><label className="toggle"><input type="checkbox" checked={settings.contact.enabled} onChange={(event) => update({ contact: { ...settings.contact, enabled: event.target.checked } })} />Accept messages</label><StringFields values={Object.fromEntries(Object.entries(settings.contact).filter(([, value]) => typeof value === "string")) as Record<string, string>} onChange={(key, value) => update({ contact: { ...settings.contact, [key]: value } })} /></div>
    <div className="form-section"><h3>Site labels</h3><StringFields values={settings.labels} hide={hiddenLabels} hints={labelHints} onChange={(key, value) => update({ labels: { ...settings.labels, [key]: value } })} /></div>
    <div className="form-section"><h3>Colours</h3><p className="muted">The site&apos;s colours (verdigris, antique brass and light patina on gunmetal) are part of its design and are set in the website&apos;s stylesheet, <code>app/globals.css</code>, so they stay consistent with the logo, glows and animation.</p></div>
  </fieldset></div>;
}
