import { notFound } from "next/navigation";
import { CommentForm } from "@/components/community/CommentForm";
import { PageLead, formatDate } from "@/components/community/CommunityShell";
import { platformFetch, type BlogPostData } from "@/lib/platform-api";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try { const data = await platformFetch<BlogPostData>(`blog/${(await params).slug}`); return { title: `${data.post.title} | KN1GHTS`, description: data.post.excerpt }; }
  catch { return { title: "Article unavailable | KN1GHTS" }; }
}
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  let data: BlogPostData;
  try { data = await platformFetch<BlogPostData>(`blog/${(await params).slug}`); } catch { notFound(); }
  const { post, comments } = data;
  return <main className="community-page"><PageLead meta={post.tags.join(" / ") || "FIELD NOTE"} title={post.title} description={post.excerpt} /><div className="article-grid"><article className="article-copy">{post.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article><aside className="article-side"><div>PUBLISHED<br />{formatDate(post.publishedAt ?? post.updatedAt)}</div><div>AUTHOR<br />KN1GHTS</div><div>TAGS<div className="tag-list">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></aside></div><section className="comments"><h2>Discussion</h2>{comments.length ? comments.map((comment) => <article className="comment" key={comment.id}><header>{comment.handle}<time>{formatDate(comment.createdAt)}</time></header><p>{comment.body}</p></article>) : <p className="community-empty">No approved comments yet.</p>}<CommentForm postId={post.id} /></section></main>;
}
