import { handler, HttpError, json, readJson } from "@/lib/http";
import { requirePlatformGateway, requirePublicUser } from "@/lib/public-auth";
import {
  addComment, challengePublicData, createJoiningApplication, deleteOwnComment, getPublishedPost,
  homePlatformData, listBlog, listEvents, listOwnComments, submitChallenge, upsertProfile,
} from "@/lib/platform-store";

type Context = { params: Promise<{ path: string[] }> };
const segment = (value: string | undefined, label: string) => {
  if (!value || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(value)) throw new HttpError(400, `The ${label} is invalid.`);
  return value;
};

export async function GET(request: Request, context: Context) {
  return handler(async () => {
    requirePlatformGateway(request);
    const [resource, value] = (await context.params).path;
    if (resource === "home") return json(await homePlatformData());
    if (resource === "blog" && value) return json(await getPublishedPost(segment(value, "article slug")));
    if (resource === "blog") return json({ items: await listBlog(false) });
    if (resource === "events") return json({ items: await listEvents(false), now: Date.now() });
    if (resource === "challenge") return json(await challengePublicData());
    if (resource === "profile" && value === "comments") {
      const user = await requirePublicUser(request);
      return json({ items: await listOwnComments(user.uid) });
    }
    if (resource === "profile") {
      const user = await requirePublicUser(request, false);
      return json({ profile: user.profile, email: user.email, emailVerified: user.emailVerified });
    }
    throw new HttpError(404, "That public resource does not exist.");
  });
}

export async function POST(request: Request, context: Context) {
  return handler(async () => {
    const [resource, first, action] = (await context.params).path;
    const body = await readJson(request, 120000);
    if (resource === "profile") return json({ profile: await upsertProfile(await requirePublicUser(request, false), body) });
    if (resource === "blog" && action === "comments") return json({ comment: await addComment(await requirePublicUser(request), segment(first, "article"), body) }, 201);
    if (resource === "challenge" && action === "submit") return json(await submitChallenge(await requirePublicUser(request), segment(first, "challenge"), body));
    if (resource === "applications") {
      requirePlatformGateway(request);
      const key = request.headers.get("x-request-key") ?? "";
      if (!/^[a-f0-9]{64}$/.test(key)) throw new HttpError(403, "The application gateway is invalid.");
      return json(await createJoiningApplication(body, key), 201);
    }
    throw new HttpError(404, "That public resource does not exist.");
  });
}

export async function DELETE(request: Request, context: Context) {
  return handler(async () => {
    const [resource, postId, action, commentId] = (await context.params).path;
    if (resource !== "blog" || action !== "comments") throw new HttpError(404, "That public resource does not exist.");
    await deleteOwnComment(await requirePublicUser(request), segment(postId, "article"), segment(commentId, "comment"));
    return json({ ok: true });
  });
}
