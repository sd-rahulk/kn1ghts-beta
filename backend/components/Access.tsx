"use client";
import { useEffect, useState } from "react";
import type { Actor, Member, MemberRole } from "@/lib/schema";
import { api } from "@/lib/api-client";
import { Field } from "./Fields";

type AccessData = { members: Member[]; events: { at: number; actor: Actor; action: string }[] };
export function Access() {
  const [data, setData] = useState<AccessData>({ members: [], events: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { let cancelled = false; api<AccessData>("/api/admin/access").then((value) => { if (!cancelled) setData(value); }).catch((error) => { if (!cancelled) setMessage(error.message); }); return () => { cancelled = true; }; }, []);
  async function add(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api("/api/admin/access", "POST", { email, role }); setData(await api<AccessData>("/api/admin/access")); setEmail(""); setMessage("Access granted. The account can use 'Set up or reset your password' on the sign-in screen, then verify its email."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to grant access."); }
    finally { setBusy(false); }
  }
  async function change(member: Member, patch: Partial<Member>) {
    setBusy(true); setMessage("");
    try { await api("/api/admin/access", "PATCH", { uid: member.uid, role: patch.role ?? member.role, active: patch.active ?? member.active }); setData(await api<AccessData>("/api/admin/access")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update access."); }
    finally { setBusy(false); }
  }
  return <div className="workspace-panel"><div className="editor-heading"><div><span className="eyebrow">OWNER CONTROLS</span><h2>Team access</h2><p className="muted">Owners manage accounts. Editors manage content and messages. Viewers can read and preview.</p></div></div><form className="invite-form" onSubmit={add}><Field label="Email" type="email" value={email} onChange={setEmail} disabled={busy} /><label className="field">Role<select value={role} onChange={(event) => setRole(event.target.value as MemberRole)} disabled={busy}><option value="editor">Editor</option><option value="viewer">Viewer</option><option value="owner">Owner</option></select></label><button className="primary" disabled={busy || !email}>{busy ? "Please wait…" : "Grant access"}</button></form><p className="form-message" role="status">{message}</p><div className="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead><tbody>{data.members.map((member) => <tr key={member.uid}><td>{member.email}</td><td><select aria-label={`Role for ${member.email}`} value={member.role} disabled={busy} onChange={(event) => change(member, { role: event.target.value as MemberRole })}><option value="owner">Owner</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></td><td><button disabled={busy} onClick={() => change(member, { active: !member.active })}>{member.active ? "Active · Disable" : "Disabled · Enable"}</button></td><td>{new Date(member.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>{data.events.length > 0 && <div className="form-section"><h3>Access activity</h3>{data.events.map((entry, index) => <p key={index}>{entry.action}<br /><small className="muted">{entry.actor.email} · {new Date(entry.at).toLocaleString()}</small></p>)}</div>}</div>;
}
