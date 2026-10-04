"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./AuthProvider";

function HandleEditor({ initial, token, refreshProfile }: { initial: string; token: () => Promise<string>; refreshProfile: () => Promise<void> }) {
  const [handle, setHandle] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/profile", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ handle }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save your handle.");
      await refreshProfile(); setMessage("Public handle saved.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Unable to save your handle."); }
    finally { setBusy(false); }
  }
  return <form className="community-form" onSubmit={save}><label>PUBLIC HANDLE<input value={handle} onChange={(event) => setHandle(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" required /></label><button disabled={busy}>{busy ? "SAVING…" : "SAVE HANDLE"}</button><p className="form-status" role="status">{message}</p></form>;
}

export function AccountPanel() {
  const router = useRouter();
  const { user, profile, loading, error: authError, token, refreshProfile, logout } = useMember();
  if (loading) return <p className="community-empty">Loading your account…</p>;
  if (!user) return <div className="community-empty"><p>Sign in to manage your profile and participate.</p><Link className="row-link" href="/sign-in">SIGN IN →</Link></div>;
  return <div className="auth-panel"><h2>{profile ? profile.handle : "Finish your profile"}</h2><p className="record-meta">{user.email}<br />{user.emailVerified ? "EMAIL VERIFIED" : "EMAIL VERIFICATION REQUIRED"}</p>{authError && <p className="form-status error">{authError}</p>}
    <HandleEditor key={profile?.handle ?? "new-profile"} initial={profile?.handle ?? ""} token={token} refreshProfile={refreshProfile} />
    <button className="community-action" onClick={() => void logout().then(() => { router.replace("/sign-in"); router.refresh(); })}>SIGN OUT</button>
  </div>;
}
