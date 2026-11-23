/*
 * Poster link resolution — the poster homepage renders no sections, so a
 * CMS fragment link (#results, #team, ...) would be a dead anchor. Resolve
 * each authored href to a destination that actually exists:
 *
 * - absolute paths ("/pow", "/team") and external URLs render unchanged,
 *   so any published navigation/footer entry with a real destination stays
 *   in the menus at its authored href;
 * - fragments to sections that live on their own page map to that page
 *   (#results -> /pow, #team -> /team, #writeups -> /blog,
 *   #contact -> /contact); #home and #main stay — both targets are
 *   rendered on the poster page;
 * - any other fragment has no page on the poster site and resolves to null;
 *   callers omit the link rather than render a dead anchor. (The CMS
 *   schema only accepts fragment hrefs that name an existing section, so
 *   the only fragments that can reach here and map to null are the
 *   sections with no page: #about, #disciplines, #recruitment.)
 */
const SECTION_PAGES: Record<string, string> = {
  "#results": "/pow",
  "#team": "/team",
  "#writeups": "/blog",
  "#contact": "/contact",
  "#home": "#home",
  "#main": "#main",
};

export function resolvePosterHref(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("http")) return href;
  if (href.startsWith("#")) return SECTION_PAGES[href.toLowerCase()] ?? null;
  return null;
}
