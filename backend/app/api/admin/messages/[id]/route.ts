import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireActor, verifyMutation } from "@/lib/auth";
import { database } from "@/lib/firebase-admin";
import { handler, HttpError, json, readJson } from "@/lib/http";
import type { Message } from "@/lib/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true);
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, "The message ID is invalid.");
    const data = z.object({ status: z.enum(["new", "read", "archived"]), notes: z.string().max(5000) }).strict().parse(await readJson(request, 8000));
    const ref = database().ref(`messages/${id}`);
    const cached = (await ref.get()).val() as Message | null;
    if (!cached) throw new HttpError(404, "The message is unavailable.");
    const eventId = randomUUID(), at = Date.now();
    await ref.transaction((raw: Message | null) => {
      const current = raw ?? cached;
      return { ...current, ...data, events: { ...(current.events ?? {}), [eventId]: { at, actor, action: `Set status to ${data.status}; updated notes` } } };
    });
    return json({ ok: true });
  });
}
