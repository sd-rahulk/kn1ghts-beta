import { FaUsers } from "react-icons/fa";
import { EmptyState, PageBody, PageLead } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { textLink } from "@/components/site/ui";
import { MemberPortrait } from "@/components/ui/MemberPortrait";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team | KN1GHTS" };
export default async function TeamPage() {
  const site = await getSiteContent(), members = site.sections.find((section) => section.type === "team")?.items ?? [];
  return <>
    <PageLead meta="OPERATORS" title="TEAM" description="Competitors, researchers and builders working the problem together." icon={FaUsers} />
    <PageBody>{members.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{members.map((member) => <article className="cyber-card group hover:-translate-y-2 transition-all duration-300 overflow-hidden" key={member.id}>
      <div className="relative aspect-square w-full bg-ink-deep overflow-hidden"><MemberPortrait src={member.imageUrl || null} name={member.title} /></div>
      <div className="p-4">
        <h2 className="font-cyber text-base font-semibold text-white mb-1">{member.title}</h2>
        <p className="text-gray-400 text-xs leading-relaxed">{member.body}</p>
        {(member.meta || member.tags.length > 0) && <p className="font-mono text-xs text-ember mt-2">{member.meta || member.tags.join(" · ")}</p>}
        {member.href && <a className={`${textLink} text-sm mt-3`} href={member.href} target="_blank" rel="noreferrer">PROFILE<Arrow /></a>}
      </div>
    </article>)}</div> : <EmptyState>No team profiles are published.</EmptyState>}</PageBody>
  </>;
}
