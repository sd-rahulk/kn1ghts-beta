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
for (const path of ["cms", "cms/draft", "messages", "access"]) assert.equal((await fetch(`${db}/${path}.json?ns=demo-kn1ghts-default-rtdb`)).status, 401, path);
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
console.log("PASS: sessions, verification, roles, CSRF/origin, draft/publish/restore, concurrency, audit identity, database privacy, preview, public contact, inbox, throttling, last-owner protection, and logout.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
