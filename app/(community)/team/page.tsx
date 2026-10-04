import { EmptyState, PageLead } from "@/components/community/CommunityShell";
import { MemberPortrait } from "@/components/ui/MemberPortrait";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team | KN1GHTS" };
export default async function TeamPage() {
  const site = await getSiteContent(), members = site.sections.find((section) => section.type === "team")?.items ?? [];
  return <main className="community-page"><PageLead meta="OPERATORS" title="TEAM" description="Competitors, researchers and builders working the problem together." />{members.length ? <div className="team-directory">{members.map((member) => <article key={member.id}><MemberPortrait src={member.imageUrl || null} name={member.title} /><div><h2>{member.title}</h2><p>{member.body}</p><span>{member.meta || member.tags.join(" · ")}</span>{member.href && <a className="row-link" href={member.href} target="_blank" rel="noreferrer">PROFILE →</a>}</div></article>)}</div> : <EmptyState>No team profiles are published.</EmptyState>}</main>;
}
