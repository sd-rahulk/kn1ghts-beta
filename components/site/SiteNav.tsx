"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { pageLinks } from "./ui";
import { Wordmark } from "./Wordmark";

export function SiteNav({ name, mark }: { name: string; mark: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  // Close the mobile menu whenever the route changes.
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || open ? "bg-vapor-darker/95 backdrop-blur-md shadow-[0_0_20px_rgba(255,0,110,0.2)]" : "bg-transparent"}`} aria-label="Primary navigation">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-20">
        <Link className="flex items-center group" href="/" aria-label={`${name} home`}>
          <Wordmark name={name} mark={mark} className="text-2xl sm:text-3xl transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(0,217,255,0.6)]" />
        </Link>
        <div className="hidden lg:flex items-center space-x-1">
          {pageLinks.map((link) => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} className={`nav-link px-4 py-2 font-medium tracking-wide transition-colors duration-300 ${active(link.href) ? "text-vapor-cyan" : "text-gray-300 hover:text-vapor-pink"}`}>{link.label}</Link>)}
        </div>
        <button className="lg:hidden p-2 text-gray-300 hover:text-vapor-pink transition-colors duration-300" aria-label="Toggle mobile menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => { setOpenedAt(pathname); setOpen((value) => !value); }}>
          {open ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
        </button>
      </div>
    </div>
    <div id="mobile-menu" className={`lg:hidden transition-all duration-300 overflow-hidden ${open ? "max-h-[640px]" : "max-h-0"}`} inert={!open}>
      <div className="bg-vapor-darker/98 backdrop-blur-md border-t border-vapor-border px-4 py-4">
        {pageLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={active(link.href) ? "page" : undefined} className={`block py-3 px-4 font-medium tracking-wide transition-colors duration-300 ${active(link.href) ? "text-vapor-cyan border-l-2 border-vapor-cyan bg-vapor-cyan/5" : "text-gray-300 hover:text-vapor-pink hover:bg-vapor-pink/5"}`}>{link.label}</Link>)}
        <div className="mt-4 px-4">
          <Link className="block w-full text-center cyber-button text-sm" href="/contact" onClick={() => setOpen(false)}>Join</Link>
        </div>
      </div>
    </div>
  </nav>;
}
