"use client";
import { useId } from "react";

export function pretty(value: string) { return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()); }
export function Field({ label, value, onChange, multiline = false, type = "text", hint, disabled = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; type?: string; hint?: string; disabled?: boolean }) {
  const id = useId();
  return <label className="field" htmlFor={id}><span>{label}</span>{multiline ? <textarea id={id} rows={value.split("\n").length > 3 ? 5 : 3} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} /> : <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />}{hint && <small>{hint}</small>}</label>;
}
// `hide` drops keys the public site no longer displays (their stored values are kept untouched);
// `hints` explains where each remaining field appears on the site.
export function StringFields({ values, onChange, disabled, hide, hints = {} }: { values: Record<string, string>; onChange: (key: string, value: string) => void; disabled?: boolean; hide?: ReadonlySet<string>; hints?: Readonly<Record<string, string>> }) {
  return <div className="fields-grid">{Object.entries(values).filter(([key]) => !hide?.has(key)).map(([key, value]) => <Field key={key} label={pretty(key)} value={value} multiline={!/(?:href|url|label|status|mark)$/i.test(key)} hint={hints[key]} onChange={(next) => onChange(key, next)} disabled={disabled} />)}</div>;
}
