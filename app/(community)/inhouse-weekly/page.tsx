import { FaFlag } from "react-icons/fa";
import { ChallengeSubmit } from "@/components/community/ChallengeSubmit";
import { EmptyState, PageBody, PageLead, SectionTitle, formatDate } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { accent, card, tag, textLink } from "@/components/site/ui";
import { platformOr, type ChallengePublicData } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "In-house Weekly Challenge | KN1GHTS" };
export default async function WeeklyPage() {
  const data = await platformOr<ChallengePublicData>("challenge", { active: null, leaderboard: [], archive: [] });
  return <>
    <PageLead meta="IN-HOUSE / WEEKLY" title="CHALLENGE" description="Anyone can inspect the brief. Verified members can submit flags and record a solve." icon={FaFlag} />
    {data.active ? <>
      <PageBody><div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <article className="lg:col-span-3 cyber-card p-8">
          <div className="flex flex-wrap gap-2 mb-6"><span className={tag}>{data.active.category}</span><span className={tag}>{data.active.difficulty}</span><span className={tag}>OPENS {formatDate(data.active.opensAt)}</span></div>
          <h2 className="font-cyber text-3xl font-bold text-white mb-4">{data.active.title}</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{data.active.description}</p>
          {data.active.resourceUrl && <a className={`${textLink} mt-6`} href={data.active.resourceUrl} target="_blank" rel="noreferrer">OPEN CHALLENGE RESOURCE<Arrow /></a>}
        </article>
        <aside className="lg:col-span-2 cyber-card p-8"><h2 className="font-cyber text-2xl font-bold mb-6"><span className="gradient-text">Submit</span></h2><ChallengeSubmit challengeId={data.active.id} /></aside>
      </div></PageBody>
      <PageBody narrow alt>
        <SectionTitle glow="Leaderboard" />
        {data.leaderboard.length ? <div className="space-y-4">{data.leaderboard.map((solve, index) => <div className={`relative pl-8 border-l-2 rounded-r-lg p-6 ${index === 0 ? "border-vapor-pink bg-vapor-pink/10 ring-1 ring-vapor-pink/50" : "border-vapor-border bg-vapor-card"}`} key={`${solve.handle}-${solve.solvedAt}`}>
          <div className={`absolute left-0 top-6 w-4 h-4 -translate-x-1/2 rounded-full ${index === 0 ? "bg-vapor-pink" : "bg-vapor-card border-2 border-vapor-border"}`} />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3"><span className="font-mono text-vapor-cyan">{String(index + 1).padStart(2, "0")}</span><h3 className="font-cyber text-xl font-semibold text-white">{solve.handle}</h3></div>
            <time className="font-mono text-sm text-gray-400">{formatDate(solve.solvedAt)}</time>
          </div>
        </div>)}</div> : <EmptyState>No solves recorded yet.</EmptyState>}
      </PageBody>
    </> : <PageBody><EmptyState>No weekly challenge is currently published.</EmptyState></PageBody>}
    {data.archive.length > 0 && <PageBody><SectionTitle glow="Previous" rest="challenges" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{data.archive.map((challenge, index) => <article className={`${card} flex flex-col`} key={challenge.id}>
        <FaFlag className={`w-12 h-12 ${accent(index).text} mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true" />
        <p className="font-mono text-sm text-vapor-pink uppercase mb-2">{challenge.category} / {challenge.difficulty}</p>
        <h3 className="font-cyber text-xl font-semibold text-white mb-2">{challenge.title}</h3>
        <p className="text-gray-400 leading-relaxed">{challenge.description.slice(0, 220)}</p>
      </article>)}</div>
    </PageBody>}
  </>;
}
