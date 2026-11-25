import { EmptyState, PageLead } from "@/components/community/CommunityShell";
import { MemberPortrait } from "@/components/ui/MemberPortrait";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "CTF Team Members",
  description: "Meet the kn1ghts cybersecurity and Capture the Flag team from India. Explore member profiles, technical interests and competitive security work.",
  alternates: { canonical: "https://kn1ghts.org/team" },
  openGraph: { title: "CTF Team Members | kn1ghts", description: "Meet the kn1ghts cybersecurity and Capture the Flag team from India. Explore member profiles, technical interests and competitive security work.", url: "https://kn1ghts.org/team", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "CTF Team Members | kn1ghts", description: "Meet the kn1ghts cybersecurity and Capture the Flag team from India. Explore member profiles, technical interests and competitive security work." },
};
export default async function TeamPage() {
  const site = await getSiteContent(), members = site.sections.find((section) => section.type === "team")?.items ?? [];
  return <main className="community-page"><PageLead meta="THE ROSTER" title="TEAM" description="Meet the kn1ghts Capture the Flag (CTF) team from India: competitors, researchers and builders working together on cybersecurity problems. Member profiles below describe their roles, interests and links to their work." />{members.length ? <div className="team-directory">{members.map((member) => <article key={member.id}><MemberPortrait src={member.imageUrl || null} name={member.title} /><div><h2>{member.title}</h2><p>{member.body}</p><span>{member.meta || member.tags.join(" · ")}</span>{member.href && <a className="row-link" href={member.href} target="_blank" rel="noreferrer">PROFILE →</a>}</div></article>)}</div> : <EmptyState>No team profiles are published.</EmptyState>}</main>;
}

