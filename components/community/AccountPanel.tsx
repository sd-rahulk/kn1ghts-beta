"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "./AuthProvider";
import { formStatus, formStatusError, input, label, mutedButton, primaryButton } from "@/components/site/ui";

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
  return <form className="grid gap-6" onSubmit={save}><label className={label}>PUBLIC HANDLE<input className={input} value={handle} onChange={(event) => setHandle(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" required /></label><button className={primaryButton} disabled={busy}>{busy ? "SAVING…" : "SAVE HANDLE"}</button><p className={formStatus} role="status">{message}</p></form>;
}

export function AccountPanel() {
  const router = useRouter();
  const { user, profile, loading, error: authError, token, refreshProfile, logout } = useMember();
  if (loading) return <p className="text-gray-400">Loading your account…</p>;
  if (!user) return <div className="grid gap-6"><p className="text-gray-400">Sign in to manage your profile and participate.</p><Link className={primaryButton} href="/sign-in">SIGN IN</Link></div>;
  return <div className="grid gap-6"><div><h2 className="font-cyber text-2xl font-bold mb-2"><span className="gradient-text">{profile ? profile.handle : "Finish your profile"}</span></h2><p className="font-mono text-sm text-gray-400">{user.email}<br /><span className={user.emailVerified ? "text-patina" : "text-verdigris"}>{user.emailVerified ? "EMAIL VERIFIED" : "EMAIL VERIFICATION REQUIRED"}</span></p></div>{authError && <p className={formStatusError}>{authError}</p>}
    <HandleEditor key={profile?.handle ?? "new-profile"} initial={profile?.handle ?? ""} token={token} refreshProfile={refreshProfile} />
    <button className={mutedButton} onClick={() => void logout().then(() => { router.replace("/sign-in"); router.refresh(); })}>SIGN OUT</button>
  </div>;
}
