import "server-only";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export function equalSecret(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!process.env.ADMIN_ORIGIN || origin !== process.env.ADMIN_ORIGIN) throw new HttpError(403, "This request origin is not allowed.");
  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site)) throw new HttpError(403, "Cross-site requests are not allowed.");
}
export async function readJson(request: Request, limit = 300000): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send JSON content.");
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new HttpError(413, "The request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "The request body is missing.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > limit) { await reader.cancel(); throw new HttpError(413, "The request is too large."); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "The JSON is invalid."); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export async function handler(run: () => Promise<Response>) {
  try { return await run(); }
  catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
    if (error instanceof ZodError) return json({ error: error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "Content"}: ${issue.message}`).join("\n") }, 400);
    console.error("Backend operation failed", error instanceof Error ? error.name : "Unknown error");
    return json({ error: "The operation could not be completed. Please try again." }, 500);
  }
}
