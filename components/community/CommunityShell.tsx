import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaShieldAlt } from "react-icons/fa";
import { AuthProvider } from "./AuthProvider";
import type { SiteContent } from "@/backend/lib/schema";
import { Pill } from "@/components/site/Pill";
import { SiteChrome } from "@/components/site/SiteChrome";
import { SplitTitle } from "@/components/site/Title";
import { container } from "@/components/site/ui";

export function CommunityShell({ children, site }: { children: ReactNode; site: SiteContent }) {
  return <AuthProvider><SiteChrome site={site}>{children}</SiteChrome></AuthProvider>;
}

export function PageLead({ title, description, meta, icon = FaShieldAlt }: { title: string; description: string; meta: string; icon?: IconType }) {
  return <div className="pt-20"><section className="relative py-24 hero-bg">
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center">
      <Pill icon={icon}>{meta}</Pill>
      <h1 className="font-cyber text-5xl md:text-6xl font-bold mb-6 break-words"><SplitTitle value={title} /></h1>
      <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">{description}</p>
    </div></div>
  </section></div>;
}

export function PageBody({ children, narrow = false, alt = false }: { children: ReactNode; narrow?: boolean; alt?: boolean }) {
  return <section className={`relative py-20 ${alt ? "bg-vapor-darker/30" : ""}`}><div className={narrow ? "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" : container}>{children}</div></section>;
}

// "Important Dates" style heading: the glowing lead word, then white.
export function SectionTitle({ glow, rest = "", tone = "neon-pink", className = "text-center mb-12" }: { glow: string; rest?: string; tone?: "neon-pink" | "neon-cyan"; className?: string }) {
  return <h2 className={`font-cyber text-3xl font-bold ${className}`}><span className={tone}>{glow}</span>{rest && <> <span className="text-white">{rest}</span></>}</h2>;
}

// Contact-page layout: a short brief on the left, the form card on the right.
export function FormLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return <PageBody narrow><div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
    <div className="lg:col-span-2">{aside}</div>
    <div className="lg:col-span-3"><div className="cyber-card p-8">{children}</div></div>
  </div></PageBody>;
}

export function EmptyState({ children }: { children: ReactNode }) { return <div className="cyber-card p-12 text-center text-gray-400 max-w-3xl mx-auto">{children}</div>; }

export function formatDate(value: number) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
