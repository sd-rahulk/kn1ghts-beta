import type { MetadataRoute } from "next";
import type { BlogPost } from "@/backend/lib/schema";
import { platformOr } from "@/lib/platform-api";
import { canonicalUrl } from "@/lib/seo";

// Do not cache a fallback sitemap forever when the backend is temporarily unavailable.
export const dynamic = "force-dynamic";

const indexedPaths = [
  "/",
  "/blog",
  "/blog/web-ctf-field-guide",
  "/events",
  "/team",
  "/pow",
  "/inhouse-weekly",
  "/contact",
  "/security",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await platformOr<{ items: BlogPost[] }>("blog", { items: [] });
  const staticPages = indexedPaths.map((path) => ({
    url: canonicalUrl(path),
    ...(path === "/blog/web-ctf-field-guide" ? { lastModified: new Date("2026-11-17") } : {}),
  }));

  const posts = items
    .filter((post) => post.status === "published" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))
    .map((post) => {
      const updated = Number.isFinite(post.updatedAt) && post.updatedAt > 0
        ? new Date(post.updatedAt)
        : undefined;
      return {
        url: canonicalUrl(`/blog/${post.slug}`),
        ...(updated && !Number.isNaN(updated.getTime()) ? { lastModified: updated } : {}),
      };
    });

  // A CMS post can share a slug with a static guide; keep only its actual route.
  return [...new Map([...posts, ...staticPages].map((page) => [page.url, page])).values()];
}
