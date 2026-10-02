import { z } from "zod";
import { requireActor, verifyMutation } from "@/lib/auth";
import { commit, getDraft } from "@/lib/content-store";
import { handler, json, readJson } from "@/lib/http";
import { siteSchema } from "@/lib/schema";

export async function GET() {
  return handler(async () => {
    const actor = await requireActor();
    const { draft, version, publishedAt } = await getDraft();
    return json({ draft, version, publishedAt, actor });
  });
}
export async function POST(request: Request) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true);
    const data = z.object({ content: siteSchema, expectedVersion: z.number().int().nonnegative(), action: z.enum(["save", "publish"]), note: z.string().trim().min(3).max(500) }).strict().parse(await readJson(request));
    return json(await commit({ content: data.content, expectedVersion: data.expectedVersion, kind: data.action, actor, note: data.note }));
  });
}
