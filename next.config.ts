import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Short initial HSTS rollout without includeSubDomains or preload.
  // CTF challenge endpoints may use non-HTTPS services.
  { key: "Strict-Transport-Security", value: "max-age=300" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  async headers() {
    const privatePreviewHeaders = [
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/beta", headers: privatePreviewHeaders },
      { source: "/beta/:path*", headers: privatePreviewHeaders },
    ];
  },
};

export default nextConfig;
