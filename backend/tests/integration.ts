import assert from "node:assert/strict";
import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import baseline from "../content/default.json";

// Deliberately restricted to local emulators; never run against production.
const base = "http://localhost:3001", publicBase = "http://localhost:3000";
const db = "http://127.0.0.1:9000";
loadEnvConfig(process.cwd());
// The same local-only password the seed script used (backend/.env.local).
const password = process.env.EMULATOR_SEED_PASSWORD ?? "";
if (!password) throw new Error("Set EMULATOR_SEED_PASSWORD in backend/.env.local, as used by the seed script.");
const platformSecret = process.env.PLATFORM_API_SECRET ?? "";
if (!platformSecret) throw new Error("Set PLATFORM_API_SECRET in backend/.env.local before running integration tests.");
class Client {
  cookies = new Map<string, string>();
  csrf = "";
  async request(path: string, method = "GET", body?: unknown, extra: Record<string, string> = {}) {
    const response = await fetch(base + path, { method, headers: { Origin: base, Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(body === undefined ? {} : { "Content-Type": "application/json", "x-csrf-token": this.csrf }), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) { const [key, value] = cookie.split(";", 1)[0].split("="); this.cookies.set(key, value); }
    const data = await response.json();
    return { status: response.status, data, response };
  }
  async login(email: string, status = 200) {
    this.csrf = (await this.request("/api/auth/csrf")).data.token;
    const auth = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const token = await auth.json(); assert.ok(token.idToken, JSON.stringify(token));
    const result = await this.request("/api/auth/session", "POST", { idToken: token.idToken });
    assert.equal(result.status, status, JSON.stringify(result.data));
    if (status === 200) assert.match(result.response.headers.get("set-cookie")!, /HttpOnly.*SameSite=strict/i);
  }
}
async function expect(client: Client, path: string, status: number, method = "GET", body?: unknown, headers?: Record<string, string>) {
  const result = await client.request(path, method, body, headers); assert.equal(result.status, status, `${method} ${path}: ${JSON.stringify(result.data)}`); return result.data;
}
async function firebaseToken(email: string) {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const data = await response.json(); assert.ok(data.idToken, JSON.stringify(data)); return data.idToken as string;
}
async function platform(path: string, method = "GET", body?: unknown, token?: string, extra: Record<string, string> = {}) {
  const response = await fetch(`${base}/api/public/platform/${path}`, { method, headers: { "X-Platform-Key": platformSecret, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); return { status: response.status, data };
}
async function main() {
const owner = new Client(), viewer = new Client(), editor = new Client();
await expect(new Client(), "/api/admin/content", 401);
await new Client().login("unverified@kn1ghts.test", 403);
await new Client().login("outsider@kn1ghts.test", 403);
await owner.login("owner@kn1ghts.test"); await viewer.login("viewer@kn1ghts.test"); await editor.login("editor@kn1ghts.test");
await expect(editor, "/api/admin/access", 403);
const initial = await expect(owner, "/api/admin/content", 200);
const changed = structuredClone(baseline); changed.settings.title = `KN1GHTS integration ${randomUUID()}`;
[changed.sections[1], changed.sections[2]] = [changed.sections[2], changed.sections[1]];
changed.sections.find((section) => section.type === "journal")!.enabled = false;
const save = { content: changed, expectedVersion: initial.version, action: "save", note: "Integration draft change" };
await expect(owner, "/api/admin/content", 403, "POST", save, { "x-csrf-token": "" });
await expect(owner, "/api/admin/content", 403, "POST", save, { Origin: "https://example.com" });
await expect(viewer, "/api/admin/content", 403, "POST", save);
await expect(owner, "/api/admin/content", 400, "POST", { ...save, actor: { uid: "spoof" } });
const originalPublished = await (await fetch(`${db}/cms/published.json?ns=demo-kn1ghts-default-rtdb`)).json();
const saved = await expect(owner, "/api/admin/content", 200, "POST", save);
assert.deepEqual(await (await fetch(`${db}/cms/published.json?ns=demo-kn1ghts-default-rtdb`)).json(), originalPublished);
await expect(owner, "/api/admin/content", 409, "POST", save);
const preview = await expect(owner, "/api/admin/preview", 200, "POST", {});
const previewUrl = new URL(preview.url);
const previewResponse = await fetch(base + "/api/public/preview?token=" + previewUrl.searchParams.get("preview"));
assert.equal(previewResponse.status, 200); assert.ok(JSON.stringify(await previewResponse.json()).includes(changed.settings.title));
assert.equal((await fetch(base + "/api/public/preview?token=tampered")).status, 403);
const published = await expect(owner, "/api/admin/content", 200, "POST", { ...save, expectedVersion: saved.version, action: "publish", note: "Integration publish" });
assert.equal((await (await fetch(`${db}/cms/published.json?ns=demo-kn1ghts-default-rtdb`)).json()).settings.title, changed.settings.title);
const publicHtml = await (await fetch(publicBase)).text(); assert.ok(publicHtml.includes(changed.settings.title));
assert.ok(publicHtml.indexOf('id="approach"') < publicHtml.indexOf('id="updates"'), "Published section order must reach the public renderer");
assert.ok(!publicHtml.includes('id="journal"'), "Hidden sections must be omitted");
const restored = await expect(owner, `/api/admin/history/${saved.revisionId}`, 200, "POST", { expectedVersion: published.version, note: "Integration restore draft" });
const history = await expect(owner, "/api/admin/history", 200);
assert.equal(history.revisions[0].kind, "restore"); assert.equal(history.revisions[0].actor.email, "owner@kn1ghts.test");
const revision = await expect(owner, `/api/admin/history/${saved.revisionId}`, 200); assert.ok(revision.revision.changes.length);
for (const path of ["cms", "cms/draft", "messages", "access", "private", "activity", "audit", "community/profiles", "content/blog"]) assert.equal((await fetch(`${db}/${path}.json?ns=demo-kn1ghts-default-rtdb`)).status, 401, path);
const contact = { name: "Integration visitor", email: `qa-${randomUUID()}@example.com`, message: "This is a local integration test message.", website: "" };
async function submit(body: unknown, origin = publicBase) { return fetch(publicBase + "/api/contact", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
assert.equal((await submit(contact, "https://example.com")).status, 403);
assert.equal((await submit({ ...contact, email: "invalid" })).status, 400);
assert.equal((await submit({ ...contact, website: "bot" })).status, 200);
const submission = await submit(contact); assert.equal(submission.status, 200, await submission.text());
const inbox = await expect(owner, "/api/admin/messages", 200);
const message = inbox.messages.find((entry: { email: string }) => entry.email === contact.email); assert.ok(message);
await expect(viewer, `/api/admin/messages/${message.id}`, 403, "PATCH", { status: "read", notes: "Denied" });
await expect(owner, `/api/admin/messages/${message.id}`, 200, "PATCH", { status: "read", notes: "Integration reviewed" });
const updated = (await expect(owner, "/api/admin/messages", 200)).messages.find((entry: { id: string }) => entry.id === message.id);
assert.equal(updated.status, "read"); assert.equal(Object.values(updated.events as Record<string, { actor: { email: string } }>)[0].actor.email, "owner@kn1ghts.test");
assert.equal((await submit(contact)).status, 200); assert.equal((await submit(contact)).status, 200); assert.equal((await submit(contact)).status, 429);
const participantToken = await firebaseToken("outsider@kn1ghts.test");
const profile = await platform("profile", "POST", { handle: `qa_${randomUUID().slice(0, 8)}` }, participantToken); assert.equal(profile.status, 200, JSON.stringify(profile.data));
const postInput = { slug: `integration-${randomUUID()}`, title: "Integration field note", excerpt: "A verified integration field note.", content: "This article exists to verify publishing and moderated comments end to end.", coverImageUrl: "", tags: ["QA"], status: "published" };
await expect(viewer, "/api/admin/platform/blog", 403, "POST", postInput);
const post = (await expect(editor, "/api/admin/platform/blog", 201, "POST", postInput)).item;
const publicPost = await platform(`blog/${post.slug}`); assert.equal(publicPost.status, 200); assert.equal(publicPost.data.comments.length, 0);
const submittedComment = await platform(`blog/${post.id}/comments`, "POST", { body: "A useful integration comment for moderation." }, participantToken); assert.equal(submittedComment.status, 201, JSON.stringify(submittedComment.data));
const comments = await expect(editor, "/api/admin/platform/comments", 200); const comment = comments.items.find((entry: { id: string }) => entry.id === submittedComment.data.comment.id); assert.equal(comment.status, "pending");
await expect(editor, `/api/admin/platform/comments/${post.id}/${comment.id}`, 200, "PATCH", { status: "approved" });
assert.equal((await platform(`blog/${post.slug}`)).data.comments[0].body, comment.body);
const ownComments = await platform("profile/comments", "GET", undefined, participantToken); assert.equal(ownComments.status, 200); assert.ok(ownComments.data.items.some((entry: { id: string; status: string }) => entry.id === comment.id && entry.status === "approved"));
assert.equal((await platform(`blog/${post.id}/comments/${comment.id}`, "DELETE", {}, participantToken)).status, 200); assert.equal((await platform(`blog/${post.slug}`)).data.comments.length, 0);
const challengeInput = { slug: `integration-${randomUUID()}`, title: "Integration weekly", description: "A local weekly challenge used to verify private flag checks.", category: "Web", difficulty: "beginner", resourceUrl: "", opensAt: Date.now() - 1000, closesAt: null, status: "published", flag: "KN1GHTS{integration-pass}" };
const challenge = (await expect(editor, "/api/admin/platform/challenges", 201, "POST", challengeInput)).item;
assert.equal((await platform(`challenge/${challenge.id}/submit`, "POST", { flag: "wrong" }, participantToken)).data.correct, false);
assert.equal((await platform(`challenge/${challenge.id}/submit`, "POST", { flag: challengeInput.flag }, participantToken)).data.correct, true);
const attempts = await expect(editor, `/api/admin/platform/challenges/${challenge.id}/attempts`, 200); assert.equal(attempts.items.length, 2); assert.equal(attempts.items.filter((entry: { correct: boolean }) => entry.correct).length, 1); assert.ok(attempts.items.every((entry: { handle: string }) => entry.handle === profile.data.profile.handle));
const weekly = await platform("challenge"); assert.equal(weekly.status, 200); assert.ok(weekly.data.leaderboard.some((entry: { handle: string }) => entry.handle === profile.data.profile.handle)); assert.ok(!JSON.stringify(weekly.data).includes("local-outsider")); assert.ok(!JSON.stringify(weekly.data).includes(challengeInput.flag));
const eventInput = { title: "Integration event", description: "A public event created by the integration suite.", location: "Online", startsAt: Date.now() + 86400000, endsAt: null, registrationUrl: "", status: "published" };
const event = (await expect(editor, "/api/admin/platform/events", 201, "POST", eventInput)).item; assert.ok((await platform("events")).data.items.some((entry: { id: string }) => entry.id === event.id));
const application = await platform("applications", "POST", { name: "Integration Applicant", email: `app-${randomUUID()}@example.com`, handle: "qa_applicant", discipline: "Web", portfolioUrl: "https://github.com/example", message: "I want to learn and contribute through weekly security practice.", website: "" }, undefined, { "X-Request-Key": "a".repeat(64) }); assert.equal(application.status, 201, JSON.stringify(application.data));
assert.ok((await expect(owner, "/api/admin/platform/applications", 200)).items.some((entry: { name: string }) => entry.name === "Integration Applicant"));
const audit = await expect(owner, "/api/admin/platform/audit", 200); assert.ok(audit.items.some((entry: { resource: string; actor: { email: string } }) => entry.resource === "challenge" && entry.actor.email === "editor@kn1ghts.test"));
await expect(editor, `/api/admin/platform/blog/${post.id}`, 200, "DELETE", {}); await expect(editor, `/api/admin/platform/challenges/${challenge.id}`, 200, "DELETE", {}); await expect(editor, `/api/admin/platform/events/${event.id}`, 200, "DELETE", {});
const access = await expect(owner, "/api/admin/access", 200);
const ownerMember = access.members.find((m: { role: string }) => m.role === "owner");
await expect(owner, "/api/admin/access", 409, "PATCH", { uid: ownerMember.uid, role: "viewer", active: true });
const viewerMember = access.members.find((m: { email: string }) => m.email === "viewer@kn1ghts.test");
await expect(owner, "/api/admin/access", 200, "PATCH", { uid: viewerMember.uid, role: "viewer", active: false });
await expect(viewer, "/api/admin/content", 401);
await expect(owner, "/api/admin/access", 200, "PATCH", { uid: viewerMember.uid, role: "viewer", active: true });
await expect(owner, "/api/admin/content", 200, "POST", { content: baseline, expectedVersion: restored.version, action: "publish", note: "Restore original site after integration tests" });
const secondSession = new Client(); await secondSession.login("owner@kn1ghts.test");
// Firebase revocation timestamps have second precision.
await new Promise((resolve) => setTimeout(resolve, 1100));
await expect(owner, "/api/auth/logout?all=true", 200, "POST", {});
await expect(owner, "/api/admin/content", 401);
await expect(secondSession, "/api/admin/content", 401);
console.log("PASS: sessions, verification, roles, CSRF/origin, drafts, publishing, audit, privacy, contact, public profiles, moderated comments, weekly challenge solves, events, applications, access revocation, and logout.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
