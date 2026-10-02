import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { contactSchema } from "@/backend/lib/schema";
import { getSiteContent } from "@/lib/site-content";

export async function POST(request: Request) {
  const reply = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  const origin = process.env.PUBLIC_SITE_ORIGIN ?? (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : "");
  if (!origin || request.headers.get("origin") !== origin) return reply("This request origin is not allowed.", 403);
  if (!process.env.BACKEND_URL || !process.env.CONTACT_API_SECRET || process.env.CONTACT_API_SECRET.length < 32) return reply("The contact channel is not configured yet.", 503);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply("Send JSON content.", 415);
  const reader = request.body?.getReader();
  if (!reader) return reply("A message is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 10000) { await reader.cancel(); return reply("The message is too large.", 413); }
    chunks.push(value);
  }
  let body;
  try { body = contactSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
  catch { return reply("The message could not be read.", 400); }
  if (!body.success) return reply("Enter a valid name, email, and a message of 10–5000 characters.", 400);
  if (body.data.website) return NextResponse.json({ ok: true });
  if (!(await getSiteContent()).settings.contact.enabled) return reply("The contact channel is unavailable.", 503);
  // Only trust an IP header your deployment proxy overwrites. Otherwise use email plus the backend's global limit.
  const header = process.env.CONTACT_TRUSTED_IP_HEADER;
  const client = header ? request.headers.get(header) || body.data.email.toLowerCase() : body.data.email.toLowerCase();
  const requestKey = createHmac("sha256", process.env.CONTACT_API_SECRET).update(client).digest("hex");
  try {
    const response = await fetch(new URL("/api/public/contact", process.env.BACKEND_URL), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CONTACT_API_SECRET}` },
      body: JSON.stringify({ ...body.data, requestKey }),
    });
    if (!response.ok) return reply(response.status === 429 ? "Too many messages. Please wait before trying again." : "Your message could not be delivered. Please try again.", response.status === 429 ? 429 : 503);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return reply("Your message could not be delivered. Please try again.", 503); }
}
