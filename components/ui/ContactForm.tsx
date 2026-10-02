"use client";
import { useState, type FormEvent } from "react";
import type { SiteContent } from "@/backend/lib/schema";

export function ContactForm({ settings, ready }: { settings: SiteContent["settings"]["contact"]; ready: boolean }) {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const enabled = settings.enabled && ready;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || sending) return;
    const form = event.currentTarget, values = new FormData(form);
    setSending(true); setStatus("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your message could not be delivered. Please try again.");
      form.reset(); setStatus(settings.successMessage);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Your message could not be delivered. Please try again."); }
    finally { setSending(false); }
  }
  return <form className="contact-form" onSubmit={submit} aria-busy={sending}>
    <div className="contact-fields"><label htmlFor="contact-name">{settings.nameLabel}<input id="contact-name" name="name" autoComplete="name" placeholder={settings.namePlaceholder} required minLength={2} maxLength={100} /></label><label htmlFor="contact-email">{settings.emailLabel}<input id="contact-email" name="email" type="email" autoComplete="email" placeholder={settings.emailPlaceholder} required maxLength={254} /></label></div>
    <label htmlFor="contact-message">{settings.messageLabel}<textarea id="contact-message" name="message" placeholder={settings.messagePlaceholder} required minLength={10} maxLength={5000} rows={5} /></label>
    <div className="contact-trap" aria-hidden="true"><label htmlFor="contact-website">Website<input id="contact-website" name="website" autoComplete="off" tabIndex={-1} /></label></div>
    <button className="network-cta" type="submit" disabled={!enabled || sending} aria-describedby="contact-status"><span>{sending ? settings.sendingLabel : settings.buttonLabel}</span><b aria-hidden="true">↗</b></button>
    <p id="contact-status" className="contact-status" role="status">{status || (!enabled ? settings.unavailableMessage : "")}</p>
  </form>;
}
