import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database } from "./firebase-admin";
import { HttpError } from "./http";
import { rateLimit } from "./rate-limit";
import {
  auditEventSchema, blogCommentInputSchema, blogCommentSchema, blogPostInputSchema, blogPostSchema,
  challengeAttemptSchema, challengeInputSchema, challengeSchema, challengeSolveSchema, challengeSubmissionSchema,
  eventInputSchema, eventSchema, joiningApplicationSchema, publicProfileInputSchema,
  publicProfileSchema, type Actor, type AuditEvent, type BlogComment, type BlogPost,
  type Challenge, type ChallengeSolve, type CommunityEvent, type Message, type PublicProfile,
} from "./schema";
import type { PublicUser } from "./public-auth";

type Resource = AuditEvent["resource"];
type Secret = { salt: string; hash: string };
const now = () => Date.now();
const values = <T>(value: Record<string, T> | null | undefined) => Object.values(value ?? {});
const sortUpdated = <T extends { updatedAt: number }>(items: T[]) => items.sort((a, b) => b.updatedAt - a.updatedAt);

function audit(actor: Actor, resource: Resource, resourceId: string, action: string, summary: string) {
  const event = auditEventSchema.parse({ id: randomUUID(), at: now(), actor, resource, resourceId, action, summary });
  return event;
}

async function updateWithAudit(updates: Record<string, unknown>, event: AuditEvent) {
  updates[`audit/${event.id}`] = event;
  await database().ref().update(updates);
}

async function assertUnique(path: string, child: string, value: string, exceptId?: string) {
  const found = await database().ref(path).orderByChild(child).equalTo(value).limitToFirst(2).get();
  if (found.exists() && Object.keys(found.val() as object).some((key) => key !== exceptId)) throw new HttpError(409, `The ${child} is already in use.`);
}

export async function upsertProfile(user: PublicUser, input: unknown) {
  const { handle } = publicProfileInputSchema.parse(input);
  const handleKey = handle.toLowerCase();
  const existing = user.profile;
  if (existing?.handleKey === handleKey) return existing;
  const claim = database().ref(`community/handles/${handleKey}`);
  const claimed = await claim.transaction((current) => current && current !== user.uid ? undefined : user.uid);
  if (!claimed.committed) throw new HttpError(409, "That public handle is already taken.");
  const at = now();
  const profile = publicProfileSchema.parse({ uid: user.uid, email: user.email, handle, handleKey, createdAt: existing?.createdAt ?? at, updatedAt: at });
  const updates: Record<string, unknown> = { [`community/profiles/${user.uid}`]: profile };
  if (existing && existing.handleKey !== handleKey) updates[`community/handles/${existing.handleKey}`] = null;
  try { await database().ref().update(updates); }
  catch (error) { await claim.remove(); throw error; }
  return profile;
}

export async function listBlog(admin = false) {
  const snapshot = await database().ref("content/blog").get();
  const posts = sortUpdated(values<BlogPost>(snapshot.val()).map((item) => blogPostSchema.parse(item)));
  return admin ? posts : posts.filter((post) => post.status === "published");
}

export async function getPublishedPost(slugValue: string) {
  const snapshot = await database().ref("content/blog").orderByChild("slug").equalTo(slugValue).limitToFirst(1).get();
  const post = values<BlogPost>(snapshot.val()).map((item) => blogPostSchema.parse(item))[0];
  if (!post || post.status !== "published") throw new HttpError(404, "That article is unavailable.");
  const commentsSnapshot = await database().ref(`activity/comments/${post.id}`).orderByChild("createdAt").get();
  const comments = values<BlogComment>(commentsSnapshot.val()).map((item) => blogCommentSchema.parse(item)).filter((item) => item.status === "approved").sort((a, b) => a.createdAt - b.createdAt);
  return { post, comments: comments.map(({ id, postId, handle, body, createdAt }) => ({ id, postId, handle, body, createdAt })) };
}

export async function saveBlog(actor: Actor, input: unknown, id?: string) {
  const data = blogPostInputSchema.parse(input), at = now(), postId = id ?? randomUUID();
  await assertUnique("content/blog", "slug", data.slug, id);
  const currentSnapshot = id ? await database().ref(`content/blog/${id}`).get() : null;
  if (id && !currentSnapshot?.exists()) throw new HttpError(404, "That article no longer exists.");
  const current = currentSnapshot?.exists() ? blogPostSchema.parse(currentSnapshot.val()) : null;
  const post = blogPostSchema.parse({ ...data, id: postId, createdAt: current?.createdAt ?? at, updatedAt: at, publishedAt: data.status === "published" ? current?.publishedAt ?? at : null, author: current?.author ?? { uid: actor.uid, email: actor.email } });
  const event = audit(actor, "blog", postId, current ? "updated" : "created", `${post.title} · ${post.status}`);
  await updateWithAudit({ [`content/blog/${postId}`]: post }, event);
  return post;
}

