import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import { Background } from "@/components/site/Background";
import { INTRO_KEY, INTRO_SOURCE } from "@/components/site/intro";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "KN1GHTS | Competitive Cybersecurity",
  description: "Competitive cybersecurity. Offensive research. CTFs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1011",
};

// Runs before first paint: decides whether the home-page logo intro plays, so the hero never flashes
// visible and then hides. Skipped for reduced motion, deep links, previews and repeat visits this
// session. The timeout reveals the page even if the intro script never runs.
const introGate = `try{var d=document.documentElement,q=new URLSearchParams(location.search);if(location.pathname==="/"&&!location.hash&&!q.has("preview")&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem(${JSON.stringify(INTRO_KEY)})){d.setAttribute("data-intro","");new Image().src=${JSON.stringify(INTRO_SOURCE)};setTimeout(function(){d.removeAttribute("data-intro")},6000)}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${orbitron.variable} ${jetbrains.variable}`} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: introGate }} /></head>
    <body className="antialiased">
      <Background />
      <div className="relative z-10">{children}</div>
    </body>
  </html>;
}
