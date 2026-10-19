"use client";
import { useState, type FormEvent } from "react";
import { formStatus, input, label, primaryButton, textarea } from "@/components/site/ui";

const initial = { name: "", email: "", handle: "", discipline: "", portfolioUrl: "", message: "", website: "" };
export function JoinForm() {
  const [form, setForm] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to send your application.");
      setForm(initial); setMessage("Application received. The team will review it in the private inbox.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to send your application."); }
    finally { setBusy(false); }
  }
  return <form className="grid gap-6" onSubmit={submit}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <label className={label}>NAME<input className={input} value={form.name} onChange={(event) => update("name", event.target.value)} minLength={2} maxLength={100} required /></label>
      <label className={label}>EMAIL<input className={input} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={254} required /></label>
    </div>
    <label className={label}>PUBLIC HANDLE<input className={input} value={form.handle} onChange={(event) => update("handle", event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" required /></label>
    <label className={label}>PRIMARY DISCIPLINE<select className={input} value={form.discipline} onChange={(event) => update("discipline", event.target.value)} required><option value="">Choose one</option><option>Web</option><option>Pwn</option><option>Reverse Engineering</option><option>Cryptography</option><option>Forensics</option><option>OSINT</option><option>Cloud</option><option>Hardware</option><option>Other</option></select></label>
    <label className={label}>PORTFOLIO OR GITHUB URL<input className={input} type="url" value={form.portfolioUrl} onChange={(event) => update("portfolioUrl", event.target.value)} maxLength={2000} placeholder="https://" /></label>
    <label className={label}>WHY DO YOU WANT TO JOIN?<textarea className={textarea} rows={5} value={form.message} onChange={(event) => update("message", event.target.value)} minLength={20} maxLength={5000} required /></label>
    <label className="contact-trap" aria-hidden="true">WEBSITE<input value={form.website} onChange={(event) => update("website", event.target.value)} tabIndex={-1} autoComplete="off" /></label>
    <button className={primaryButton} disabled={busy}>{busy ? "SENDING…" : "SEND APPLICATION"}</button><p className={formStatus} role="status">{message}</p>
  </form>;
}
