import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cookieOptions, csrfCookieName, sessionDuration } from "@/lib/auth";
import { json } from "@/lib/http";

// Reuse the browser's existing token so fetching one (another tab, the login form) does not invalidate
// the token other open tabs already hold, and keep it for as long as a session can last.
export async function GET() {
  const existing = (await cookies()).get(csrfCookieName)?.value;
  const token = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex");
  const response = json({ token });
  response.cookies.set(csrfCookieName, token, { ...cookieOptions, maxAge: sessionDuration });
  return response;
}
