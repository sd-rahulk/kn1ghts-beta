import { EmptyState, PageLead } from "@/components/community/CommunityShell";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "CTF Results and Achievements",
  description: "Explore kn1ghts Capture the Flag competition placements, cybersecurity achievements and links to the public records behind our results.",
  alternates: { canonical: "https://kn1ghts.org/pow" },
  openGraph: { title: "CTF Results and Achievements | kn1ghts", description: "Explore kn1ghts Capture the Flag competition placements, cybersecurity achievements and links to the public records behind our results.", url: "https://kn1ghts.org/pow", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "CTF Results and Achievements | kn1ghts", description: "Explore kn1ghts Capture the Flag competition placements, cybersecurity achievements and links to the public records behind our results." },
};
export default async function PowPage() {
  const site = await getSiteContent(), results = site.sections.find((section) => section.type === "results")?.items ?? [];
  return <main className="community-page"><PageLead meta="CTF RECORD" title="PROOF OF WORK" description="Placements and competition results with links to their public record." />{results.length ? <div className="community-list">{results.map((item, index) => <article className="community-row" key={item.id}><span>{String(index + 1).padStart(2, "0")} / {item.label}</span><div><h2>{item.title}</h2><p>{item.body}</p></div>{item.href && <a className="row-link" href={item.href} target="_blank" rel="noreferrer">SOURCE →</a>}</article>)}</div> : <EmptyState>No competition results are published.</EmptyState>}</main>;
}
