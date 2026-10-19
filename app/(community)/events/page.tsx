import { FaCalendarAlt } from "react-icons/fa";
import type { CommunityEvent } from "@/backend/lib/schema";
import { EmptyState, PageBody, PageLead, SectionTitle, formatDate } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { tag, textLink } from "@/components/site/ui";
import { platformOr } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events | KN1GHTS" };
export default async function EventsPage() {
  const { items, now } = await platformOr<{ items: CommunityEvent[]; now: number }>("events", { items: [], now: 0 });
  const upcoming = items.filter((item) => item.startsAt >= now), previous = items.filter((item) => item.startsAt < now).reverse();
  const cards = (entries: CommunityEvent[]) => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{entries.map((event) => <article className="cyber-card p-6 text-center group hover:-translate-y-2 transition-all duration-300 flex flex-col items-center" key={event.id}>
    <div className="w-14 h-14 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gold/30 transition-colors duration-300"><FaCalendarAlt className="w-7 h-7 text-gold" aria-hidden="true" /></div>
    <time className="font-mono text-steel text-sm mb-2">{formatDate(event.startsAt)}</time>
    <h3 className="font-cyber text-lg font-semibold text-white mb-1">{event.title}</h3>
    <p className="text-gray-400 text-sm">{event.description}</p>
    <div className="flex flex-wrap justify-center gap-2 mt-4"><span className={tag}>{event.location || "ONLINE"}</span>{event.status === "cancelled" && <span className={tag}>CANCELLED</span>}</div>
    {event.registrationUrl && event.status !== "cancelled" && <a className={`${textLink} text-sm mt-4`} href={event.registrationUrl} target="_blank" rel="noreferrer">DETAILS<Arrow /></a>}
  </article>)}</div>;
  return <>
    <PageLead meta="CALENDAR" title="EVENTS" description="Upcoming competitions, sessions and public appearances from KN1GHTS." icon={FaCalendarAlt} />
    <PageBody>{upcoming.length ? cards(upcoming) : <EmptyState>No upcoming events are published.</EmptyState>}</PageBody>
    {previous.length > 0 && <PageBody alt><SectionTitle glow="Previous" rest="events" />{cards(previous)}</PageBody>}
  </>;
}
