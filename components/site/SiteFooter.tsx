import Link from "next/link";
import type { IconType } from "react-icons";
import { FaDiscord, FaEnvelope, FaGithub, FaInstagram, FaLink, FaLinkedin, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { availableLink, type SiteContent } from "@/backend/lib/schema";
import { accent, pageLinks } from "./ui";
import { Brand } from "./Wordmark";

function socialIcon(href: string): IconType {
  if (href.startsWith("mailto:")) return FaEnvelope;
  const host = (() => { try { return new URL(href).hostname; } catch { return ""; } })();
  if (host.includes("github")) return FaGithub;
  if (host.includes("linkedin")) return FaLinkedin;
  if (host.includes("discord")) return FaDiscord;
  if (host.includes("instagram")) return FaInstagram;
  if (host.includes("youtube")) return FaYoutube;
  if (host === "x.com" || host.includes("twitter")) return FaXTwitter;
  return FaLink;
}

// Section anchors (#team) point at the home page so they work from every route.
const resolve = (href: string) => href.startsWith("#") ? `/${href}` : href;
const external = (href: string) => /^https?:/.test(href) ? { target: "_blank", rel: "noreferrer" } : {};

export function SiteFooter({ site }: { site: SiteContent }) {
  const { settings } = site;
  const social = settings.footerLinks.filter((link) => /^(https?:|mailto:)/.test(link.href));
  const columns = [
    { title: "Explore", heading: "text-ember", hover: "hover:text-steel", links: settings.navigation.filter((link) => availableLink(site, link.href)) },
    { title: "Community", heading: "text-steel", hover: "hover:text-ember", links: pageLinks.filter((link) => link.href !== "/") },
    { title: "Connect", heading: "text-gold", hover: "hover:text-gold", links: settings.footerLinks.filter((link) => availableLink(site, link.href)) },
  ];
  return <footer className="relative bg-ink-deep border-t border-edge">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ember to-transparent" />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        <div className="lg:col-span-1">
          <Link className="inline-block mb-4 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,122,61,0.6)]" href="/" aria-label={`${settings.name} home`}>
            <Brand name={settings.name} size="h-12 w-12" text="text-xl" />
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{settings.description}</p>
          {social.length > 0 && <div className="flex space-x-4">
            {social.map((link, index) => {
              const Icon = socialIcon(link.href);
              return <a key={`${link.label}-${link.href}`} href={link.href} {...external(link.href)} className={`p-2 bg-panel border border-edge rounded-lg text-gray-400 ${accent(index + 1).hover} transition-all duration-300`} aria-label={link.label}><Icon className="w-5 h-5" /></a>;
            })}
          </div>}
        </div>
        {columns.filter((column) => column.links.length > 0).map((column) => <div key={column.title}>
          <h4 className={`font-cyber ${column.heading} text-sm uppercase tracking-wider mb-4`}>{column.title}</h4>
          <ul className="space-y-3">
            {column.links.map((link) => <li key={`${link.label}-${link.href}`}><a className={`text-gray-400 ${column.hover} transition-colors duration-300`} href={resolve(link.href)} {...external(link.href)}>{link.label}</a></li>)}
          </ul>
        </div>)}
      </div>
      <div className="mt-12 pt-8 border-t border-edge">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <p className="text-gray-500 text-sm">{settings.copyright}</p>
          <p className="text-gray-500 text-sm font-mono">{settings.headerLine}</p>
        </div>
      </div>
    </div>
  </footer>;
}
