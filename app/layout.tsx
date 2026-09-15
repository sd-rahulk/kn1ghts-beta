import type { Metadata } from "next";
import "./globals.css";
import "./knights-home.css";

export const metadata: Metadata = {
  title: "KN1GHTS | Competitive Cybersecurity",
  description: "Competitive cybersecurity. Offensive research. CTFs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