export async function deleteBlog(actor: Actor, id: string) {
  const snapshot = await database().ref(`content/blog/${id}`).get();
  if (!snapshot.exists()) throw new HttpError(404, "That article no longer exists.");
  const post = blogPostSchema.parse(snapshot.val());
  await updateWithAudit({ [`content/blog/${id}`]: null, [`activity/comments/${id}`]: null }, audit(actor, "blog", id, "deleted", post.title));
}

export async function addComment(user: PublicUser, postId: string, input: unknown) {
  if (!user.profile) throw new HttpError(409, "Choose a public handle before commenting.");
  const postSnapshot = await database().ref(`content/blog/${postId}`).get();
  if (!postSnapshot.exists() || blogPostSchema.parse(postSnapshot.val()).status !== "published") throw new HttpError(404, "That article is unavailable.");
  await rateLimit(`comment-${user.uid}`, 5, 10 * 60 * 1000);
  const data = blogCommentSchema.parse({ id: randomUUID(), postId, uid: user.uid, handle: user.profile.handle, body: blogCommentInputSchema.parse(input).body, status: "pending", createdAt: now(), moderatedAt: null, moderator: null });
  await database().ref(`activity/comments/${postId}/${data.id}`).set(data);
  return data;
}

export async function deleteOwnComment(user: PublicUser, postId: string, commentId: string) {
  const ref = database().ref(`activity/comments/${postId}/${commentId}`), snapshot = await ref.get();
  if (!snapshot.exists()) throw new HttpError(404, "That comment no longer exists.");
  const comment = blogCommentSchema.parse(snapshot.val());
  if (comment.uid !== user.uid) throw new HttpError(403, "You can only delete your own comments.");
  await ref.remove();
}

export async function listOwnComments(uid: string) {
  const snapshot = await database().ref("activity/comments").get();
  return Object.values((snapshot.val() ?? {}) as Record<string, Record<string, BlogComment>>)
    .flatMap((group) => values(group))
    .map((item) => blogCommentSchema.parse(item))
    .filter((item) => item.uid === uid)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, postId, handle, body, status, createdAt }) => ({ id, postId, handle, body, status, createdAt }));
}

