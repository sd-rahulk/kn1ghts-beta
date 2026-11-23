import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Allow crawlers to fetch sign-in, sign-up, account and preview pages so their
// noindex metadata can be seen. Robots disallow would prevent that.
// Note: there is no /admin/ route in this app (the management app lives in
// backend/), so it is not listed here.
const disallowed = ["/api/"];

/** Robots guidance is not an access-control mechanism. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: disallowed },
      { userAgent: ["OAI-SearchBot", "ChatGPT-User"], allow: "/", disallow: disallowed },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
