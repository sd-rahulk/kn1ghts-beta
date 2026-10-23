import Link from "next/link";
import type { BlogPost } from "@/backend/lib/schema";
import { EmptyState, PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformOr } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog | KN1GHTS", description: "Research notes, CTF lessons, and field reports from KN1GHTS." };
export default async function BlogPage() {
  const { items } = await platformOr<{ items: BlogPost[] }>("blog", { items: [] });
  return <main className="community-page"><PageLead meta="FIELD NOTES" title="BLOG" description="Technical writeups, research notes and lessons recovered from competitions." />{items.length ? <div className="community-list">{items.map((post) => <article className="community-row" key={post.id}><time>{formatDate(post.publishedAt ?? post.updatedAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p><div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><Link className="row-link" href={`/blog/${post.slug}`}>READ →</Link></article>)}</div> : <EmptyState>No articles have been published yet.</EmptyState>}</main>;
}
