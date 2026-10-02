import { z } from "zod";
import { adminAuth, configuration, database } from "@/lib/firebase-admin";
import { cookieOptions, sessionCookieName, sessionDuration, verifyMutation } from "@/lib/auth";
import { handler, HttpError, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import type { Member } from "@/lib/schema";

export async function POST(request: Request) {
  return handler(async () => {
    if (!configuration().ready) throw new HttpError(503, "Finish Firebase configuration before signing in.");
    await verifyMutation(request);
    const { idToken } = z.object({ idToken: z.string().min(20).max(12000) }).strict().parse(await readJson(request, 14000));
    let claims;
    try { claims = await adminAuth().verifyIdToken(idToken, true); }
    catch { throw new HttpError(401, "The sign-in token is invalid or expired."); }
    if (!claims.email_verified || !claims.email) throw new HttpError(403, "Verify your email address before signing in.");
    if (Math.abs(Date.now() / 1000 - claims.auth_time) > 300) throw new HttpError(401, "Please sign in again to start a fresh session.");
    await rateLimit(`session-${claims.uid}`, 10, 60000);
    const member = (await database().ref(`access/members/${claims.uid}`).get()).val() as Member | null;
    if (!member?.active || member.email.toLowerCase() !== claims.email.toLowerCase() || !["owner", "editor", "viewer"].includes(member.role)) throw new HttpError(403, "This account has not been granted access.");
    const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: sessionDuration * 1000 });
    const response = json({ ok: true });
    response.cookies.set(sessionCookieName, cookie, { ...cookieOptions, maxAge: sessionDuration });
    return response;
  });
}
