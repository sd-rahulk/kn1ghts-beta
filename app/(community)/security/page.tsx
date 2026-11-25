import Link from "next/link";
import { PageLead } from "@/components/community/CommunityShell";

export const metadata = {
  title: "Responsible Security Disclosure",
  description: "Learn how to privately report a vulnerability in a kn1ghts system, what evidence to include and the boundaries of responsible security testing.",
  alternates: { canonical: "https://kn1ghts.org/security" },
  openGraph: { title: "Responsible Security Disclosure | kn1ghts", description: "Learn how to privately report a vulnerability in a kn1ghts system, what evidence to include and the boundaries of responsible security testing.", url: "https://kn1ghts.org/security", siteName: "kn1ghts", type: "website" as const },
  twitter: { card: "summary" as const, title: "Responsible Security Disclosure | kn1ghts", description: "Learn how to privately report a vulnerability in a kn1ghts system, what evidence to include and the boundaries of responsible security testing." },
};

export default function SecurityPage() {
  return (
    <main className="community-page">
      <PageLead
        meta="RESPONSIBLE DISCLOSURE"
        title="SECURITY"
        description="Found a security issue in a KN1GHTS system? Tell us privately so we can fix it before it is shared."
      />
      <div className="community-list">
        <article className="community-row">
          <span>01 / REPORT</span>
          <div>
            <h2>Report it privately</h2>
            <p>
              Send the details through the contact form on this site. Include what you found, where you found
              it, and steps to reproduce it.
            </p>
          </div>
          <Link className="row-link" href="/contact">
            CONTACT →
          </Link>
        </article>
        <article className="community-row">
          <span>02 / INCLUDE</span>
          <div>
            <h2>What helps us fix it</h2>
            <p>
              The affected URL or service, the kind of issue, a minimal
              reproduction, and any evidence that stays within the affected
              system. Screenshots and request logs help; credentials and live
              session values do not belong in a report.
            </p>
          </div>
        </article>
        <article className="community-row">
          <span>03 / PLEASE DON&apos;T</span>
          <div>
            <h2>Ground rules</h2>
            <p>
              Do not disclose the issue publicly before we have had a chance to
              fix it, do not access or modify other people&apos;s data, and do
              not run destructive tests or degrade the service. We will confirm
              receipt and keep you updated while a fix is in progress.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
