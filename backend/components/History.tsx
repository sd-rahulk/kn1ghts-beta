"use client";
import { useEffect, useState } from "react";
import type { Revision } from "@/lib/schema";
import { api } from "@/lib/api-client";

type Entry = Omit<Revision, "content">;
export function History({ refresh, readOnly, onRestore }: { refresh: number; readOnly: boolean; onRestore: (id: string) => void }) {
  const [revisions, setRevisions] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api<{ revisions: Entry[] }>("/api/admin/history").then((result) => { if (!cancelled) { setRevisions(result.revisions); setHasMore(result.revisions.length === 30); setError(""); } }).catch((error) => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);
  async function older() {
    try { const result = await api<{ revisions: Entry[] }>(`/api/admin/history?before=${revisions.at(-1)?.id}`); setRevisions((current) => [...current, ...result.revisions]); setHasMore(result.revisions.length === 30); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to load history."); }
  }
  async function download(id: string) {
    try {
      const { revision } = await api<{ revision: Revision }>(`/api/admin/history/${id}`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(revision, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `kn1ghts-revision-${revision.version}.json`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to export this revision."); }
  }
  return <div className="workspace-panel"><div className="editor-heading"><div><span className="eyebrow">CONTENT REVISIONS</span><h2>Change history</h2><p className="muted">Every save, publish, and restore records the editor and the changes. Restoring creates a new draft revision.</p></div></div>{error && <p className="alert" role="alert">{error}</p>}{loading ? <p className="empty-inline">Loading revisions…</p> : revisions.length === 0 ? <div className="empty-inline"><h3>Your first save starts the history.</h3><p>Existing website content is ready in the editor. Save a draft or publish to create its first revision.</p></div> : <div className="history-list">{revisions.map((entry) => <article key={entry.id}><button className="history-heading" aria-expanded={selected === entry.id} onClick={() => setSelected(selected === entry.id ? null : entry.id)}><span className="version">v{entry.version}</span><span><strong>{entry.note}</strong><small>{entry.actor.email} · {new Date(entry.at).toLocaleString()}</small></span><span className="badge">{entry.kind}</span><span>{selected === entry.id ? "−" : "+"}</span></button>{selected === entry.id && <div className="revision-detail">{(entry.changes || []).length ? entry.changes.map((change, index) => <div className="change" key={index}><code>{change.path || "Initial content"}</code><div><span>Before</span><pre>{change.before}</pre></div><div><span>After</span><pre>{change.after}</pre></div></div>) : <p className="muted">No content fields changed in this revision.</p>}<div className="button-row"><button onClick={() => download(entry.id)}>Export revision</button><button disabled={readOnly} onClick={() => onRestore(entry.id)}>Restore to draft</button></div></div>}</article>)}</div>}{hasMore && <button onClick={older}>Load older revisions</button>}</div>;
}
