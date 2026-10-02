import { randomBytes } from "node:crypto";
import { cookieOptions, csrfCookieName } from "@/lib/auth";
import { json } from "@/lib/http";

export async function GET() {
  const token = randomBytes(32).toString("hex");
  const response = json({ token });
  response.cookies.set(csrfCookieName, token, { ...cookieOptions, maxAge: 60 * 60 });
  return response;
}
