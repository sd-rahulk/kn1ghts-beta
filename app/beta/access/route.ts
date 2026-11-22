import { NextResponse } from "next/server";
import {
  BETA_COOKIE,
  BETA_SESSION_SECONDS,
  betaPassword,
  betaSessionToken,
  matchesBetaPassword,
} from "@/lib/beta-access";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) {
    return new Response("Forbidden", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) {
    return new Response("Unsupported content type", { status: 415, headers: { "Cache-Control": "no-store" } });
  }

  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > 2048) return new Response("Request too large", { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > 2048) return new Response("Request too large", { status: 413 });

  const password = betaPassword();
  if (!password) {
    return new Response("Private preview has not been configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const candidate = new URLSearchParams(body).get("password") ?? "";
  if (candidate.length > 256 || !matchesBetaPassword(candidate, password)) {
    return NextResponse.redirect(new URL("/beta?error=1", request.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.redirect(new URL("/beta", request.url), {
    status: 303,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
  response.cookies.set(BETA_COOKIE, betaSessionToken(password), {
    path: "/beta",
    maxAge: BETA_SESSION_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return response;
}
