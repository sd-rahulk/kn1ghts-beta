import type { ReactNode } from "react";
import type { SiteContent } from "@/backend/lib/schema";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export function SiteChrome({ site, children }: { site: SiteContent; children: ReactNode }) {
  return <>
    <a className="skip-link" href="#main">{site.settings.labels.skipContent}</a>
    <SiteNav name={site.settings.name} mark={site.settings.registrationMark} />
    <main id="main" className="min-h-screen">{children}</main>
    <SiteFooter site={site} />
  </>;
}
