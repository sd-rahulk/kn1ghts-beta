import { z } from "zod";
import { requireActor, verifyMutation } from "@/lib/auth";
import { commit, defaultContent } from "@/lib/content-store";
import { database } from "@/lib/firebase-admin";
import { handler, HttpError, json, readJson } from "@/lib/http";
import type { Revision } from "@/lib/schema";

async function revisionId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d{13}-[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, "The revision ID is invalid.");
  return id;
}
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireActor();
    const id = await revisionId(context);
    const revision = (await database().ref(`cms/revisions/${id}`).get()).val() as Revision | null;
    if (!revision) throw new HttpError(404, "That revision is unavailable.");
    return json({ revision });
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true);
    const id = await revisionId(context);
    const data = z.object({ expectedVersion: z.number().int().nonnegative(), note: z.string().trim().min(3).max(500) }).strict().parse(await readJson(request, 2000));
    return json(await commit({ ...data, actor, kind: "restore", restoreId: id, content: defaultContent() }));
  });
}
