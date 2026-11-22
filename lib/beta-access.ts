import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const BETA_COOKIE = "kn1ghts_beta_session";
export const BETA_SESSION_SECONDS = 12 * 60 * 60;

export function betaPassword(): string | null {
  const password = process.env.BETA_ACCESS_PASSWORD;
  // Fail closed: an absent or weak secret must never expose the original homepage.
  return password && password.length >= 24 ? password : null;
}

export function betaSessionToken(password: string): string {
  return createHmac("sha256", password)
    .update("KN1GHTS-private-beta-session-v1")
    .digest("hex");
}

export function matchesBetaPassword(candidate: string, password: string): boolean {
  const expected = createHash("sha256").update(password).digest();
  const provided = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, provided);
}

export function hasBetaSession(cookieValue: string | undefined, password: string): boolean {
  if (!cookieValue || !/^[a-f0-9]{64}$/.test(cookieValue)) return false;
  const expected = Buffer.from(betaSessionToken(password), "hex");
  const provided = Buffer.from(cookieValue, "hex");
  return timingSafeEqual(expected, provided);
}
