"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

function messageFor(error: unknown) {
  const code = (error as { code?: string }).code;
  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in or reset its password.";
  if (code === "auth/invalid-credential") return "The email or password is incorrect.";
  if (code === "auth/weak-password") return "Use a stronger password with at least eight characters.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(false), [needsVerification, setNeedsVerification] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false); setNeedsVerification(false);
    try {
      const auth = await clientAuth();
      if (mode === "sign-up") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: handle.trim() });
        const response = await fetch("/api/platform/profile", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await result.user.getIdToken(true)}` }, body: JSON.stringify({ handle: handle.trim() }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to create your public profile.");
        await sendEmailVerification(result.user);
        await signOut(auth);
        setMessage("Account created. Open the verification link in your email, then sign in.");
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!result.user.emailVerified) { setNeedsVerification(true); setMessage("Verify your email before participating. You can send a new verification link below."); return; }
        router.replace("/account"); router.refresh();
      }
    } catch (reason) { setError(true); setMessage(messageFor(reason)); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(false);
    try { const auth = await clientAuth(); if (!auth.currentUser) throw new Error("Sign in again first."); await sendEmailVerification(auth.currentUser); setMessage("Verification email sent. Open it, then return and sign in."); }
    catch (reason) { setError(true); setMessage(messageFor(reason)); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (!email.trim()) { setError(true); setMessage("Enter your email address first."); return; }
    setBusy(true); setError(false);
    try { await sendPasswordResetEmail(await clientAuth(), email.trim()); setMessage("If the account exists, a password reset email is on its way."); }
    catch { setMessage("If the account exists, a password reset email is on its way."); }
    finally { setBusy(false); }
  }
  return <form className="community-form" onSubmit={submit} aria-busy={busy}>
    {mode === "sign-up" && <label>PUBLIC HANDLE<input value={handle} onChange={(event) => setHandle(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_-]+" autoComplete="nickname" required placeholder="0xhandle" /></label>}
    <label>EMAIL<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required /></label>
    <label>PASSWORD<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} minLength={8} maxLength={128} required /></label>
    <button disabled={busy}>{busy ? "WORKING…" : mode === "sign-up" ? "CREATE ACCOUNT" : "SIGN IN"}</button>
    {needsVerification && <button type="button" onClick={resend} disabled={busy}>SEND VERIFICATION EMAIL</button>}
    {mode === "sign-in" && <button className="text-action" type="button" onClick={reset} disabled={busy}>RESET PASSWORD</button>}
    <p className={`form-status${error ? " error" : ""}`} role="status">{message}</p>
  </form>;
}
