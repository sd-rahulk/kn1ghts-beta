import Link from "next/link";
import { FaNewspaper } from "react-icons/fa";
import type { BlogPost } from "@/backend/lib/schema";
import { EmptyState, PageBody, PageLead, formatDate } from "@/components/community/CommunityShell";
import { Arrow } from "@/components/site/Pill";
import { accent, card, tag, textLink } from "@/components/site/ui";
import { platformOr } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog | KN1GHTS", description: "Research notes, CTF lessons, and field reports from KN1GHTS." };
export default async function BlogPage() {
  const { items } = await platformOr<{ items: BlogPost[] }>("blog", { items: [] });
  return <>
    <PageLead meta="FIELD NOTES" title="BLOG" description="Technical writeups, research notes and lessons recovered from competitions." icon={FaNewspaper} />
    <PageBody>{items.length ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map((post, index) => <article className={`${card} flex flex-col`} key={post.id}>
      <FaNewspaper className={`w-12 h-12 ${accent(index).text} mb-4 group-hover:scale-110 transition-transform duration-300`} aria-hidden="true" />
      <time className="font-mono text-sm text-brass mb-2">{formatDate(post.publishedAt ?? post.updatedAt)}</time>
      <h2 className="font-cyber text-xl font-semibold text-white mb-2">{post.title}</h2>
      <p className="text-gray-400 leading-relaxed">{post.excerpt}</p>
      {post.tags.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{post.tags.map((entry) => <span className={tag} key={entry}>{entry}</span>)}</div>}
      <div className="mt-auto pt-4"><Link className={textLink} href={`/blog/${post.slug}`}>READ<Arrow /></Link></div>
    </article>)}</div> : <EmptyState>No articles have been published yet.</EmptyState>}</PageBody>
  </>;
}
