# Branded search recovery — 2026-11-25

Method adapted from [SE Ranking SEO Skills](https://github.com/seranking/seo-skills): technical audit, sitemap, Google Search Console and GEO. Data provider: OpenSEO / connected Google Search Console, not SE Ranking MCP.

Baseline: homepage, /team, /blog, /events indexed; homepage last crawled Nov 24. Search Console query/page report returned no rows for Oct 26–Nov 22. OpenSEO crawl: 10 pages, 22 issues (0 critical, 11 warnings). Five public pages shared a description; six were flagged thin. Audit: https://app.openseo.so/p/e7ebc2c3-285f-43ea-a2f6-902fd99f56e3/audit?auditId=42f91915-150b-4972-a82e-19f12f943e1f

Changes: unique route metadata, shorter guide title and description, publication date in guide schema, deduplicated sitemap, internal contact-link correction, regression checks. Keep the existing poster homepage and private beta controls unchanged. No fabricated awards or keywords.

Next: verify public production after deployment; in Search Console request indexing once for changed canonical URLs. Keep the homepage stable. Link kn1ghts.org from the team's official GitHub, LinkedIn and CTFtime profiles when ownership permits; do not claim ownership of another CTFtime account. Add original event reports and technical writeups with dated primary-source links. Track exact branded-query impressions, clicks, position and canonical indexing weekly. No guarantees of rank or AI citation. Do not disable crawler security or expose private routes for SEO.

Limits: no live SE Ranking API, no raw rendered HTML comparison or CrUX data in this pass. Build and smoke checks must pass before production deployment.

Follow-up: retain a stable visible brand identifier on the seasonal homepage, add the existing favicon as the organization logo, distinguish the historical CTFtime record from the current identity, remove duplicate static guide cards, and improve useful introductions to team, events, blog, weekly challenge and application pages. Content remains concise; word count alone is not a ranking factor. Cloudflare apex DNS is DNS-only and bot blocking is disabled, so no Cloudflare changes were made. Additional original articles, event details and third-party links require genuine published evidence.
