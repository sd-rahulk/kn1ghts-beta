import { Story } from "@/components/sections/Story";
import { SiteChrome } from "@/components/site/SiteChrome";
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
  catch {
    return <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-cyber text-4xl font-bold mb-4"><span className="gradient-text">Preview unavailable</span></h1>
      <p className="text-gray-400 max-w-xl mb-8">This link has expired or access was revoked. Create a new preview from the backend.</p>
      <Link className="cyber-button" href="/">Return to the published site</Link>
    </main>;
  }
  const platform = preview ? { blog: [], events: [], challenge: null } : await platformOr<HomePlatformData>("home", { blog: [], events: [], challenge: null });
  const contactReady = Boolean(process.env.BACKEND_URL && process.env.CONTACT_API_SECRET) && !preview;
  return <SiteChrome site={site}>
    <Story site={site} platform={platform} contactReady={contactReady} />
    {preview && <div className="fixed z-[100] left-1/2 bottom-4 -translate-x-1/2 whitespace-nowrap px-4 py-3 bg-panel border border-verdigris rounded-lg font-mono text-sm text-verdigris" role="status">DRAFT PREVIEW · Not published</div>}
  </SiteChrome>;
}
