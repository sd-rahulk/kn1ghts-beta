"use client";
import { useEffect, useState } from "react";
import type { Message } from "@/lib/schema";
import { api } from "@/lib/api-client";
import { Field } from "./Fields";

export function Inbox({ refresh, readOnly }: { refresh: number; readOnly: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Message["status"]>("new");
  const [notes, setNotes] = useState("");
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api<{ messages: Message[] }>("/api/admin/messages").then((result) => {
      if (cancelled) return;
      setMessages((current) => [...new Map([...current, ...result.messages].map((message) => [message.id, message])).values()].sort((a, b) => b.createdAt - a.createdAt));
      setHasMore(result.messages.length === 100); setError("");
    }).catch((error) => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);
  const message = messages.find((entry) => entry.id === selected);
  function choose(value: Message) { setSelected(value.id); setStatus(value.status); setNotes(value.notes); }
  async function save() {
    if (!message) return;
    setBusy(true); setError("");
    try { await api(`/api/admin/messages/${message.id}`, "PATCH", { status, notes }); const result = await api<{ messages: Message[] }>("/api/admin/messages"); setMessages((current) => [...new Map([...current, ...result.messages].map((entry) => [entry.id, entry])).values()].sort((a, b) => b.createdAt - a.createdAt)); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save this message."); }
    finally { setBusy(false); }
  }
  async function older() {
    setBusy(true);
    try { const result = await api<{ messages: Message[] }>(`/api/admin/messages?before=${messages.at(-1)?.createdAt || Date.now()}`); setMessages((current) => [...current, ...result.messages]); setHasMore(result.messages.length === 100); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to load more messages."); }
    finally { setBusy(false); }
  }
  const visible = messages.filter((entry) => (filter === "all" || entry.status === filter) && `${entry.name} ${entry.email} ${entry.message}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="workspace-panel"><div className="editor-heading"><div><span className="eyebrow">PRIVATE CHANNEL</span><h2>Inbox</h2><p className="muted">New website messages appear here automatically.</p></div><span className="badge">{messages.filter((entry) => entry.status === "new").length} new</span></div><div className="inbox-tools"><Field label="Search messages" value={query} onChange={setQuery} /><label className="field">Status<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All messages</option><option value="new">New</option><option value="read">Read</option><option value="archived">Archived</option></select></label></div>{error && <p className="alert" role="alert">{error}</p>}
    <div className="inbox-layout"><div className="messages-list">{loading ? <p className="empty-inline">Loading messages…</p> : visible.length ? visible.map((entry) => <button key={entry.id} className={selected === entry.id ? "message-row selected" : "message-row"} onClick={() => choose(entry)}><span className={`message-status ${entry.status}`}>{entry.status}</span><strong>{entry.name}</strong><span>{entry.email}</span><p>{entry.message.slice(0, 90)}{entry.message.length > 90 && "…"}</p><time>{new Date(entry.createdAt).toLocaleString()}</time></button>) : <div className="empty-inline"><h3>{query || filter !== "all" ? "No matching messages." : "Nothing here yet."}</h3><p>{query || filter !== "all" ? "Try another search or status." : "Messages sent through the public contact form will arrive here."}</p></div>}{hasMore && <button onClick={older} disabled={busy}>Load older messages</button>}</div>
      <div className="message-detail">{message ? <><span className="eyebrow">{new Date(message.createdAt).toLocaleString()}</span><h3>{message.name}</h3><a href={`mailto:${message.email}`}>{message.email} ↗</a><div className="message-body">{message.message}</div><fieldset disabled={readOnly || busy}><label className="field">Status<select value={status} onChange={(event) => setStatus(event.target.value as Message["status"])}><option value="new">New</option><option value="read">Read</option><option value="archived">Archived</option></select></label><Field label="Internal notes" value={notes} multiline onChange={setNotes} /><button className="primary" onClick={save} disabled={readOnly || busy}>{busy ? "Saving…" : "Save message details"}</button></fieldset>{Object.values(message.events || {}).length > 0 && <div className="message-activity"><h4>Activity</h4>{Object.values(message.events || {}).sort((a, b) => b.at - a.at).map((event, index) => <p key={index}>{event.action}<br /><small>{event.actor.email} · {new Date(event.at).toLocaleString()}</small></p>)}</div>}</> : <p className="empty-inline">Choose a message to read it.</p>}</div>
    </div>
  </div>;
}
