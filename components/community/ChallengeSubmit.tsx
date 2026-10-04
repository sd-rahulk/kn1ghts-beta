"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMember } from "./AuthProvider";

export function ChallengeSubmit({ challengeId }: { challengeId: string }) {
  const { user, profile, loading, token } = useMember();
  const [flag, setFlag] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (loading) return <p className="form-status">Checking account…</p>;
  if (!user) return <p className="form-status"><Link className="row-link" href="/sign-in">SIGN IN</Link> to submit a flag.</p>;
  if (!user.emailVerified) return <p className="form-status">Verify your email before submitting flags.</p>;
  if (!profile) return <p className="form-status"><Link className="row-link" href="/account">CHOOSE A HANDLE</Link> before submitting.</p>;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/platform/challenge/${challengeId}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ flag }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit the flag.");
      setMessage(data.correct ? data.alreadySolved ? "Already solved. Your leaderboard entry is recorded." : "Correct flag. Solve recorded." : "Incorrect flag. Check your work and try again.");
      if (data.correct) setFlag("");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to submit the flag."); }
    finally { setBusy(false); }
  }
  return <form className="community-form" onSubmit={submit}><label>FLAG<input value={flag} onChange={(event) => setFlag(event.target.value)} maxLength={500} autoComplete="off" spellCheck={false} placeholder="KN1GHTS{...}" required /></label><button disabled={busy}>{busy ? "CHECKING…" : "SUBMIT FLAG"}</button><p className="form-status" role="status">{message}</p></form>;
}
