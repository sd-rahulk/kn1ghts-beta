/** Canonical public origin, independent of CMS previews or deployment aliases. */
export const SITE_URL = "https://kn1ghts.org";

export const SITE_NAME = "kn1ghts";
export const SITE_DESCRIPTION =
  "kn1ghts is an Indian cybersecurity and Capture the Flag team. Explore competition results, team members, security research and CTF field guides.";

export const PUBLIC_PROFILES = [
  "https://github.com/Kn1ghts-org",
  "https://www.linkedin.com/company/kn1ghts/",
  "https://ctftime.org/team/453025",
  // Historical competition records under another account are not identity equivalents.
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
