import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const excluded = [
  "/api/",
  "/account",
  "/sign-in",
  "/sign-up",
  "/admin/",
  "/?preview=",
];

/** Robots rules are crawler guidance, not access control. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: excluded },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: excluded },
      { userAgent: "ChatGPT-User", allow: "/", disallow: excluded },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
