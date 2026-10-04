import "server-only";
import { cookies } from "next/headers";
import { adminAuth, configuration, database } from "./firebase-admin";
import { checkOrigin, equalSecret, HttpError } from "./http";
import type { Actor, Member } from "./schema";

export const sessionCookieName = process.env.NODE_ENV === "production" ? "__Host-kn1ghts-session" : "kn1ghts-session";
export const csrfCookieName = process.env.NODE_ENV === "production" ? "__Host-kn1ghts-csrf" : "kn1ghts-csrf";
export const sessionDuration = 60 * 60 * 24 * 5;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };

export async function getActor(): Promise<Actor | null> {
  if (!configuration().ready) return null;
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;
  return actorForToken(token);
}
export async function actorForToken(token: string): Promise<Actor | null> {
  try {
    const claims = await adminAuth().verifySessionCookie(token, true);
    if (!claims.email_verified || !claims.email) return null;
    const member = (await database().ref(`access/members/${claims.uid}`).get()).val() as Member | null;
    if (!member?.active || member.email.toLowerCase() !== claims.email.toLowerCase() || !["owner", "editor", "viewer"].includes(member.role)) return null;
    return { uid: claims.uid, email: claims.email, role: member.role };
  } catch { return null; }
}
export async function requireActor(write = false, owner = false) {
  const actor = await getActor();
  if (!actor) throw new HttpError(401, "Your session has expired. Please sign in again.");
  if ((write && actor.role === "viewer") || (owner && actor.role !== "owner")) throw new HttpError(403, "Your role does not allow this action.");
  return actor;
}
export async function verifyMutation(request: Request) {
  checkOrigin(request);
  const token = (await cookies()).get(csrfCookieName)?.value ?? "";
  if (!equalSecret(token, request.headers.get("x-csrf-token") ?? "")) throw new HttpError(403, "The request verification token is missing or expired. Refresh and try again.", "csrf");
}
