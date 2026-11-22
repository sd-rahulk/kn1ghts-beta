import Link from "next/link";
import type { Metadata } from "next";
import { SiteExperience } from "@/components/SiteExperience";
import { getSiteContent } from "@/lib/site-content";
import type { HomePlatformData } from "@/lib/platform-api";
import { canonicalUrl } from "@/lib/seo";
import styles from "./coming-soon.module.css";

type Props = { searchParams: Promise<{ preview?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { preview } = await searchParams;
  if (preview) {
    return {
      title: { absolute: "KN1GHTS — draft preview" },
      robots: { index: false, follow: false, noarchive: true },
      referrer: "no-referrer",
    };
  }
  return {
    title: { absolute: "KN1GHTS — a little something is on its way" },
    description: "KN1GHTS is getting a little glow-up. Meet our cybersecurity team and explore the latest field notes while we build.",
    alternates: { canonical: canonicalUrl("/") },
    openGraph: {
      title: "KN1GHTS — under construction",
      description: "A little something is on its way. Meet the team and read our CTF field notes.",
      url: canonicalUrl("/"),
    },
  };
}

function ComingSoon() {
  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <span className={styles.brand}>kn1ghts.</span>
        <span className={styles.smallLabel}>a little corner of the internet</span>
      </header>

      <section className={styles.middle} aria-labelledby="construction-title">
        <svg className={styles.doodle} viewBox="0 0 140 140" fill="none" aria-hidden="true">
          <circle cx="70" cy="66" r="54" fill="#EEF5E9" />
          <path d="M42 105C47 97 93 97 98 105" stroke="#A5C6AA" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M70 99V57" stroke="#568672" strokeWidth="3.1" strokeLinecap="round" />
          <path d="M71 83C52 84 48 72 48 63C61 62 70 67 71 83Z" fill="#B9D5AD" stroke="#568672" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M70 70C89 71 96 58 96 49C80 48 72 54 70 70Z" fill="#D0E6C2" stroke="#568672" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M70 51C62 48 59 41 62 36C65 31 71 32 74 38C76 31 83 31 86 36C90 43 83 51 70 51Z" fill="#F5B7B8" stroke="#B68086" strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 36V47M26.5 41.5H37.5" stroke="#D2AA7C" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M105 75V84M100.5 79.5H109.5" stroke="#B8A3CC" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="32" r="2.5" fill="#E5C58D" />
          <circle cx="35" cy="78" r="2.4" fill="#E7B9C0" />
        </svg>
        <span className={styles.eyebrow}>a tiny work in progress</span>
        <h1 className={styles.heading} id="construction-title">
          something lovely <em>is growing.</em>
        </h1>
        <p className={styles.note}>KN1GHTS is under construction. We&apos;ll be back soon ♡</p>
      </section>

      <footer className={styles.footer}>
        <span>made with curiosity and a lot of caffeine</span>
        <nav className={styles.nav} aria-label="Explore KN1GHTS">
          <Link href="/team">meet the team</Link>
          <Link href="/blog">field notes</Link>
        </nav>
      </footer>
    </main>
  );
}

export default async function Home({ searchParams }: Props) {
  const { preview } = await searchParams;
  // Preserve the management app's existing short-lived draft preview links.
  // Public visitors without a valid token see only the small coming-soon page.
  if (!preview) return <ComingSoon />;

  try {
    const site = await getSiteContent(preview);
    const platform: HomePlatformData = { blog: [], events: [], challenge: null };
    return <SiteExperience data={site} platform={platform} preview contactReady={false} />;
  } catch {
    return (
      <main className={styles.page}>
        <section className={styles.middle}>
          <h1 className={styles.heading}>preview unavailable.</h1>
          <p className={styles.note}>This draft link may have expired or been revoked.</p>
          <nav className={styles.nav}><Link href="/">back home</Link></nav>
        </section>
      </main>
    );
  }
}
