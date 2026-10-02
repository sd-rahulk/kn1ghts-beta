import { requireActor } from "@/lib/auth";
import { database } from "@/lib/firebase-admin";
import { handler, HttpError, json } from "@/lib/http";
import type { Message } from "@/lib/schema";

export async function GET(request: Request) {
  return handler(async () => {
    await requireActor();
    const before = new URL(request.url).searchParams.get("before");
    let query = database().ref("messages").orderByChild("createdAt");
    if (before) {
      const cursor = Number(before);
      if (!Number.isSafeInteger(cursor) || cursor < 0) throw new HttpError(400, "The message cursor is invalid.");
      query = query.endBefore(cursor);
    }
    let messages: Record<string, Message> | null;
    try { messages = (await query.limitToLast(100).get()).val() as Record<string, Message> | null; }
    catch (error) {
      if (error instanceof Error && error.message.includes("Index not defined")) {
        throw new HttpError(503, "The inbox database index is missing. Deploy backend/database.rules.json or run node scripts/check-firebase.mjs --repair-index from the backend folder.");
      }
      throw error;
    }
    return json({ messages: Object.values(messages ?? {}).sort((a, b) => b.createdAt - a.createdAt) });
  });
}
