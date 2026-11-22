import test from "node:test";
import assert from "node:assert/strict";
import { makeWeeklyChallenge } from "./prepare-weekly-ctf.mjs";

test("first weekly starter is draft-only and self-contained", () => {
  const challenge = makeWeeklyChallenge({ token: "0123456789abcdef0123456789abcdef", now: 1732000000000 });
  assert.equal(challenge.status, "draft");
  assert.equal(challenge.slug, "tiny-signal-01");
  assert.equal(challenge.opensAt, 1732000000000 + 86400000);
  assert.equal(challenge.difficulty, "beginner");
  assert.equal(challenge.resourceUrl, "");
  assert.ok(challenge.description.includes("Base64"));
  assert.equal(challenge.flag, "KN1GHTS{0123456789abcdef0123456789abcdef}");
  assert.ok(!challenge.description.includes(challenge.flag), "description must not expose plain flag");
  const transmission = challenge.description.split("\n\n")[2];
  assert.equal(Buffer.from(transmission, "base64").toString("utf8"), challenge.flag);
});

test("starter uses a fresh private secret and rejects malformed deterministic input", () => {
  const a = makeWeeklyChallenge();
  const b = makeWeeklyChallenge();
  assert.notEqual(a.flag, b.flag);
  assert.throws(() => makeWeeklyChallenge({ token: "not-a-secret" }));
});
