import "server-only";
import { createHmac } from "node:crypto";
import { equalSecret, HttpError } from "./http";
import { database } from "./firebase-admin";
import type { Member } from "./schema";

function signature(value: string) {
  if (!process.env.PREVIEW_SECRET || process.env.PREVIEW_SECRET.length < 32) throw new HttpError(503, "Preview is not configured.");
  return createHmac("sha256", process.env.PREVIEW_SECRET).update(value).digest("base64url");
}
export function createPreview(uid: string) {
  const value = Buffer.from(JSON.stringify({ uid, expires: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  return `${value}.${signature(value)}`;
}
export async function verifyPreview(token: string) {
  if (token.length > 1500) throw new HttpError(403, "The preview link is invalid.");
  const [value, signed, extra] = token.split(".");
  if (!value || !signed || extra || !equalSecret(signature(value), signed)) throw new HttpError(403, "The preview link is invalid.");
  let claims;
  try { claims = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); }
  catch { throw new HttpError(403, "The preview link is invalid."); }
  if (typeof claims.uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(claims.uid) || typeof claims.expires !== "number" || claims.expires < Date.now()) throw new HttpError(403, "The preview link has expired.");
  const member = (await database().ref(`access/members/${claims.uid}`).get()).val() as Member | null;
  if (!member?.active) throw new HttpError(403, "Preview access has been revoked.");
}
