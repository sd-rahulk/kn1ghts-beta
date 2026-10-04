import type { CommunityEvent } from "@/backend/lib/schema";
import { EmptyState, PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformOr } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events | KN1GHTS" };
export default async function EventsPage() {
  const { items, now } = await platformOr<{ items: CommunityEvent[]; now: number }>("events", { items: [], now: 0 });
  const upcoming = items.filter((item) => item.startsAt >= now), previous = items.filter((item) => item.startsAt < now).reverse();
  const rows = (entries: CommunityEvent[]) => <div className="community-list">{entries.map((event) => <article className="community-row" key={event.id}><time>{formatDate(event.startsAt)}</time><div><h2>{event.title}</h2><p>{event.description}</p><p className="record-meta">{event.location || "ONLINE"}{event.status === "cancelled" ? " · CANCELLED" : ""}</p></div>{event.registrationUrl && event.status !== "cancelled" && <a className="row-link" href={event.registrationUrl} target="_blank" rel="noreferrer">DETAILS →</a>}</article>)}</div>;
  return <main className="community-page"><PageLead meta="CALENDAR" title="EVENTS" description="Upcoming competitions, sessions and public appearances from KN1GHTS." />{upcoming.length ? rows(upcoming) : <EmptyState>No upcoming events are published.</EmptyState>}{previous.length > 0 && <section><h2 className="section-title">Previous events</h2>{rows(previous)}</section>}</main>;
}
