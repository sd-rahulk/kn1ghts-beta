import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { configuration } from "@/lib/firebase-admin";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export default async function Login() {
  if (await getActor()) redirect("/");
  const status = configuration();
  return <main className="login-layout">
    <div className="login-intro"><a className="brand" href={process.env.PUBLIC_SITE_ORIGIN || "http://localhost:3000"}>KN1GHTS<span> / MANAGEMENT</span></a><div><span className="eyebrow">FOR THE TEAM</span><h1>Keep the site<br />moving.</h1><p>Content, messages, and a clear record of every change. One place to manage the public website.</p></div><span className="muted">Approved accounts only.</span></div>
    <div className="login-panel"><span className="eyebrow">{status.emulator ? "LOCAL FIREBASE EMULATORS" : "TEAM ACCESS"}</span><h2>Sign in</h2><p className="muted">Use your approved email and password.</p>
      {status.ready ? <LoginForm /> : <div className="setup-notice"><h3>Connect Firebase first</h3><p>Copy <code>.env.example</code> to <code>.env.local</code> in the backend folder, fill in these settings, and restart this app.</p><ul>{status.missing.map((key) => <li key={key}><code>{key}</code></li>)}</ul><p>For a local test, use <code>.env.emulator.example</code> instead. Full setup instructions are in <code>backend/README.md</code>.</p></div>}
    </div>
  </main>;
}
