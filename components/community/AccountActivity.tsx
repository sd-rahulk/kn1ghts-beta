"use client";

import { useEffect, useState } from "react";
import { useMember } from "./AuthProvider";
import { formStatusError, textAction } from "@/components/site/ui";

type OwnComment = {
  id: string;
  postId: string;
  handle: string;
  body: string;
  status: "pending" | "approved" | "hidden";
  createdAt: number;
};

export function AccountActivity() {
  const { user, loading: authLoading, token } = useMember();
  const [items, setItems] = useState<OwnComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!user?.emailVerified) return;
    void token().then((idToken) => {
      if (!cancelled) setLoading(true);
      return fetch("/api/platform/profile/comments", { cache: "no-store", headers: { Authorization: `Bearer ${idToken}` } });
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load your comments.");
      if (!cancelled) { setItems(data.items ?? []); setError(""); }
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load your comments."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user?.emailVerified]);

  async function remove(item: OwnComment) {
    if (!window.confirm("Delete this comment permanently?")) return;
    setBusy(item.id);
    try {
      const response = await fetch(`/api/platform/blog/${item.postId}/comments/${item.id}`, { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: "{}" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete your comment.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete your comment."); }
    finally { setBusy(""); }
  }

  if (authLoading || !user) return null;
  const stateColor = { approved: "text-patina", hidden: "text-brass", pending: "text-gray-400" } as const;
  return <section aria-labelledby="account-comments-title">
    <div className="flex items-end justify-between gap-6 mb-8"><div><p className="font-mono text-sm text-gray-400 mb-2">YOUR CONTRIBUTIONS</p><h2 id="account-comments-title" className="font-cyber text-3xl font-bold"><span className="neon-brass">Comments</span></h2></div><span className="font-cyber text-4xl font-bold gradient-text">{items.length.toString().padStart(2, "0")}</span></div>
    {!user.emailVerified ? <p className="text-gray-400">Verify your email to comment on field notes.</p> : loading ? <p className="text-gray-400">Loading your comments…</p> : error ? <p className={formStatusError} role="alert">{error}</p> : items.length ? <div className="space-y-4">{items.map((item) => <article className="cyber-card p-6" key={item.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className={`font-mono text-xs uppercase ${stateColor[item.status]}`}>{item.status}</span><time className="font-mono text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</time></div>
      <p className="mt-3 text-gray-300 whitespace-pre-wrap break-words">{item.body}</p>
      <button className={`${textAction} mt-4`} disabled={busy === item.id} onClick={() => remove(item)}>{busy === item.id ? "DELETING…" : "DELETE COMMENT"}</button>
    </article>)}</div> : <p className="text-gray-400">You have not submitted any comments yet.</p>}
  </section>;
}
