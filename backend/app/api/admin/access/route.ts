import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireActor, verifyMutation } from "@/lib/auth";
import { adminAuth, database } from "@/lib/firebase-admin";
import { handler, HttpError, json, readJson } from "@/lib/http";
import { memberRoleSchema, type Member, type Actor } from "@/lib/schema";
import { rateLimit } from "@/lib/rate-limit";

type Access = { members: Record<string, Member>; events: Record<string, { at: number; actor: Actor; action: string }> };
async function updateMember(actor: Actor, member: Member) {
  const ref = database().ref("access");
  const cached = (await ref.get()).val() as Access | null;
  if (!cached) throw new HttpError(403, "Bootstrap the first owner before managing access.");
  const id = randomUUID(), at = Date.now();
  let problem = "";
  const result = await ref.transaction((raw: Access | null) => {
    const current = raw ?? cached;
    if (!current.members?.[actor.uid]?.active || current.members[actor.uid].role !== "owner") { problem = "Owner access is required."; return undefined; }
    const members = { ...current.members, [member.uid]: member };
    if (!Object.values(members).some((entry) => entry.active && entry.role === "owner")) { problem = "Keep at least one active owner."; return undefined; }
    return { members, events: { ...(current.events ?? {}), [id]: { at, actor, action: `${member.email}: ${member.role}, ${member.active ? "active" : "disabled"}` } } };
  });
  if (!result.committed) throw new HttpError(409, problem || "Access changed. Reload and try again.");
}
export async function GET() {
  return handler(async () => {
    await requireActor(false, true);
    const state = (await database().ref("access").get()).val() as Access | null;
    return json({ members: Object.values(state?.members ?? {}), events: Object.values(state?.events ?? {}).sort((a, b) => b.at - a.at).slice(0, 30) });
  });
}
export async function POST(request: Request) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true, true);
    await rateLimit(`invite-${actor.uid}`, 10, 60000);
    const data = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), role: memberRoleSchema }).strict().parse(await readJson(request, 2000));
    let user;
    try { user = await adminAuth().getUserByEmail(data.email); }
    catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      user = await adminAuth().createUser({ email: data.email });
    }
    const existing = (await database().ref(`access/members/${user.uid}`).get()).val() as Member | null;
    if (existing) throw new HttpError(409, "This account already has an access record. Edit its role below.");
    const member: Member = { uid: user.uid, email: data.email, role: data.role, active: true, createdAt: Date.now() };
    await updateMember(actor, member);
    return json({ member }, 201);
  });
}
export async function PATCH(request: Request) {
  return handler(async () => {
    await verifyMutation(request);
    const actor = await requireActor(true, true);
    const data = z.object({ uid: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/), role: memberRoleSchema, active: z.boolean() }).strict().parse(await readJson(request, 2000));
    const existing = (await database().ref(`access/members/${data.uid}`).get()).val() as Member | null;
    if (!existing) throw new HttpError(404, "That account is unavailable.");
    await updateMember(actor, { ...existing, role: data.role, active: data.active });
    if (!data.active) await adminAuth().revokeRefreshTokens(data.uid);
    return json({ ok: true });
  });
}
