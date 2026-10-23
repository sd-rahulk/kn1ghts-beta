import Link from "next/link";
import { AuthForm } from "@/components/community/AuthForms";

export const metadata = { title: "Sign in | KN1GHTS" };
export default function SignInPage() { return <main className="community-page auth-layout"><div className="auth-copy"><h1>RETURN TO THE ARENA.</h1><p>Sign in with your verified email to submit weekly challenge flags and join moderated blog discussions.</p><p>New here? <Link className="row-link" href="/sign-up">CREATE AN ACCOUNT →</Link></p></div><section className="auth-panel"><h2>Sign in</h2><AuthForm mode="sign-in" /></section></main>; }
