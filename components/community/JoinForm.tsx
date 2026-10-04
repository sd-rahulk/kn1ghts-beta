"use client";
import { useState, type FormEvent } from "react";

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
  return <form className="community-form" onSubmit={submit}>
    <label>NAME<input value={form.name} onChange={(event) => update("name", event.target.value)} minLength={2} maxLength={100} required /></label>
    <label>EMAIL<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={254} required /></label>
    <label>PUBLIC HANDLE<input value={form.handle} onChange={(event) => update("handle", event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" required /></label>
    <label>PRIMARY DISCIPLINE<select value={form.discipline} onChange={(event) => update("discipline", event.target.value)} required><option value="">Choose one</option><option>Web</option><option>Pwn</option><option>Reverse Engineering</option><option>Cryptography</option><option>Forensics</option><option>OSINT</option><option>Cloud</option><option>Hardware</option><option>Other</option></select></label>
    <label>PORTFOLIO OR GITHUB URL<input type="url" value={form.portfolioUrl} onChange={(event) => update("portfolioUrl", event.target.value)} maxLength={2000} placeholder="https://" /></label>
    <label>WHY DO YOU WANT TO JOIN?<textarea value={form.message} onChange={(event) => update("message", event.target.value)} minLength={20} maxLength={5000} required /></label>
    <label className="contact-trap" aria-hidden="true">WEBSITE<input value={form.website} onChange={(event) => update("website", event.target.value)} tabIndex={-1} autoComplete="off" /></label>
    <button disabled={busy}>{busy ? "SENDING…" : "SEND APPLICATION"}</button><p className="form-status" role="status">{message}</p>
  </form>;
}
