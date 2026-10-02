"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setVerification(false);
    try {
      const auth = await clientAuth();
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!result.user.emailVerified) { setVerification(true); setMessage("Your email needs verification. Request a verification email below, then sign in again after verifying."); return; }
      const idToken = await result.user.getIdToken(true);
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.token }, body: JSON.stringify({ idToken }) });
      const data = await response.json();
      await signOut(auth);
      if (!response.ok) throw new Error(data.error || "Unable to start a session.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage(code === "auth/too-many-requests" ? "Too many attempts. Wait a moment and try again." : code ? "Check your email and password, then try again." : error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage("Enter your email above first."); return; }
    setBusy(true);
    try { await sendPasswordResetEmail(await clientAuth(), email.trim()); setMessage("If this email has an account, a password reset link will arrive shortly."); }
    catch { setMessage("If this email has an account, a password reset link will arrive shortly. If it does not arrive, contact the site owner."); }
    finally { setBusy(false); }
  }
  async function verifyEmail() {
    setBusy(true);
    try {
      const auth = await clientAuth();
      if (!auth.currentUser) throw new Error("Sign in again first.");
      await sendEmailVerification(auth.currentUser);
      await signOut(auth); setVerification(false); setMessage("Verification email sent. Open the link, then sign in again.");
    } catch { setMessage("Unable to send verification. Wait a moment, then sign in and retry."); }
    finally { setBusy(false); }
  }
  return <form className="login-form" onSubmit={submit} aria-busy={busy}>
    <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
    <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={128} /></label>
    <button className="primary" disabled={busy}>{busy ? "Please wait…" : "Sign in"}<span aria-hidden="true">→</span></button>
    {verification && <button type="button" disabled={busy} onClick={verifyEmail}>Send verification email</button>}
    <button className="text-button" type="button" disabled={busy} onClick={resetPassword}>Set up or reset your password</button>
    <p className="form-message" role="status">{message}</p>
  </form>;
}
