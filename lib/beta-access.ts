import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const BETA_COOKIE = "kn1ghts_beta_session";
export const BETA_SESSION_SECONDS = 12 * 60 * 60;

export function betaPassword(): string | null {
  const password = process.env.BETA_ACCESS_PASSWORD;
  // Fail closed: an absent or weak secret must never expose the original homepage.
  return password && password.length >= 24 ? password : null;
}

function signExpiry(expires: number, password: string): string {
  return createHmac("sha256", password)
    .update(`KN1GHTS-private-beta-session-v1:${expires}`)
    .digest("hex");
}

export function betaSessionToken(password: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + BETA_SESSION_SECONDS;
  return `${expires}.${signExpiry(expires, password)}`;
}

export function matchesBetaPassword(candidate: string, password: string): boolean {
  const expected = createHash("sha256").update(password).digest();
  const provided = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, provided);
}

export function hasBetaSession(cookieValue: string | undefined, password: string, now = Date.now()): boolean {
  if (!cookieValue || !/^\d{10}\.[a-f0-9]{64}$/.test(cookieValue)) return false;
  const [rawExpiry, signature] = cookieValue.split(".");
  const expires = Number(rawExpiry);
  const current = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expires) || expires < current || expires > current + BETA_SESSION_SECONDS) return false;
  const expected = Buffer.from(signExpiry(expires, password), "hex");
  const provided = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, provided);
}
