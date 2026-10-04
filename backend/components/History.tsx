"use client";
import { useEffect, useState } from "react";
import type { AuditEvent, Revision } from "@/lib/schema";
import { api } from "@/lib/api-client";

type Entry = Omit<Revision, "content">;
export function History({ refresh, readOnly, onRestore }: { refresh: number; readOnly: boolean; onRestore: (id: string) => void }) {
  const [revisions, setRevisions] = useState<Entry[]>([]), [audit, setAudit] = useState<AuditEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api<{ revisions: Entry[] }>("/api/admin/history"), api<{ items: AuditEvent[] }>("/api/admin/platform/audit")])
      .then(([result, events]) => { if (!cancelled) { setRevisions(result.revisions); setAudit(events.items); setHasMore(result.revisions.length === 30); setError(""); } })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load history."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);
  async function older() {
    try { const result = await api<{ revisions: Entry[] }>(`/api/admin/history?before=${revisions.at(-1)?.id}`); setRevisions((current) => [...current, ...result.revisions]); setHasMore(result.revisions.length === 30); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load history."); }
  }
  async function download(id: string) {
    try {
      const { revision } = await api<{ revision: Revision }>(`/api/admin/history/${id}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(revision, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `kn1ghts-revision-${revision.version}.json`; link.click(); URL.revokeObjectURL(url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to export this revision."); }
  }
  return <div className="workspace-panel"><div className="editor-heading"><div><span className="eyebrow">VERIFIED AUTHORSHIP</span><h2>Change history</h2><p className="muted">Website revisions and platform actions record who changed what and when.</p></div></div>{error && <p className="alert" role="alert">{error}</p>}{loading ? <p className="empty-inline">Loading revisions…</p> : <><section className="audit-section"><h3>Platform activity</h3>{audit.length ? <div className="audit-list">{audit.map((entry) => <article key={entry.id}><span>{entry.resource}</span><div><strong>{entry.summary}</strong><small>{entry.actor.email} · {new Date(entry.at).toLocaleString()}</small></div><span className="badge">{entry.action}</span></article>)}</div> : <p className="empty-inline">No blog, challenge, event, comment or application changes recorded yet.</p>}</section><section className="audit-section"><h3>Website revisions</h3>{revisions.length === 0 ? <div className="empty-inline"><p>Save a draft or publish to create the first website revision.</p></div> : <div className="history-list">{revisions.map((entry) => <article key={entry.id}><button className="history-heading" aria-expanded={selected === entry.id} onClick={() => setSelected(selected === entry.id ? null : entry.id)}><span className="version">v{entry.version}</span><span><strong>{entry.note}</strong><small>{entry.actor.email} · {new Date(entry.at).toLocaleString()}</small></span><span className="badge">{entry.kind}</span><span>{selected === entry.id ? "−" : "+"}</span></button>{selected === entry.id && <div className="revision-detail">{(entry.changes || []).length ? entry.changes.map((change, index) => <div className="change" key={index}><code>{change.path || "Initial content"}</code><div><span>Before</span><pre>{change.before}</pre></div><div><span>After</span><pre>{change.after}</pre></div></div>) : <p className="muted">No content fields changed in this revision.</p>}<div className="button-row"><button onClick={() => download(entry.id)}>Export revision</button><button disabled={readOnly} onClick={() => onRestore(entry.id)}>Restore to draft</button></div></div>}</article>)}</div>}{hasMore && <button onClick={older}>Load older revisions</button>}</section></>}</div>;
}
