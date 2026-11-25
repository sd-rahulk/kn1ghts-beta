import Link from "next/link";
import type { BlogPost } from "@/backend/lib/schema";
import { PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformOr } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "CTF Writeups and Security Research",
  description: "Read kn1ghts CTF writeups, cybersecurity research notes and practical field guides on web security, authorization and responsible testing.",
  alternates: { canonical: "https://kn1ghts.org/blog" },
  openGraph: { title: "CTF Writeups and Security Research | kn1ghts", description: "Read kn1ghts CTF writeups, cybersecurity research notes and practical field guides on web security, authorization and responsible testing.", url: "https://kn1ghts.org/blog", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "CTF Writeups and Security Research | kn1ghts", description: "Read kn1ghts CTF writeups, cybersecurity research notes and practical field guides on web security, authorization and responsible testing." },
};
export default async function BlogPage() {
  const { items } = await platformOr<{ items: BlogPost[] }>("blog", { items: [] });
  return <main className="community-page"><PageLead meta="FIELD NOTES" title="BLOG" description="Technical writeups, research notes and lessons recovered from competitions." /><div className="community-list"><article className="community-row"><time>17 NOV 2026</time><div><h2>Web CTF Security: Authorization, Sessions, and Safe Testing</h2><p>An educational field guide to trust boundaries, access control, evidence, and responsible CTF testing.</p><div className="tag-list"><span>WEB SECURITY</span><span>CTF</span><span>AUTHORIZATION</span></div></div><Link className="row-link" href="/blog/web-ctf-field-guide">READ →</Link></article>{items.map((post) => <article className="community-row" key={post.id}><time>{formatDate(post.publishedAt ?? post.updatedAt)}</time><div><h2>{post.title}</h2><p>{post.excerpt}</p><div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div><Link className="row-link" href={`/blog/${post.slug}`}>READ →</Link></article>)}</div></main>;
}
