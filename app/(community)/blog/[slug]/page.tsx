import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { canonicalUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { CommentForm } from "@/components/community/CommentForm";
import { PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformFetch, type BlogPostData } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { post } = await platformFetch<BlogPostData>(`blog/${slug}`);
    const canonical = canonicalUrl(`/blog/${post.slug}`);
    return {
      title: post.title,
      description: post.excerpt,
      alternates: { canonical },
      openGraph: {
        type: "article",
        url: canonical,
        title: post.title,
        description: post.excerpt,
        publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
        modifiedTime: new Date(post.updatedAt).toISOString(),
        siteName: SITE_NAME,
      },
    };
  } catch {
    return { title: "Article unavailable", robots: { index: false, follow: false } };
  }
}
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  let data: BlogPostData;
  try { data = await platformFetch<BlogPostData>(`blog/${(await params).slug}`); } catch { notFound(); }
  const { post, comments } = data;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": canonicalUrl(`/blog/${post.slug}`),
    headline: post.title,
    description: post.excerpt,
    url: canonicalUrl(`/blog/${post.slug}`),
    mainEntityOfPage: canonicalUrl(`/blog/${post.slug}`),
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
  return <main className="community-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} /><PageLead meta={post.tags.join(" / ") || "FIELD NOTE"} title={post.title} description={post.excerpt} /><div className="article-grid"><article className="article-copy">{post.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article><aside className="article-side"><div>PUBLISHED<br />{formatDate(post.publishedAt ?? post.updatedAt)}</div><div>AUTHOR<br />KN1GHTS</div><div>TAGS<div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></aside></div><section className="comments"><h2>Discussion</h2>{comments.length ? comments.map((comment) => <article className="comment" key={comment.id}><header>{comment.handle}<time>{formatDate(comment.createdAt)}</time></header><p>{comment.body}</p></article>) : <p className="community-empty">No approved comments yet.</p>}<CommentForm postId={post.id} /></section></main>;
}
