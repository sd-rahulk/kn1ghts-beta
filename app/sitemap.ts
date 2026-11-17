import type { MetadataRoute } from "next";
import type { BlogPost } from "@/backend/lib/schema";
import { platformOr } from "@/lib/platform-api";
import { canonicalUrl } from "@/lib/seo";

// Do not cache a fallback sitemap forever when the backend is temporarily unavailable.
export const dynamic = "force-dynamic";

const indexedPaths = [
  "/",
  "/blog",
  "/events",
  "/team",
  "/pow",
  "/inhouse-weekly",
  "/contact",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await platformOr<{ items: BlogPost[] }>("blog", { items: [] });
  const staticPages = indexedPaths.map((path) => ({ url: canonicalUrl(path) }));

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

  return [...staticPages, ...posts];
}
