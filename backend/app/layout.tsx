import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

// Same typefaces as the public site, so the workspace reads as part of the same brand.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = { title: "KN1GHTS / Site management", description: "Private KN1GHTS content management.", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#0c1011" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${inter.variable} ${orbitron.variable} ${jetbrains.variable}`}><body>{children}</body></html>;
}
