"use client";

import { useEffect, useState } from "react";
import { useMember } from "./AuthProvider";

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
  return <section className="account-activity" aria-labelledby="account-comments-title">
    <div className="activity-heading"><div><span>YOUR CONTRIBUTIONS</span><h2 id="account-comments-title">COMMENTS</h2></div><span>{items.length.toString().padStart(2, "0")}</span></div>
    {!user.emailVerified ? <p className="community-empty">Verify your email to comment on field notes.</p> : loading ? <p className="community-empty">Loading your comments…</p> : error ? <p className="form-status error" role="alert">{error}</p> : items.length ? <div className="account-comment-list">{items.map((item) => <article key={item.id}><div><span className={`comment-state ${item.status}`}>{item.status}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div><p>{item.body}</p><button className="text-action" disabled={busy === item.id} onClick={() => remove(item)}>{busy === item.id ? "DELETING…" : "DELETE COMMENT"}</button></article>)}</div> : <p className="community-empty">You have not submitted any comments yet.</p>}
  </section>;
}
