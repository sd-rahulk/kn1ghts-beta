# KN1GHTS search discoverability and AI search handoff

This repository implements the **public website** at `https://kn1ghts.org`. The team member who owns the Vercel project must merge and deploy changes; GitHub-only commits do not change production until deployment.

## Implemented in source code

- `/robots.txt`: allows legitimate crawlers, including `OAI-SearchBot` and `ChatGPT-User`, to access public pages; excludes `/api/` and `/admin/`. Robots is **not a security boundary**.
- `/sitemap.xml`: includes public routes and published blog articles; article `lastmod` uses the actual update timestamp. Drafts and account pages are excluded.
- Canonical URLs, Open Graph and Twitter summary metadata, organization/website JSON-LD, blog article JSON-LD.
- Authentication and account pages have `noindex`; previews also have `noindex`.
- Optional `/llms.txt`. There is no established ranking benefit from `llms.txt`.
- `scripts/seo-smoke.mjs`: verifies the above against a built local Next.js production server in GitHub Actions.

## Vercel owner deployment checklist

1. Merge the reviewed GitHub PR after both CI jobs are green. Confirm the Vercel **public** project is connected to the repository and production branch `main`. The backend management project has a different root directory and should not be pointed at the public domain.
2. Confirm `kn1ghts.org` is assigned to the **public** Vercel project and is reachable over HTTPS. Avoid enabling broad Vercel Authentication on production public pages.
3. In the CMS management application, set **Settings → Public URL** to `https://kn1ghts.org` rather than `http://localhost:3000`, then publish. The repository's default content still uses localhost for development; the canonical SEO origin is deliberately fixed in `lib/seo.ts`.
4. Check the following public URLs, returning HTTP 200 without challenge pages or login requirements:
   - `https://kn1ghts.org/robots.txt`
   - `https://kn1ghts.org/sitemap.xml`
   - `https://kn1ghts.org/llms.txt`
   - `https://kn1ghts.org/`
   - `https://kn1ghts.org/blog`
5. Inspect the homepage HTML for `rel="canonical"` and `application/ld+json`. Inspect `/sign-in`, `/sign-up` and `/account` HTML for `noindex`.
6. Verify all sitemap URLs are public, render real useful text without requiring user interaction, and return HTTP 200. Published blog URLs will appear only while the backend can list published posts.
7. Keep crawlers able to fetch pages marked `noindex`. Blocking those URLs in `robots.txt` stops compliant crawlers from reading the tag.
8. Confirm Vercel firewall / deployment protection does not challenge legitimate verified crawlers, while retaining the site's ordinary security controls.

## Verify search ownership (requires account-owner logins)

- **Google Search Console:** add a *Domain* property for `kn1ghts.org`, take the provided DNS TXT token, add it at Cloudflare DNS, complete verification, submit `https://kn1ghts.org/sitemap.xml`, and inspect indexing status.
- **Bing Webmaster Tools:** import verified Search Console property or verify with its own DNS TXT record, then submit the sitemap. IndexNow can be enabled separately for changed URLs if appropriate.
- **OpenAI:** allow `OAI-SearchBot` (ChatGPT search discovery); `GPTBot` is separate and relates to potential training. Neither crawl permission nor a sitemap guarantees ChatGPT recommendations or citations.
- **Social identity:** ensure the organization GitHub and LinkedIn URLs in `lib/seo.ts` are correct, active, and link back to `https://kn1ghts.org`.

## Commands for checking production

```bash
curl -i https://kn1ghts.org/robots.txt
curl -i https://kn1ghts.org/sitemap.xml
curl -i https://kn1ghts.org/llms.txt
curl -sL https://kn1ghts.org/ | grep -Ei 'canonical|application/ld\\+json|og:title'
curl -sL https://kn1ghts.org/sign-in | grep -i noindex
```

Do not submit `*.ctf.challenges.kn1ghts.org` or private challenge links to search engines. CTF challenge hostnames may deliberately use non-HTTPS protocols and require separate configuration.

## What moves visibility beyond technical SEO?

Publish verified competition placements, useful CTF writeups, detailed projects, team profiles, and event information; link original organizer results as sources. Build legitimate references from organizer pages, open-source projects, and community profiles. Avoid fabricated awards, misleading keyword stuffing, or mass-generated doorway pages.

## Troubleshooting

- If `sitemap.xml` contains static pages but no published articles, confirm `BACKEND_URL`, `PLATFORM_API_SECRET`, Firebase data, and the public blog endpoint in the **Vercel public project's** production environment. No secret should be committed.
- If the site responds with `401` or a deployment protection page, review the production deployment protection settings with the Vercel project owner.
- If Search Console reports duplicates, inspect `rel=canonical`, `www` to apex redirects, and alias-domain redirects.
- If Google reports `Crawled - currently not indexed`, prioritize content quality, credible backlinks, and Google indexing diagnostics. A sitemap is not a guarantee.
