"use client";
import { useState } from "react";
import initial from "@/content/default.json";
import { SECTION_TYPES, sectionSchema, sectionTypeNames, type SiteContent, type SiteSection, type SectionItem } from "@/lib/schema";
import { Field, StringFields } from "./Fields";

function template(type: SiteSection["type"]): SiteSection {
  const value = initial.sections.find((section) => section.type === type);
  return value ? sectionSchema.parse(structuredClone(value)) : { id: "content", type, enabled: true, eyebrow: "NEW SECTION", title: "New section", description: "", fields: { ctaLabel: "", ctaHref: "" }, items: [] };
}
const emptyItem = (): SectionItem => ({ id: `item-${crypto.randomUUID()}`, title: "New item", body: "", label: "", href: "", imageUrl: "", date: "", meta: "", tags: [] });
export function SectionEditor({ site, onChange, readOnly }: { site: SiteContent; onChange: (value: SiteContent) => void; readOnly: boolean }) {
  const [selected, setSelected] = useState(site.sections[0]?.id || "");
  const [addType, setAddType] = useState<SiteSection["type"]>("content");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const section = site.sections.find((entry) => entry.id === selected) ?? site.sections[0];
  const update = (patch: Partial<SiteSection>) => onChange({ ...site, sections: site.sections.map((entry) => entry.id === section.id ? { ...entry, ...patch } : entry) });
  function move(index: number, direction: number) {
    const sections = [...site.sections];
    [sections[index], sections[index + direction]] = [sections[index + direction], sections[index]];
    onChange({ ...site, sections });
  }
  function add() {
    if (site.sections.length >= 32) return;
    if (addType === "contact" && site.sections.some((entry) => entry.type === "contact")) return;
    const newSection = template(addType);
    newSection.id = `${addType}-${crypto.randomUUID().slice(0, 8)}`;
    newSection.items = [];
    onChange({ ...site, sections: [...site.sections, newSection] });
    setSelected(newSection.id);
  }
  function remove() {
    if (!removeId || site.sections.length <= 1) return;
    onChange({ ...site, sections: site.sections.filter((entry) => entry.id !== removeId), settings: { ...site.settings, navigation: site.settings.navigation.filter((entry) => entry.href !== `#${removeId}`), footerLinks: site.settings.footerLinks.filter((entry) => entry.href !== `#${removeId}`) } });
    setRemoveId(null);
  }
  const updateItem = (id: string, patch: Partial<SectionItem>) => update({ items: section.items.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  return <div className="editor-layout">
    <aside className="section-list"><div className="section-list-head"><h2>Page order</h2><span>{site.sections.length} sections</span></div>
      <ol>{site.sections.map((entry, index) => <li key={entry.id} className={section.id === entry.id ? "selected" : ""}><button className="section-select" onClick={() => { setSelected(entry.id); setRemoveId(null); }}><span className="row-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{entry.eyebrow || entry.title.split("\n")[0]}</strong><small>{sectionTypeNames[entry.type]}{!entry.enabled && " · Hidden"}</small></span></button><div className="reorder"><button aria-label={`Move ${entry.eyebrow} up`} disabled={readOnly || index === 0} onClick={() => move(index, -1)}>↑</button><button aria-label={`Move ${entry.eyebrow} down`} disabled={readOnly || index === site.sections.length - 1} onClick={() => move(index, 1)}>↓</button></div></li>)}</ol>
      {!readOnly && <div className="add-section"><label htmlFor="new-section-type">Add a section</label><select id="new-section-type" value={addType} onChange={(event) => setAddType(event.target.value as SiteSection["type"])}>{SECTION_TYPES.filter((type) => type !== "contact" || !site.sections.some((entry) => entry.type === "contact")).map((type) => <option key={type} value={type}>{sectionTypeNames[type]}</option>)}</select><button disabled={site.sections.length >= 32} onClick={add}>Add section +</button></div>}
    </aside>
    <div className="section-editor" key={section.id}><div className="editor-heading"><div><span className="eyebrow">{sectionTypeNames[section.type]}</span><h2>{section.eyebrow || "Section content"}</h2><code>#{section.id}</code></div><label className="toggle"><input type="checkbox" checked={section.enabled} onChange={(event) => update({ enabled: event.target.checked })} disabled={readOnly} /><span>Visible on site</span></label></div>
      <fieldset disabled={readOnly}><div className="fields-grid"><Field label="Section label" value={section.eyebrow} onChange={(value) => update({ eyebrow: value })} /><label className="field">Layout<select value={section.type} onChange={(event) => { const type = event.target.value as SiteSection["type"]; update({ type, fields: { ...template(type).fields, ...section.fields } }); }}>{SECTION_TYPES.filter((type) => type !== "contact" || section.type === "contact" || !site.sections.some((entry) => entry.type === "contact")).map((type) => <option key={type} value={type}>{sectionTypeNames[type]}</option>)}</select></label></div><Field label="Heading" value={section.title} multiline onChange={(value) => update({ title: value })} hint="Use a new line for a line break. Put accent text inside [[double brackets]]." /><Field label="Description" value={section.description} multiline onChange={(value) => update({ description: value })} />
      {Object.keys(section.fields).length > 0 && <div className="form-section"><h3>Section details</h3><StringFields values={section.fields} onChange={(key, value) => update({ fields: { ...section.fields, [key]: value } })} /></div>}
      <div className="form-section"><div className="subheading"><h3>{section.type === "team" ? "Members" : "Items"} <span>{section.items.length}</span></h3><button type="button" disabled={section.items.length >= 100} onClick={() => { const item = emptyItem(); update({ items: [...section.items, item] }); setOpenItem(item.id); }}>Add item +</button></div>
        {section.items.length === 0 && <p className="empty-inline">No items yet. This section uses its empty-state copy where available.</p>}
        {section.items.map((item, index) => <div className="item-editor" key={item.id}><div className="item-heading"><button type="button" className="item-disclosure" aria-expanded={readOnly || openItem === item.id} onClick={() => setOpenItem(openItem === item.id ? null : item.id)}><span>{String(index + 1).padStart(2, "0")}</span>{item.title || "Untitled item"}<span>{openItem === item.id ? "−" : "+"}</span></button><button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => { const items = [...section.items]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; update({ items }); }}>↑</button><button type="button" className="danger-text" aria-label={`Remove ${item.title}`} onClick={() => update({ items: section.items.filter((entry) => entry.id !== item.id) })}>Remove</button></div>{(readOnly || openItem === item.id) && <div className="item-fields"><Field label={section.type === "team" ? "Name / handle" : "Title"} value={item.title} onChange={(value) => updateItem(item.id, { title: value })} /><Field label={section.type === "team" ? "Role" : "Body / summary"} value={item.body} multiline onChange={(value) => updateItem(item.id, { body: value })} /><div className="fields-grid"><Field label="Label / category / placement" value={item.label} onChange={(value) => updateItem(item.id, { label: value })} /><Field label="Link URL" value={item.href} onChange={(value) => updateItem(item.id, { href: value })} /><Field label="Image URL" value={item.imageUrl} onChange={(value) => updateItem(item.id, { imageUrl: value })} /><Field label="Date" type="date" value={item.date} onChange={(value) => updateItem(item.id, { date: value })} /><Field label="Additional detail / link label" value={item.meta} onChange={(value) => updateItem(item.id, { meta: value })} /><Field label="Tags (comma separated)" value={item.tags.join(", ")} onChange={(value) => updateItem(item.id, { tags: value.split(",").map((entry) => entry.trim()).filter(Boolean) })} /></div></div>}</div>)}
      </div></fieldset>
      {!readOnly && <div className="remove-section">{removeId === section.id ? <><p>Remove this section from the draft? Navigation links to it will also be removed. Check any buttons that point here before publishing.</p><button className="danger" onClick={remove}>Confirm removal</button><button onClick={() => setRemoveId(null)}>Keep section</button></> : <button className="danger-text" disabled={site.sections.length <= 1} onClick={() => setRemoveId(section.id)}>Remove section</button>}</div>}
    </div>
  </div>;
}
