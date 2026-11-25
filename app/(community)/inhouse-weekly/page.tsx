import { ChallengeSubmit } from "@/components/community/ChallengeSubmit";
import { EmptyState, PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformOr, type ChallengePublicData } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Weekly CTF Challenges",
  description: "Explore kn1ghts weekly cybersecurity challenges, their categories and difficulty, previous briefs and the verified member solve leaderboard.",
  alternates: { canonical: "https://kn1ghts.org/inhouse-weekly" },
  openGraph: { title: "Weekly CTF Challenges | kn1ghts", description: "Explore kn1ghts weekly cybersecurity challenges, their categories and difficulty, previous briefs and the verified member solve leaderboard.", url: "https://kn1ghts.org/inhouse-weekly", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "Weekly CTF Challenges | kn1ghts", description: "Explore kn1ghts weekly cybersecurity challenges, their categories and difficulty, previous briefs and the verified member solve leaderboard." },
};
export default async function WeeklyPage() {
  const data = await platformOr<ChallengePublicData>("challenge", { active: null, leaderboard: [], archive: [] });
  return <main className="community-page"><PageLead meta="IN-HOUSE / WEEKLY" title="CHALLENGE" description="The kn1ghts weekly challenge is a Capture the Flag practice activity. Anyone can inspect a published brief, including its category and difficulty. Verified members can submit flags and record a solve; the leaderboard records successful submissions. Only designated challenge resources are authorized testing targets." />{data.active ? <><div className="challenge-layout"><article className="challenge-brief"><div className="challenge-facts"><span>{data.active.category}</span><span>{data.active.difficulty}</span><span>OPENS {formatDate(data.active.opensAt)}</span></div><h2>{data.active.title}</h2><p>{data.active.description}</p>{data.active.resourceUrl && <a className="row-link" href={data.active.resourceUrl} target="_blank" rel="noreferrer">OPEN CHALLENGE RESOURCE →</a>}</article><aside className="challenge-panel"><h2>Submit</h2><ChallengeSubmit challengeId={data.active.id} /></aside></div><section className="leaderboard"><h2>Leaderboard</h2>{data.leaderboard.length ? data.leaderboard.map((solve, index) => <div className="leaderboard-row" key={`${solve.handle}-${solve.solvedAt}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{solve.handle}</strong><time>{formatDate(solve.solvedAt)}</time></div>) : <EmptyState>No solves recorded yet.</EmptyState>}</section></> : <EmptyState>No weekly challenge is currently published.</EmptyState>}{data.archive.length > 0 && <section><h2 className="section-title">Previous challenges</h2><div className="community-list">{data.archive.map((challenge) => <article className="community-row" key={challenge.id}><span>{challenge.category}</span><div><h3>{challenge.title}</h3><p>{challenge.description.slice(0, 220)}</p></div><span className="record-meta">{challenge.difficulty}</span></article>)}</div></section>}</main>;
}
