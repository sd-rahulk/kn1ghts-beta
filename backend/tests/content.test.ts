import test from "node:test";
import assert from "node:assert/strict";
import initial from "../content/default.json";
import { availableLink, diffContent, isSafeLink, siteSchema } from "../lib/schema";
import { changeState, ConflictError, type CmsState } from "../lib/revisions";

const actor = { uid: "test-owner", email: "owner@example.com", role: "owner" as const };
const state = (): CmsState => ({ version: 0, draft: siteSchema.parse(initial), published: siteSchema.parse(initial), publishedAt: 1, revisions: {} });
test("the complete initial site validates and every navigation anchor exists", () => { const site = siteSchema.parse(initial); assert.equal(site.sections.length, 15); assert.ok(site.settings.navigation.every((link) => availableLink(site, link.href))); });
test("malicious links, duplicate IDs, unknown properties, and an entirely hidden site are rejected", () => {
  for (const mutate of [
    (site: typeof initial) => { site.sections[0].fields.ctaHref = "javascript:alert(1)"; },
    (site: typeof initial) => { site.sections[1].id = site.sections[0].id; },
    (site: typeof initial) => { site.sections.forEach((section) => { section.enabled = false; }); },
  ]) { const copy = structuredClone(initial); mutate(copy); assert.equal(siteSchema.safeParse(copy).success, false); }
  assert.equal(siteSchema.safeParse({ ...initial, privateKey: "should-not-be-content" }).success, false);
  for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.example", "https://user:pass@example.com", "/../private"]) assert.equal(isSafeLink(value), false);
});
test("Realtime Database nulls for empty arrays and maps round-trip safely", () => { const copy = structuredClone(initial) as unknown as Record<string, unknown>; const sections = copy.sections as Record<string, unknown>[]; sections[0].items = null; sections[3].fields = null; assert.deepEqual(siteSchema.parse(copy).sections[0].items, []); assert.deepEqual(siteSchema.parse(copy).sections[3].fields, {}); });
test("saving a draft preserves the published version and records verified authorship", () => { const previous = state(); const content = structuredClone(previous.draft); content.sections[0].title = "Edited hero"; const next = changeState(previous, { content, actor, expectedVersion: 0, kind: "save", id: "r1", at: 100, note: "Update hero" }); assert.equal(next.draft.sections[0].title, "Edited hero"); assert.equal(next.published?.sections[0].title, initial.sections[0].title); assert.deepEqual(next.revisions.r1.actor, actor); assert.ok(next.revisions.r1.changes.some((change) => change.path.includes("title"))); });
test("stale saves cannot overwrite a newer revision", () => { const previous = state(); previous.version = 5; assert.throws(() => changeState(previous, { content: previous.draft, actor, expectedVersion: 4, kind: "publish", id: "r1", at: 100, note: "Stale save" }), ConflictError); assert.equal(previous.version, 5); });
test("publish and restore preserve history and create new version numbers", () => { const previous = state(); const content = structuredClone(previous.draft); content.settings.description = "Changed search description"; const published = changeState(previous, { content, actor, expectedVersion: 0, kind: "publish", id: "r1", at: 100, note: "Publish description" }); const restored = changeState(published, { content: previous.draft, actor, expectedVersion: 1, kind: "restore", id: "r2", at: 200, note: "Restore initial copy" }); assert.equal(restored.version, 2); assert.equal(restored.published?.settings.description, content.settings.description); assert.equal(restored.draft.settings.description, initial.settings.description); assert.equal(Object.keys(restored.revisions).length, 2); });
test("reordering produces an understandable order diff", () => { const site = siteSchema.parse(initial); const next = structuredClone(site); [next.sections[1], next.sections[2]] = [next.sections[2], next.sections[1]]; assert.ok(diffContent(site, next).some((change) => change.path === "sections.order")); });
