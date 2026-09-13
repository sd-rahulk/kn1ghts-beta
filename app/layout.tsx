import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KN1GHTS | Offensive Security",
  description: "Built through competition. Sharpened through failure. Proven under pressure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
