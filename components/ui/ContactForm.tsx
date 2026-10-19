"use client";
import { useState, type FormEvent } from "react";
import type { SiteContent } from "@/backend/lib/schema";
import { formStatus, input, label, textarea } from "@/components/site/ui";

export function ContactForm({ settings, ready }: { settings: SiteContent["settings"]["contact"]; ready: boolean }) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const enabled = settings.enabled && ready;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || sending) return;
    const form = event.currentTarget, values = new FormData(form);
    setSending(true); setStatus("");
    const failed = "Your message could not be delivered. Please try again.";
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)), signal: AbortSignal.timeout(15000) });
      // A platform error page (502/504, HTML, plain text) is not JSON; fall back to the generic message.
      const result: { error?: unknown } = await response.json().catch(() => ({}));
      if (!response.ok) { setStatus(typeof result.error === "string" && result.error ? result.error : failed); return; }
      form.reset(); setStatus(settings.successMessage);
    } catch { setStatus(failed); }
    finally { setSending(false); }
  }
  return <form className="cyber-card p-8" onSubmit={submit} aria-busy={sending}>
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><label className={label} htmlFor="contact-name">{settings.nameLabel}<input className={input} id="contact-name" name="name" autoComplete="name" placeholder={settings.namePlaceholder} required minLength={2} maxLength={100} /></label><label className={label} htmlFor="contact-email">{settings.emailLabel}<input className={input} id="contact-email" name="email" type="email" autoComplete="email" placeholder={settings.emailPlaceholder} required maxLength={254} /></label></div>
      <label className={label} htmlFor="contact-message">{settings.messageLabel}<textarea className={textarea} id="contact-message" name="message" placeholder={settings.messagePlaceholder} required minLength={10} maxLength={5000} rows={5} /></label>
      <div className="contact-trap" aria-hidden="true"><label htmlFor="contact-website">Website<input id="contact-website" name="website" autoComplete="off" tabIndex={-1} /></label></div>
      <button className="cyber-button w-full" type="submit" disabled={!enabled || sending} aria-describedby="contact-status">{sending ? settings.sendingLabel : settings.buttonLabel}</button>
      <p id="contact-status" className={formStatus} role="status">{status || (!enabled ? settings.unavailableMessage : "")}</p>
    </div>
  </form>;
}
