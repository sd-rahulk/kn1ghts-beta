import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "KN1GHTS / Site management", description: "Private KN1GHTS content management.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
