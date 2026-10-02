"use client";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { siteSchema, type Actor, type SiteContent } from "@/lib/schema";
import { SectionEditor } from "./SectionEditor";
import { SettingsEditor } from "./SettingsEditor";
import { Inbox } from "./Inbox";
import { History } from "./History";
import { Access } from "./Access";

type Tab = "sections" | "settings" | "inbox" | "history" | "access";
type Intent = { kind: "save" | "publish" | "restore"; id?: string };
function SaveDialog({ intent, busy, onClose, onCommit }: { intent: Intent; busy: boolean; onClose: () => void; onCommit: (note: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState(intent.kind === "restore" ? "Restore an earlier content revision" : "");
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="save-dialog" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} aria-labelledby="save-title"><form onSubmit={(event) => { event.preventDefault(); onCommit(note); }}>
    <span className="eyebrow">{intent.kind === "publish" ? "GO LIVE" : "CONTENT REVISION"}</span><h2 id="save-title">{intent.kind === "publish" ? "Publish these changes?" : intent.kind === "restore" ? "Restore this revision?" : "Save a draft"}</h2><p>{intent.kind === "publish" ? "Your current sections and settings will replace the public website content." : intent.kind === "restore" ? "The selected snapshot will become a new draft. The live site stays as it is until you publish." : "The live website stays as it is. You can preview this draft before publishing."}</p>
    <label className="field">Change note<textarea value={note} onChange={(event) => setNote(event.target.value)} required minLength={3} maxLength={500} rows={3} disabled={busy} placeholder="What did you change?" /></label><div className="button-row"><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving…" : intent.kind === "publish" ? "Publish changes" : intent.kind === "restore" ? "Restore to draft" : "Save draft"}</button></div>
  </form></dialog>;
}

export function Dashboard({ actor, initial, initialVersion, initialPublishedAt }: { actor: Actor; initial: SiteContent; initialVersion: number; initialPublishedAt: number | null }) {
  const router = useRouter();
  const [site, setSite] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [version, setVersion] = useState(initialVersion);
  const [latestVersion, setLatestVersion] = useState(initialVersion);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [currentActor, setCurrentActor] = useState(actor);
  const [tab, setTab] = useState<Tab>("sections");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [inboxRefresh, setInboxRefresh] = useState(0);
  const [connected, setConnected] = useState(false);
  const [expired, setExpired] = useState(false);
  const dirty = JSON.stringify(site) !== saved;
  const readOnly = currentActor.role === "viewer" || expired;
  const stale = latestVersion > version;
  function failure(error: unknown) {
    setError(error instanceof Error ? error.message : "The operation could not be completed.");
    if (error instanceof ApiError && error.status === 401) setExpired(true);
  }
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  useEffect(() => {
    const events = new EventSource("/api/admin/events");
    events.onopen = () => setConnected(true);
    events.onerror = () => setConnected(false);
    events.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.kind === "inbox") setInboxRefresh((value) => value + 1);
      if (data.kind === "content") void api<{ version: number; publishedAt: number | null; actor: Actor }>("/api/admin/content").then((state) => { setLatestVersion(state.version); setPublishedAt(state.publishedAt); setCurrentActor(state.actor); }).catch((error) => { if (error instanceof ApiError && error.status === 401) { setExpired(true); events.close(); } });
    };
    return () => events.close();
  }, []);
  async function reload() {
    if (dirty && !window.confirm("Reload the latest draft and discard your unsaved changes? Export the draft first if you need to keep a copy.")) return;
    setBusy(true); setError("");
    try { const data = await api<{ draft: SiteContent; version: number; publishedAt: number | null; actor: Actor }>("/api/admin/content"); setSite(data.draft); setSaved(JSON.stringify(data.draft)); setVersion(data.version); setLatestVersion(data.version); setPublishedAt(data.publishedAt); setCurrentActor(data.actor); setPreviewUrl(""); setNotice("Latest draft loaded."); }
    catch (error) { failure(error); }
    finally { setBusy(false); }
  }
  async function commit(note: string) {
    if (!intent) return;
    setBusy(true); setError("");
    try {
      const content = siteSchema.parse(site);
      if (intent.kind === "restore") {
        await api(`/api/admin/history/${intent.id}`, "POST", { expectedVersion: version, note });
        const data = await api<{ draft: SiteContent; version: number; publishedAt: number | null }>("/api/admin/content");
        setSite(data.draft); setSaved(JSON.stringify(data.draft)); setVersion(data.version); setLatestVersion(data.version); setNotice("Revision restored to a new draft. Preview it before publishing.");
      } else {
        const result = await api<{ version: number }>("/api/admin/content", "POST", { content, expectedVersion: version, action: intent.kind, note });
        setSaved(JSON.stringify(content)); setSite(content); setVersion(result.version); setLatestVersion(result.version);
        if (intent.kind === "publish") setPublishedAt(Date.now());
        setNotice(intent.kind === "publish" ? "Changes published. They are available to the public website now." : "Draft saved. The public website has not changed.");
      }
      setIntent(null); setRefresh((value) => value + 1); setPreviewUrl("");
    } catch (error) { if (error instanceof ApiError) failure(error); else { const result = siteSchema.safeParse(site); setError(result.success ? "The update could not be completed. Try again." : result.error.issues.slice(0, 6).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")); } setIntent(null); }
    finally { setBusy(false); }
  }
  async function preview() {
    if (dirty) { setNotice("Save the draft first, then create a preview link."); return; }
    setBusy(true); setError("");
    try { const data = await api<{ url: string }>("/api/admin/preview", "POST"); setPreviewUrl(data.url); setNotice("Preview ready. The link expires in 10 minutes."); }
    catch (error) { failure(error); }
    finally { setBusy(false); }
  }
  function exportDraft() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(site, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `kn1ghts-draft-v${version}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importDraft(file: File | undefined) {
    if (!file) return;
    if (file.size > 300000) { setError("Import files must be smaller than 300 KB."); return; }
    try { const content = siteSchema.parse(JSON.parse(await file.text())); setSite(content); setNotice("Content imported into your local draft. Save and preview it before publishing."); setError(""); }
    catch { setError("This file does not match the site content schema. Import a draft exported from this app."); }
  }
  async function logout(all = false) {
    if (dirty && !window.confirm("Sign out and discard unsaved changes?")) return;
    setBusy(true);
    try { await api(`/api/auth/logout${all ? "?all=true" : ""}`, "POST"); router.replace("/login"); router.refresh(); }
    catch (error) { failure(error); setBusy(false); }
  }
  const tabs: { key: Tab; label: string }[] = [{ key: "sections", label: "Sections" }, { key: "settings", label: "Settings" }, { key: "inbox", label: "Inbox" }, { key: "history", label: "History" }, ...(currentActor.role === "owner" ? [{ key: "access" as const, label: "Team access" }] : [])];
  const activeTab = tab === "access" && currentActor.role !== "owner" ? "sections" : tab;
  return <div className="admin-shell"><aside className="sidebar"><NextLink className="brand" href="/">KN1GHTS<span> / MANAGEMENT</span></NextLink><span className="sidebar-label">WORKSPACE</span><nav aria-label="Management screens">{tabs.map((entry) => <button key={entry.key} className={activeTab === entry.key ? "active" : ""} onClick={() => { setTab(entry.key); setNotice(""); }}>{entry.label}<span aria-hidden="true">{activeTab === entry.key ? "→" : ""}</span></button>)}</nav><a className="view-site" href={site.settings.publicUrl || "http://localhost:3000"} target="_blank" rel="noreferrer">View public site ↗</a><div className="account"><span title={currentActor.email}>{currentActor.email}</span><small>{currentActor.role} · {connected ? "Connected" : "Reconnecting"}</small><button onClick={() => logout()} disabled={busy}>Sign out</button><button className="text-button" onClick={() => logout(true)} disabled={busy}>Sign out all sessions</button></div></aside>
    <main className="admin-main"><header className="workspace-header"><div><span className="eyebrow">KN1GHTS WEBSITE</span><h1>{activeTab === "sections" ? "Site editor" : tabs.find((entry) => entry.key === activeTab)?.label}</h1><p>{publishedAt ? `Last published ${new Date(publishedAt).toLocaleString()}` : "Initial content loaded · Not published to Firebase yet"}</p></div><div className="header-status"><span className={dirty ? "badge unsaved" : "badge"}>{dirty ? "Unsaved changes" : `Draft v${version}`}</span>{readOnly && <span className="badge">Read only</span>}</div></header>
      <div className="editor-toolbar"><div className="button-row"><button disabled={busy || expired} onClick={preview}>Create preview link</button>{previewUrl && <a className="button" href={previewUrl} target="_blank" rel="noreferrer">Open draft preview ↗</a>}<button onClick={exportDraft}>Export draft</button>{!readOnly && <label className="button import-button">Import<input type="file" accept="application/json,.json" onChange={(event) => { void importDraft(event.target.files?.[0]); event.target.value = ""; }} /></label>}</div><div className="button-row"><button disabled={readOnly || busy || stale} onClick={() => setIntent({ kind: "save" })}>Save draft</button><button className="primary" disabled={readOnly || busy || stale} onClick={() => setIntent({ kind: "publish" })}>Publish changes</button></div></div>
      {(stale || expired) && <div className="alert" role="alert">{expired ? <>Your session has expired. Export unsaved work before <a href="/login">signing in again</a>.</> : <>Another editor saved version {latestVersion}. Reload it before saving or publishing. <button onClick={reload} disabled={busy}>Reload latest</button></>}</div>}
      {error && <div className="alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}{notice && <p className="notice" role="status">{notice}</p>}
      {activeTab === "sections" && <SectionEditor site={site} onChange={setSite} readOnly={readOnly || busy} />}{activeTab === "settings" && <SettingsEditor site={site} onChange={setSite} readOnly={readOnly || busy} />}{activeTab === "inbox" && <Inbox refresh={inboxRefresh} readOnly={readOnly} />}{activeTab === "history" && <History refresh={refresh} readOnly={readOnly || stale} onRestore={(id) => { if (dirty && !window.confirm("Restoring will replace your unsaved draft. Continue?")) return; setIntent({ kind: "restore", id }); }} />}{activeTab === "access" && <Access />}
    </main>{intent && <SaveDialog intent={intent} busy={busy} onClose={() => setIntent(null)} onCommit={commit} />}
  </div>;
}
