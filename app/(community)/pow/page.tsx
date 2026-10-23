import { EmptyState, PageLead } from "@/components/community/CommunityShell";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proof of Work | KN1GHTS" };
export default async function PowPage() {
  const site = await getSiteContent(), results = site.sections.find((section) => section.type === "results")?.items ?? [];
  return <main className="community-page"><PageLead meta="CTF RECORD" title="PROOF OF WORK" description="Placements and competition results with links to their public record." />{results.length ? <div className="community-list">{results.map((item, index) => <article className="community-row" key={item.id}><span>{String(index + 1).padStart(2, "0")} / {item.label}</span><div><h2>{item.title}</h2><p>{item.body}</p></div>{item.href && <a className="row-link" href={item.href} target="_blank" rel="noreferrer">SOURCE →</a>}</article>)}</div> : <EmptyState>No competition results are published.</EmptyState>}</main>;
}
