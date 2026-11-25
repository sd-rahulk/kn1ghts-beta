import Link from "next/link";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getSiteContent } from "@/lib/site-content";
import { canonicalUrl } from "@/lib/seo";

type Props = { searchParams: Promise<{ preview?: string }> };

export const dynamic = "force-dynamic";

const title = "kn1ghts | Cybersecurity & CTF Team in India";
const description =
  "Meet kn1ghts, an Indian cybersecurity and Capture the Flag (CTF) team. Explore our team, real competition results, and original security field notes.";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { preview } = await searchParams;
  if (preview) {
    return {
      title: { absolute: "kn1ghts — draft preview" },
      robots: { index: false, follow: false, noarchive: true },
      referrer: "no-referrer",
    };
  }
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl("/") },
    openGraph: {
      type: "website",
      siteName: "kn1ghts",
      title,
      description,
      url: canonicalUrl("/"),
      images: [
        {
          url: canonicalUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "kn1ghts — competitive cybersecurity and CTF team from India",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [canonicalUrl("/opengraph-image")],
    },
  };
}

export default async function Home({ searchParams }: Props) {
  const { preview } = await searchParams;
  // Keep the existing short-lived CMS previews; the backend validates tokens.
  // They are not the public homepage and remain noindex.
  let site;
  try {
    site = await getSiteContent(preview);
  } catch {
    return (
      <main className="preview-error">
        <h1>preview unavailable.</h1>
        <p>This draft link has expired or been revoked.</p>
        <Link href="/">back home</Link>
      </main>
    );
  }
  // The poster homepage renders no platform teasers, so no platform fetch
  // runs here — the page no longer waits on the platform backend.
  return (
    <HomePage
      data={site}
      preview={Boolean(preview)}
      contactReady={Boolean(process.env.BACKEND_URL && process.env.CONTACT_API_SECRET)}
    />
  );
}
