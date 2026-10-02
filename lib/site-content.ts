import "server-only";
import { cache } from "react";
import initial from "@/backend/content/default.json";
import { siteSchema, type SiteContent } from "@/backend/lib/schema";

export const getSiteContent = cache(async (preview?: string): Promise<SiteContent> => {
  if (preview) {
    if (!process.env.BACKEND_URL) throw new Error("Draft preview is not configured.");
    const url = new URL("/api/public/preview", process.env.BACKEND_URL);
    url.searchParams.set("token", preview);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("This preview link has expired or access was revoked.");
    return siteSchema.parse((await response.json()).content);
  }
  const databaseUrl = process.env.FIREBASE_DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(`${databaseUrl.replace(/\/$/, "")}/cms/published.json`);
    if (process.env.FIREBASE_DATABASE_NAMESPACE) url.searchParams.set("ns", process.env.FIREBASE_DATABASE_NAMESPACE);
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (response.ok) { const content = await response.json(); if (content) return siteSchema.parse(content); }
    } catch { console.error("Published site content is unavailable; using the bundled initial content."); }
  }
  return siteSchema.parse(initial);
});
