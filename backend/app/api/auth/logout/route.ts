import { cookieOptions, csrfCookieName, getActor, sessionCookieName, verifyMutation } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { handler, json } from "@/lib/http";

export async function POST(request: Request) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await getActor();
    if (actor && new URL(request.url).searchParams.get("all") === "true") await adminAuth().revokeRefreshTokens(actor.uid);
    const response = json({ ok: true });
    response.cookies.set(sessionCookieName, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(csrfCookieName, "", { ...cookieOptions, maxAge: 0 });
    return response;
  });
}
