/** Canonical public origin, independent of CMS previews or deployment aliases. */
export const SITE_URL = "https://kn1ghts.org";

export const SITE_NAME = "kn1ghts";
export const SITE_DESCRIPTION =
  "kn1ghts is an Indian Capture the Flag (CTF) and cybersecurity team. Explore our competition results, team members, practical security articles and community activities.";

export const PUBLIC_PROFILES = [
  "https://github.com/Kn1ghts-org",
  "https://www.linkedin.com/company/kn1ghts/",
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
