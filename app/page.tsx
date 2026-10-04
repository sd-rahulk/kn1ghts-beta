import { SiteExperience } from "@/components/SiteExperience";
import { getSiteContent } from "@/lib/site-content";
import type { Metadata } from "next";
import Link from "next/link";
import { platformOr, type HomePlatformData } from "@/lib/platform-api";

type Props = { searchParams: Promise<{ preview?: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { preview } = await searchParams;
  try {
    const site = await getSiteContent(preview);
    return { title: site.settings.title, description: site.settings.description, ...(preview ? { robots: { index: false, follow: false }, referrer: "no-referrer" as const } : {}) };
  } catch { return { title: "Preview unavailable", robots: { index: false, follow: false } }; }
}
export default async function Home({ searchParams }: Props) {
  const { preview } = await searchParams;
  let site;
  try { site = await getSiteContent(preview); }
  catch { return <main className="preview-error"><h1>Preview unavailable</h1><p>This link has expired or access was revoked. Create a new preview from the backend.</p><Link href="/">Return to the published site</Link></main>; }
  const platform = preview ? { blog: [], events: [], challenge: null } : await platformOr<HomePlatformData>("home", { blog: [], events: [], challenge: null });
  return <SiteExperience data={site} platform={platform} preview={Boolean(preview)} contactReady={Boolean(process.env.BACKEND_URL && process.env.CONTACT_API_SECRET)} />;
}
