import { NextResponse } from "next/server";
import {
  BETA_COOKIE,
  BETA_SESSION_SECONDS,
  betaPassword,
  betaSessionToken,
  matchesBetaPassword,
} from "@/lib/beta-access";
import { SITE_URL } from "@/lib/seo";

export async function POST(request: Request) {
  // Behind Vercel the application request URL and Host can be internal names,
  // while the browser sends the canonical site's Origin. Trust only our known
  // public site origins in that case; never trust arbitrary X-Forwarded-Host.
  const postedOrigin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const incomingHost = request.headers.get("host");
  const publicOrigin = new URL(SITE_URL).origin;
  const publicOrigins = new Set([publicOrigin, `https://www.${new URL(SITE_URL).hostname}`]);

  let verifiedOrigin: string | null = null;
  if (postedOrigin) {
    try {
      const parsed = new URL(postedOrigin);
      const isHttps = parsed.protocol === "https:";
      const isLocalHttp =
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
        ["localhost", "127.0.0.1"].includes(new URL(requestOrigin).hostname);
      // Origin headers must be exact serialized origins (no path or credentials).
      const sameOrigin =
        publicOrigins.has(postedOrigin) ||
        (postedOrigin === requestOrigin && (isHttps || isLocalHttp)) ||
        (incomingHost === parsed.host && (isHttps || isLocalHttp));

      if (postedOrigin === parsed.origin && sameOrigin) verifiedOrigin = postedOrigin;
    } catch { /* Malformed origins are rejected. */ }
  }
  if (!verifiedOrigin) {
    return new Response("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "X-Kn1ghts-Beta-Reject": "origin",
      },
    });
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
    return NextResponse.redirect(new URL("/beta?error=1", verifiedOrigin), { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.redirect(new URL("/beta", verifiedOrigin), {
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
