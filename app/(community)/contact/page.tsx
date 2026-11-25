import { JoinForm } from "@/components/community/JoinForm";

export const metadata = {
  title: "Join the CTF Team",
  description: "Apply to join kn1ghts, an Indian cybersecurity and CTF team. Share your technical interests, learning experience and examples of your work.",
  alternates: { canonical: "https://kn1ghts.org/contact" },
  openGraph: { title: "Join the CTF Team | kn1ghts", description: "Apply to join kn1ghts, an Indian cybersecurity and CTF team. Share your technical interests, learning experience and examples of your work.", url: "https://kn1ghts.org/contact", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "Join the CTF Team | kn1ghts", description: "Apply to join kn1ghts, an Indian cybersecurity and CTF team. Share your technical interests, learning experience and examples of your work." },
};
export default function ContactPage() { return <main className="community-page join-layout"><div className="join-copy"><h1>JOIN THE COLLECTIVE.</h1><p>Tell us what you work on, how you learn and where we can see your work. Applications arrive in the private KN1GHTS management inbox.</p><p>For collaborations or event invitations, include the details in the form below. If you are applying to join kn1ghts, describe your primary cybersecurity discipline, your practical experience, and a project or CTF writeup that demonstrates how you approach problems.</p></div><section className="join-panel"><JoinForm /></section></main>; }
