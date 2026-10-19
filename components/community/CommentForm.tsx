"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMember } from "./AuthProvider";
import { formStatus, label, primaryButton, textarea, textLink } from "@/components/site/ui";

export function CommentForm({ postId }: { postId: string }) {
  const { user, profile, loading, token } = useMember();
  const [body, setBody] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (loading) return <p className={formStatus}>Checking account…</p>;
  if (!user) return <p className={formStatus}><Link className={textLink} href="/sign-in">SIGN IN</Link> to join the discussion.</p>;
  if (!user.emailVerified) return <p className={formStatus}>Verify your email before commenting.</p>;
  if (!profile) return <p className={formStatus}><Link className={textLink} href="/account">CHOOSE A HANDLE</Link> before commenting.</p>;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/platform/blog/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ body }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit your comment.");
      setBody(""); setMessage("Comment submitted for moderation.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to submit your comment."); }
    finally { setBusy(false); }
  }
  return <form className="grid gap-6" onSubmit={submit}><label className={label}>COMMENT<textarea className={textarea} rows={5} value={body} onChange={(event) => setBody(event.target.value)} minLength={2} maxLength={3000} required placeholder="Add something useful to the discussion." /></label><button className={primaryButton} disabled={busy}>{busy ? "SUBMITTING…" : "SUBMIT FOR REVIEW"}</button><p className={formStatus} role="status">{message}</p></form>;
}
