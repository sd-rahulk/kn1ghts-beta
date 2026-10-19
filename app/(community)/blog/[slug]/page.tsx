import { notFound } from "next/navigation";
import { FaNewspaper } from "react-icons/fa";
import { CommentForm } from "@/components/community/CommentForm";
import { PageBody, PageLead, SectionTitle, formatDate } from "@/components/community/CommunityShell";
import { tag } from "@/components/site/ui";
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
  return <>
    <PageLead meta={post.tags.join(" / ") || "FIELD NOTE"} title={post.title} description={post.excerpt} icon={FaNewspaper} />
    <PageBody narrow>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="cyber-card p-4 text-center"><p className="font-mono text-xs text-gray-400 mb-1">PUBLISHED</p><p className="font-mono text-sm text-vapor-cyan">{formatDate(post.publishedAt ?? post.updatedAt)}</p></div>
        <div className="cyber-card p-4 text-center"><p className="font-mono text-xs text-gray-400 mb-1">AUTHOR</p><p className="font-mono text-sm text-vapor-cyan">KN1GHTS</p></div>
        <div className="cyber-card p-4 text-center"><p className="font-mono text-xs text-gray-400 mb-2">TAGS</p><div className="flex flex-wrap justify-center gap-2">{post.tags.map((entry) => <span className={tag} key={entry}>{entry}</span>)}</div></div>
      </div>
      <article className="space-y-6 text-gray-300 leading-relaxed">{post.content.split(/\n{2,}/).map((paragraph, index) => <p className="whitespace-pre-wrap" key={index}>{paragraph}</p>)}</article>
    </PageBody>
    <PageBody narrow alt>
      <SectionTitle glow="Discussion" tone="neon-cyan" className="mb-8" />
      {comments.length ? <div className="space-y-4">{comments.map((comment) => <article className="cyber-card p-6" key={comment.id}>
        <header className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-vapor-cyan">{comment.handle}</span><time className="font-mono text-xs text-gray-500">{formatDate(comment.createdAt)}</time></header>
        <p className="mt-3 text-gray-300 whitespace-pre-wrap">{comment.body}</p>
      </article>)}</div> : <p className="text-gray-400">No approved comments yet.</p>}
      <div className="cyber-card p-8 mt-8"><CommentForm postId={post.id} /></div>
    </PageBody>
  </>;
}
