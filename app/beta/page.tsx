import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { getSiteContent } from "@/lib/site-content";
import { BETA_COOKIE, betaPassword, hasBetaSession } from "@/lib/beta-access";
import styles from "../coming-soon.module.css";

type Props = { searchParams: Promise<{ error?: string; preview?: string }> };
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "KN1GHTS — private beta" },
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default async function BetaPage({ searchParams }: Props) {
  const password = betaPassword();
  const cookie = (await cookies()).get(BETA_COOKIE)?.value;
  if (!password || !hasBetaSession(cookie, password)) {
    const { error } = await searchParams;
    return (
      <main className={styles.page}>
        <header className={styles.top}><Link href="/" className={styles.brand}>kn1ghts.</Link><span className={styles.smallLabel}>private preview</span></header>
        <section className={styles.middle}>
          <span className={styles.eyebrow}>the workshop door</span>
          <h1 className={styles.heading}>a little behind-the-scenes ♡</h1>
          <p className={styles.note}>The full site is taking shape here. This corner is just for our builders.</p>
          {password ? (
            <form action="/beta/access" method="post" className={styles.gate}>
              <label className={styles.gateLabel} htmlFor="beta-password">Preview password</label>
              <input id="beta-password" name="password" className={styles.gateInput} type="password" autoComplete="off" minLength={24} required />
              <button className={styles.gateButton} type="submit">step inside →</button>
              {error && <p role="alert" className={styles.error}>That code wasn&apos;t quite right.</p>}
            </form>
          ) : <p className={styles.note}>Private access has not been configured yet. Ask the site owner to add the preview password.</p>}
        </section>
        <footer className={styles.footer}><Link href="/">← back home</Link></footer>
      </main>
    );
  }

  const { preview } = await searchParams;
  let site;
  try { site = await getSiteContent(preview); }
  catch {
    return (
      <main className={styles.page}>
        <section className={styles.middle}><h1 className={styles.heading}>preview unavailable.</h1><p className={styles.note}>This draft may have expired. Request a fresh preview from the management app.</p><Link href="/beta">Try the published version →</Link></section>
      </main>
    );
  }
  // The poster homepage renders no platform teasers, so no platform fetch
  // runs here — the page no longer waits on the platform backend.
  return <HomePage
    data={site} preview={Boolean(preview)}
    contactReady={Boolean(process.env.BACKEND_URL && process.env.CONTACT_API_SECRET)}
  />;
}
