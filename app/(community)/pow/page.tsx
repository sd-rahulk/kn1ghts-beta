import { FaTrophy } from "react-icons/fa";
import { EmptyState, PageBody, PageLead } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { card, textLink } from "@/components/site/ui";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proof of Work | KN1GHTS" };
export default async function PowPage() {
  const site = await getSiteContent(), results = site.sections.find((section) => section.type === "results")?.items ?? [];
  return <>
    <PageLead meta="CTF RECORD" title="PROOF OF WORK" description="Placements and competition results with links to their public record." icon={FaTrophy} />
    <PageBody>{results.length ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{results.map((item) => <article className={`${card} text-center flex flex-col items-center`} key={item.id}>
      <div className="font-cyber text-4xl md:text-5xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform duration-300">{item.label}</div>
      <h2 className="font-cyber text-xl font-semibold text-white mb-2">{item.title}</h2>
      <p className="text-gray-400 leading-relaxed">{item.body}</p>
      {item.href && <a className={`${textLink} mt-auto pt-4`} href={item.href} target="_blank" rel="noreferrer">SOURCE<Arrow /></a>}
    </article>)}</div> : <EmptyState>No competition results are published.</EmptyState>}</PageBody>
  </>;
}
