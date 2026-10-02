import { requireActor } from "@/lib/auth";
import { history } from "@/lib/content-store";
import { handler, HttpError, json } from "@/lib/http";

export async function GET(request: Request) {
  return handler(async () => {
    await requireActor();
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    if (before && !/^\d{13}-[a-f0-9-]{36}$/.test(before)) throw new HttpError(400, "The history cursor is invalid.");
    return json({ revisions: await history(30, before) });
  });
}
