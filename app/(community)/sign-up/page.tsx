import Link from "next/link";
import { AuthForm } from "@/components/community/AuthForms";

export const metadata = { title: "Create account | KN1GHTS" };
export default function SignUpPage() { return <main className="community-page auth-layout"><div className="auth-copy"><h1>ENTER THE FIELD.</h1><p>Create a public KN1GHTS account with email and password. Your email must be verified before you can comment or submit challenge flags.</p><p>Already registered? <Link className="row-link" href="/sign-in">SIGN IN →</Link></p></div><section className="auth-panel"><h2>Create account</h2><AuthForm mode="sign-up" /></section></main>; }
