import Link from "next/link";
import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import type { SiteContent } from "@/backend/lib/schema";

const navigation = [
  ["POW", "/pow"], ["TEAM", "/team"], ["EVENTS", "/events"],
  ["WEEKLY", "/inhouse-weekly"], ["BLOG", "/blog"], ["JOIN", "/contact"],
] as const;

export function CommunityShell({ children, settings }: { children: ReactNode; settings: SiteContent["settings"] }) {
  const themed = { "--ink": settings.theme.ink, "--deep": settings.theme.deep, "--tactical": settings.theme.tactical, "--paper": settings.theme.paper, "--soft": settings.theme.soft, "--acid": settings.theme.accent } as React.CSSProperties;
  return <AuthProvider><div className="community-root" style={themed}>
    <header className="community-header">
      <Link className="community-wordmark" href="/">{settings.name}<span>{settings.registrationMark}</span></Link>
      <nav aria-label="Primary navigation">{navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
      <Link className="account-link" href="/account">ACCOUNT</Link>
    </header>
    {children}
    <footer className="community-footer"><span>{settings.headerLine}</span><div>{settings.footerLinks.map((link) => <a key={`${link.label}-${link.href}`} href={link.href.startsWith("#") ? `/${link.href}` : link.href} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{link.label}</a>)}</div><span>{settings.copyright}</span></footer>
  </div></AuthProvider>;
}

export function PageLead({ title, description, meta }: { title: string; description: string; meta: string }) {
  return <header className="page-lead"><span>{meta}</span><h1>{title}</h1><p>{description}</p></header>;
}

export function EmptyState({ children }: { children: ReactNode }) { return <div className="community-empty">{children}</div>; }

export function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
