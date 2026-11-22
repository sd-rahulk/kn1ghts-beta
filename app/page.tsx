import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteExperience } from "@/components/SiteExperience";
import { getSiteContent } from "@/lib/site-content";
import type { HomePlatformData } from "@/lib/platform-api";
import { canonicalUrl } from "@/lib/seo";
import styles from "./image-only.module.css";

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
          alt: "kn1ghts cute construction knight brand card",
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

function ComingSoon() {
  return (
    <main className={styles.page} aria-label="kn1ghts homepage">
      <div className={styles.accessibleInfo}>
        <h1>kn1ghts</h1>
        <p>
          kn1ghts is a cybersecurity and Capture the Flag (CTF) team in India.
          Our public team profile and original security field notes are available
          while the main website is under construction.
        </p>
        <nav aria-label="Explore kn1ghts">
          <Link href="/team">Meet the team</Link>
          <Link href="/blog">Security field notes</Link>
          <Link href="/pow">Competition results</Link>
        </nav>
      </div>
      <Image
        src="/kn1ghts-original-knight.webp"
        alt="kn1ghts mascot: a happy chubby knight holding a construction sign"
        width={480}
        height={439}
        className={styles.knight}
        priority
        unoptimized
      />
    </main>
  );
}

export default async function Home({ searchParams }: Props) {
  const { preview } = await searchParams;
  // Keep the existing short-lived CMS previews; the backend validates tokens.
  // They are not the public homepage and remain noindex.
  if (!preview) return <ComingSoon />;

  let site;
  try {
    site = await getSiteContent(preview);
  } catch {
    return (
      <main className={styles.page}>
        <section className={styles.previewError}>
          <h1>preview unavailable.</h1>
          <p>This draft link has expired or been revoked.</p>
          <Link href="/">back home</Link>
        </section>
      </main>
    );
  }
  const platform: HomePlatformData = { blog: [], events: [], challenge: null };
  return <SiteExperience data={site} platform={platform} preview contactReady={false} />;
}
