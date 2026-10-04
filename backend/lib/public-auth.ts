import "server-only";
import { adminAuth, configuration, database } from "./firebase-admin";
import { equalSecret, HttpError } from "./http";
import { publicProfileSchema, type PublicProfile } from "./schema";

export type PublicUser = { uid: string; email: string; emailVerified: boolean; profile: PublicProfile | null };

export function requirePlatformGateway(request: Request) {
  if (!configuration().ready) throw new HttpError(503, "The platform is not configured yet.");
  const supplied = request.headers.get("x-platform-key") ?? "";
  if (!equalSecret(supplied, process.env.PLATFORM_API_SECRET ?? "")) throw new HttpError(403, "This platform gateway is not allowed.");
}

export async function requirePublicUser(request: Request, requireVerified = true): Promise<PublicUser> {
  requirePlatformGateway(request);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) throw new HttpError(401, "Sign in to continue.");
  let claims;
  try { claims = await adminAuth().verifyIdToken(token, true); }
  catch { throw new HttpError(401, "Your sign-in has expired. Please sign in again."); }
  if (!claims.email) throw new HttpError(403, "This account does not have an email address.");
  if (requireVerified && !claims.email_verified) throw new HttpError(403, "Verify your email address before continuing.");
  const snapshot = await database().ref(`community/profiles/${claims.uid}`).get();
  const profile = snapshot.exists() ? publicProfileSchema.parse(snapshot.val()) : null;
  return { uid: claims.uid, email: claims.email.toLowerCase(), emailVerified: Boolean(claims.email_verified), profile };
}
