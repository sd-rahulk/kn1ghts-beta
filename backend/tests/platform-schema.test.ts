import test from "node:test";
import assert from "node:assert/strict";
import { blogCommentInputSchema, blogPostInputSchema, challengeInputSchema, challengeSchema, eventInputSchema, joiningApplicationSchema, publicProfileInputSchema } from "../lib/schema";

test("public handles and joining applications accept only bounded public data", () => {
  assert.equal(publicProfileInputSchema.parse({ handle: "0x_kn1ght" }).handle, "0x_kn1ght");
  assert.throws(() => publicProfileInputSchema.parse({ handle: "x" }));
  assert.throws(() => joiningApplicationSchema.parse({ name: "A", email: "bad", handle: "x", discipline: "", portfolioUrl: "javascript:alert(1)", message: "short", website: "" }));
});

test("published resource inputs reject unsafe links and unknown fields", () => {
  assert.throws(() => blogPostInputSchema.parse({ slug: "post", title: "Post title", excerpt: "A useful excerpt", content: "A sufficiently detailed article body.", coverImageUrl: "javascript:alert(1)", tags: [], status: "draft" }));
  assert.throws(() => eventInputSchema.parse({ title: "Public event", description: "A sufficiently detailed description", location: "Online", startsAt: 1, endsAt: null, registrationUrl: "", status: "published", extra: true }));
});

test("challenge secrets are accepted only as admin input and never as public challenge data", () => {
  const input = challengeInputSchema.parse({ slug: "weekly-one", title: "Weekly One", description: "A sufficiently detailed challenge description.", category: "Web", difficulty: "beginner", resourceUrl: "", opensAt: 1, closesAt: null, status: "published", flag: "KN1GHTS{secret}" });
  assert.equal(input.flag, "KN1GHTS{secret}");
  assert.throws(() => challengeSchema.parse({ ...input, id: "challenge-1", createdAt: 1, updatedAt: 1, author: { uid: "u", email: "admin@example.com" } }));
  assert.throws(() => blogCommentInputSchema.parse({ body: "x" }));
});