export async function listComments() {
  const snapshot = await database().ref("activity/comments").get();
  return Object.values((snapshot.val() ?? {}) as Record<string, Record<string, BlogComment>>).flatMap((group) => values(group)).map((item) => blogCommentSchema.parse(item)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function moderateComment(actor: Actor, postId: string, commentId: string, status: "approved" | "hidden") {
  const ref = database().ref(`activity/comments/${postId}/${commentId}`), snapshot = await ref.get();
  if (!snapshot.exists()) throw new HttpError(404, "That comment no longer exists.");
  const current = blogCommentSchema.parse(snapshot.val());
  const comment = blogCommentSchema.parse({ ...current, status, moderatedAt: now(), moderator: { uid: actor.uid, email: actor.email } });
  await updateWithAudit({ [`activity/comments/${postId}/${commentId}`]: comment }, audit(actor, "comment", commentId, status, `${comment.handle} on ${postId}`));
  return comment;
}

export async function deleteComment(actor: Actor, postId: string, commentId: string) {
  await updateWithAudit({ [`activity/comments/${postId}/${commentId}`]: null }, audit(actor, "comment", commentId, "deleted", `Comment on ${postId}`));
}

export async function listEvents(admin = false) {
  const snapshot = await database().ref("content/events").get();
  const items = values<CommunityEvent>(snapshot.val()).map((item) => eventSchema.parse(item)).sort((a, b) => a.startsAt - b.startsAt);
  return admin ? items : items.filter((item) => item.status === "published");
}

export async function saveEvent(actor: Actor, input: unknown, id?: string) {
  const data = eventInputSchema.parse(input), at = now(), eventId = id ?? randomUUID();
  const snapshot = id ? await database().ref(`content/events/${id}`).get() : null;
  if (id && !snapshot?.exists()) throw new HttpError(404, "That event no longer exists.");
  const current = snapshot?.exists() ? eventSchema.parse(snapshot.val()) : null;
  if (data.endsAt && data.endsAt < data.startsAt) throw new HttpError(400, "The event must end after it starts.");
  const event = eventSchema.parse({ ...data, id: eventId, createdAt: current?.createdAt ?? at, updatedAt: at, author: current?.author ?? { uid: actor.uid, email: actor.email } });
  await updateWithAudit({ [`content/events/${eventId}`]: event }, audit(actor, "event", eventId, current ? "updated" : "created", `${event.title} · ${event.status}`));
  return event;
}

export async function deleteEvent(actor: Actor, id: string) {
  const snapshot = await database().ref(`content/events/${id}`).get();
  if (!snapshot.exists()) throw new HttpError(404, "That event no longer exists.");
  await updateWithAudit({ [`content/events/${id}`]: null }, audit(actor, "event", id, "deleted", eventSchema.parse(snapshot.val()).title));
}

function makeSecret(flag: string): Secret {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(flag, salt, 32).toString("hex") };
}

function verifyFlag(flag: string, secret: Secret) {
  const actual = scryptSync(flag, secret.salt, 32), expected = Buffer.from(secret.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function listChallenges(admin = false) {
  const snapshot = await database().ref("content/challenges").get();
  const items = values<Challenge>(snapshot.val()).map((item) => challengeSchema.parse(item)).sort((a, b) => b.opensAt - a.opensAt);
  return admin ? items : items.filter((item) => item.status !== "draft");
}

export async function saveChallenge(actor: Actor, input: unknown, id?: string) {
  const parsed = challengeInputSchema.parse(input), at = now(), challengeId = id ?? randomUUID();
  await assertUnique("content/challenges", "slug", parsed.slug, id);
  const snapshot = id ? await database().ref(`content/challenges/${id}`).get() : null;
  if (id && !snapshot?.exists()) throw new HttpError(404, "That challenge no longer exists.");
  const current = snapshot?.exists() ? challengeSchema.parse(snapshot.val()) : null;
  const existingSecret = id ? await database().ref(`private/challengeSecrets/${id}`).get() : null;
  if (!parsed.flag && !existingSecret?.exists()) throw new HttpError(400, "Set a flag before saving this challenge.");
  if (parsed.closesAt && parsed.closesAt < parsed.opensAt) throw new HttpError(400, "The challenge must close after it opens.");
  const { flag, ...data } = parsed;
  const challenge = challengeSchema.parse({ ...data, id: challengeId, createdAt: current?.createdAt ?? at, updatedAt: at, author: current?.author ?? { uid: actor.uid, email: actor.email } });
  const updates: Record<string, unknown> = { [`content/challenges/${challengeId}`]: challenge };
  if (flag) updates[`private/challengeSecrets/${challengeId}`] = makeSecret(flag);
  await updateWithAudit(updates, audit(actor, "challenge", challengeId, current ? "updated" : "created", `${challenge.title} · ${challenge.status}`));
  return challenge;
}

export async function deleteChallenge(actor: Actor, id: string) {
  const snapshot = await database().ref(`content/challenges/${id}`).get();
  if (!snapshot.exists()) throw new HttpError(404, "That challenge no longer exists.");
  const challenge = challengeSchema.parse(snapshot.val());
  await updateWithAudit({ [`content/challenges/${id}`]: null, [`private/challengeSecrets/${id}`]: null, [`activity/challengeAttempts/${id}`]: null, [`activity/challengeSolves/${id}`]: null }, audit(actor, "challenge", id, "deleted", challenge.title));
}

export async function listChallengeAttempts(challengeId: string) {
  const [attemptsSnapshot, profilesSnapshot] = await Promise.all([
    database().ref(`activity/challengeAttempts/${challengeId}`).get(),
    database().ref("community/profiles").get(),
  ]);
  const profiles = (profilesSnapshot.val() ?? {}) as Record<string, PublicProfile>;
  return Object.values((attemptsSnapshot.val() ?? {}) as Record<string, Record<string, unknown>>)
    .flatMap((group) => values(group))
    .map((item) => challengeAttemptSchema.parse(item))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 500)
    .map((item) => ({ ...item, handle: profiles[item.uid]?.handle ?? "Unknown member" }));
}

export async function challengePublicData() {
  const challenges = await listChallenges(false), time = now();
  const active = challenges.find((item) => item.status === "published" && item.opensAt <= time && (!item.closesAt || item.closesAt > time)) ?? null;
  const selected = active ?? challenges.find((item) => item.status === "published" && item.opensAt > time) ?? null;
  const leaderboardSnapshot = selected ? await database().ref(`activity/challengeSolves/${selected.id}`).get() : null;
  const leaderboard = values<ChallengeSolve>(leaderboardSnapshot?.val()).map((item) => challengeSolveSchema.parse(item)).sort((a, b) => a.solvedAt - b.solvedAt).map(({ handle, solvedAt }) => ({ handle, solvedAt }));
  return { active: selected, leaderboard, archive: challenges.filter((item) => item.status === "closed" || Boolean(item.closesAt && item.closesAt <= time)) };
}

export async function submitChallenge(user: PublicUser, challengeId: string, input: unknown) {
  if (!user.profile) throw new HttpError(409, "Choose a public handle before submitting a flag.");
  const { flag } = challengeSubmissionSchema.parse(input);
  const [challengeSnapshot, secretSnapshot, solvedSnapshot] = await Promise.all([
    database().ref(`content/challenges/${challengeId}`).get(), database().ref(`private/challengeSecrets/${challengeId}`).get(), database().ref(`activity/challengeSolves/${challengeId}/${user.uid}`).get(),
  ]);
  if (!challengeSnapshot.exists() || !secretSnapshot.exists()) throw new HttpError(404, "That challenge is unavailable.");
  const challenge = challengeSchema.parse(challengeSnapshot.val()), time = now();
  if (challenge.status !== "published" || challenge.opensAt > time || (challenge.closesAt && challenge.closesAt <= time)) throw new HttpError(409, "This challenge is not accepting submissions.");
  if (solvedSnapshot.exists()) return { correct: true, alreadySolved: true };
  await rateLimit(`challenge-${challengeId}-${user.uid}`, 8, 5 * 60 * 1000);
  const correct = verifyFlag(flag, secretSnapshot.val() as Secret), attemptId = randomUUID();
  const updates: Record<string, unknown> = { [`activity/challengeAttempts/${challengeId}/${user.uid}/${attemptId}`]: { id: attemptId, uid: user.uid, correct, createdAt: time } };
  if (correct) updates[`activity/challengeSolves/${challengeId}/${user.uid}`] = challengeSolveSchema.parse({ challengeId, uid: user.uid, handle: user.profile.handle, solvedAt: time });
  await database().ref().update(updates);
  return { correct, alreadySolved: false };
}

export async function createJoiningApplication(input: unknown, requestKey: string) {
  const data = joiningApplicationSchema.parse(input);
  if (data.website) return { ok: true };
  await rateLimit(`application-${requestKey}`, 3, 60 * 60 * 1000);
  const id = randomUUID(), createdAt = now();
  await database().ref(`messages/${id}`).set({ id, kind: "joining", name: data.name, email: data.email, message: data.message, createdAt, status: "new", notes: "", application: { handle: data.handle, discipline: data.discipline, portfolioUrl: data.portfolioUrl } });
  return { ok: true };
}

export async function listAudit(limit = 100) {
  const snapshot = await database().ref("audit").orderByChild("at").limitToLast(limit).get();
  return values<AuditEvent>(snapshot.val()).map((item) => auditEventSchema.parse(item)).sort((a, b) => b.at - a.at);
}

export async function listApplications() {
  const snapshot = await database().ref("messages").orderByChild("createdAt").limitToLast(200).get();
  return values<Message & { kind?: string; application?: unknown }>(snapshot.val()).filter((item) => item.kind === "joining").sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateApplication(actor: Actor, id: string, input: unknown) {
  const data = z.object({ status: z.enum(["new", "read", "archived"]), notes: z.string().max(5000) }).strict().parse(input);
  const ref = database().ref(`messages/${id}`), snapshot = await ref.get();
  if (!snapshot.exists() || snapshot.child("kind").val() !== "joining") throw new HttpError(404, "That application no longer exists.");
  const current = snapshot.val() as Message & { kind: string };
  const updated = { ...current, ...data };
  await updateWithAudit({ [`messages/${id}`]: updated }, audit(actor, "application", id, "updated", `${current.email} · ${data.status}`));
  return updated;
}

export async function homePlatformData() {
  const [blog, events, challenge] = await Promise.all([listBlog(false), listEvents(false), challengePublicData()]);
  return { blog: blog.slice(0, 3), events: events.filter((item) => item.startsAt >= now()).slice(0, 3), challenge: challenge.active };
}
