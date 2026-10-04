import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database, configuration } from "@/lib/firebase-admin";
import { contactSchema } from "@/lib/schema";
import { equalSecret, handler, HttpError, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  return handler(async () => {
    if (!configuration().ready) throw new HttpError(503, "Contact is not configured yet.");
    const secret = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!equalSecret(secret, process.env.CONTACT_API_SECRET ?? "")) throw new HttpError(403, "This submission gateway is not allowed.");
    const data = contactSchema.extend({ requestKey: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await readJson(request, 10000));
    if (data.website) return json({ ok: true });
    const enabled = (await database().ref("cms/published/settings/contact/enabled").get()).val();
    if (enabled !== true) throw new HttpError(503, "The contact channel is unavailable.");
    await rateLimit(`contact-${data.requestKey}`, 3, 60 * 60 * 1000);
    await rateLimit("contact-global", 20, 60 * 1000);
    const id = randomUUID();
    await database().ref(`messages/${id}`).set({ id, kind: "contact", name: data.name, email: data.email, message: data.message, createdAt: Date.now(), status: "new", notes: "" });
    return json({ ok: true }, 201);
  });
}
