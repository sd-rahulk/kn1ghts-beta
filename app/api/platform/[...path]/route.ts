import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ path: string[] }> };
const reply = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

async function proxy(request: Request, context: Context) {
  if (!process.env.BACKEND_URL || !process.env.PLATFORM_API_SECRET || process.env.PLATFORM_API_SECRET.length < 32) return reply("The community platform is not configured yet.", 503);
  const path = (await context.params).path;
  if (!path.length || path.some((part) => !/^[a-z0-9-]{1,96}$/.test(part))) return reply("The platform request is invalid.", 400);
  const method = request.method;
  let body: string | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply("Send JSON content.", 415);
    if (Number(request.headers.get("content-length") ?? 0) > 150000) return reply("The request is too large.", 413);
    body = await request.text();
    if (Buffer.byteLength(body) > 150000) return reply("The request is too large.", 413);
  }
  const headers: Record<string, string> = { "X-Platform-Key": process.env.PLATFORM_API_SECRET };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) headers.Authorization = authorization;
  if (path[0] === "applications" && body) {
    let email = "anonymous";
    try { email = String((JSON.parse(body) as { email?: string }).email ?? email).trim().toLowerCase(); } catch { return reply("The application could not be read.", 400); }
    headers["X-Request-Key"] = createHmac("sha256", process.env.PLATFORM_API_SECRET).update(email).digest("hex");
  }
  try {
    const response = await fetch(new URL(`/api/public/platform/${path.join("/")}`, process.env.BACKEND_URL), { method, body, headers, cache: "no-store", signal: AbortSignal.timeout(12000) });
    const data = await response.text();
    return new NextResponse(data, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" } });
  } catch { return reply("The community service could not be reached. Please try again.", 503); }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
