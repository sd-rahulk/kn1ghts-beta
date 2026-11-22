import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteExperience } from "@/components/SiteExperience";
import { getSiteContent } from "@/lib/site-content";
import type { HomePlatformData } from "@/lib/platform-api";
import { canonicalUrl } from "@/lib/seo";
import styles from "./mascot-home.module.css";

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
    <main className={styles.page}>
      <header className={styles.titleWrap}>
        <h1 className={styles.title} aria-label="kn1ghts">
          <span>kn</span><span className={styles.one}>1</span><span>ghts</span>
        </h1>
        <svg className={styles.crown} viewBox="0 0 76 50" fill="none" aria-hidden="true">
          <path d="M8 15L22 28L38 6L54 28L68 15L61 41H15L8 15Z" fill="#FFD06B" stroke="#D89938" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M22 33H55" stroke="#F5AB48" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="6" r="4" fill="#FFD06B" />
        </svg>
      </header>
      <div className={styles.mascotWrap}>
        <Image
          src="/kn1ghts-construction-knight.svg"
          className={styles.mascot}
          alt="A happy chubby knight holds a striped construction board, with traffic cones, helmet, barricade, wrench and toolbox."
          width={1440}
          height={569}
          priority
          unoptimized
          sizes="(max-width: 700px) 100vw, 1200px"
        />
      </div>
      <nav className={styles.iconLinks} aria-label="Explore kn1ghts">
        <Link href="/team" aria-label="Visit the kn1ghts team">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8.2" r="3.1" /><path d="M3.5 19.2v-1.3a5.5 5.5 0 0 1 11 0v1.3M16.9 5.3a3 3 0 0 1 0 5.8M17 13.5a4.5 4.5 0 0 1 3.5 4.4v1.3" />
          </svg>
        </Link>
        <Link href="/blog" aria-label="Read the kn1ghts blog">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19.5c-2.6-1.6-5.8-1.9-9-1.6V5.2c3.2-.3 6.5 0 9 1.8 2.5-1.8 5.8-2.1 9-1.8v12.7c-3.2-.3-6.4 0-9 1.6ZM12 7v12.5" />
          </svg>
        </Link>
      </nav>
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
