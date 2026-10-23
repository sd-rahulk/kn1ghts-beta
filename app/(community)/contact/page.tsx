import { JoinForm } from "@/components/community/JoinForm";

export const metadata = { title: "Join | KN1GHTS" };
export default function ContactPage() { return <main className="community-page join-layout"><div className="join-copy"><h1>JOIN THE COLLECTIVE.</h1><p>Tell us what you work on, how you learn and where we can see your work. Applications arrive in the private KN1GHTS management inbox.</p><p>For collaborations or event invitations, use the general contact form on the main landing page.</p></div><section className="join-panel"><JoinForm /></section></main>; }
