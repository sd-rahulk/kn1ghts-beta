import { z } from "zod";
import { requireActor, verifyMutation } from "@/lib/auth";
import { handler, HttpError, json, readJson } from "@/lib/http";
import {
  deleteBlog, deleteChallenge, deleteComment, deleteEvent, listApplications, listAudit,
  listBlog, listChallengeAttempts, listChallenges, listComments, listEvents, moderateComment, saveBlog,
  saveChallenge, saveEvent, updateApplication,
} from "@/lib/platform-store";

type Context = { params: Promise<{ path: string[] }> };
const allowedId = (value: string | undefined) => {
  if (!value || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(value)) throw new HttpError(400, "The resource identifier is invalid.");
  return value;
};

export async function GET(_request: Request, context: Context) {
  return handler(async () => {
    await requireActor();
    const [resource, first, action] = (await context.params).path;
    if (resource === "blog") return json({ items: await listBlog(true) });
    if (resource === "events") return json({ items: await listEvents(true) });
    if (resource === "challenges" && action === "attempts") return json({ items: await listChallengeAttempts(allowedId(first)) });
    if (resource === "challenges") return json({ items: await listChallenges(true) });
    if (resource === "comments") return json({ items: await listComments() });
    if (resource === "applications") return json({ items: await listApplications() });
    if (resource === "audit") return json({ items: await listAudit() });
    throw new HttpError(404, "That management resource does not exist.");
  });
}

export async function POST(request: Request, context: Context) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true), [resource] = (await context.params).path, body = await readJson(request, 150000);
    if (resource === "blog") return json({ item: await saveBlog(actor, body) }, 201);
    if (resource === "events") return json({ item: await saveEvent(actor, body) }, 201);
    if (resource === "challenges") return json({ item: await saveChallenge(actor, body) }, 201);
    throw new HttpError(404, "That management resource does not exist.");
  });
}

export async function PATCH(request: Request, context: Context) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true), [resource, first, second] = (await context.params).path, body = await readJson(request, 150000);
    if (resource === "blog") return json({ item: await saveBlog(actor, body, allowedId(first)) });
    if (resource === "events") return json({ item: await saveEvent(actor, body, allowedId(first)) });
    if (resource === "challenges") return json({ item: await saveChallenge(actor, body, allowedId(first)) });
    if (resource === "comments") {
      const status = z.object({ status: z.enum(["approved", "hidden"]) }).strict().parse(body).status;
      return json({ item: await moderateComment(actor, allowedId(first), allowedId(second), status) });
    }
    if (resource === "applications") return json({ item: await updateApplication(actor, allowedId(first), body) });
    throw new HttpError(404, "That management resource does not exist.");
  });
}

export async function DELETE(request: Request, context: Context) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true), [resource, first, second] = (await context.params).path;
    if (resource === "blog") await deleteBlog(actor, allowedId(first));
    else if (resource === "events") await deleteEvent(actor, allowedId(first));
    else if (resource === "challenges") await deleteChallenge(actor, allowedId(first));
    else if (resource === "comments") await deleteComment(actor, allowedId(first), allowedId(second));
    else throw new HttpError(404, "That management resource does not exist.");
    return json({ ok: true });
  });
}
