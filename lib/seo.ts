/** Canonical public origin, independent of CMS previews or deployment aliases. */
export const SITE_URL = "https://kn1ghts.org";

export const SITE_NAME = "KN1GHTS";
export const SITE_DESCRIPTION =
  "KN1GHTS is a competitive cybersecurity team and community in India, focused on capture-the-flag competitions, offensive security research, and technical projects.";

export const PUBLIC_PROFILES = [
  "https://github.com/Kn1ghts-org",
  "https://www.linkedin.com/company/kn1ghts/",
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
