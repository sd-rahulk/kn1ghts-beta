import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = "3176";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", BETA_ACCESS_PASSWORD: "local-test-only-32-character-long-secret" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLogs = "";
server.stdout.on("data", (d) => { serverLogs += String(d).slice(-2000); });
server.stderr.on("data", (d) => { serverLogs += String(d).slice(-2000); });

async function get(path) {
  const result = await fetch(origin + path, { signal: AbortSignal.timeout(7000) });
  assert.equal(result.status, 200, `${path}: unexpected status ${result.status}`);
  return result.text();
}

async function waitForServer() {
  for (let i = 0; i < 45; i++) {
    if (server.exitCode !== null) throw new Error(`Next exited: ${serverLogs}`);
    try {
      const response = await fetch(origin + "/robots.txt", { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch { /* Server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready: ${serverLogs}`);
}

try {
  await waitForServer();
  const robots = await get("/robots.txt");
  assert.match(robots, /User-agent:\s*OAI-SearchBot/i);
  assert.match(robots, /Sitemap:\s*https:\/\/kn1ghts\.org\/sitemap\.xml/i);
  const sitemap = await get("/sitemap.xml");
  assert.match(sitemap, /https:\/\/kn1ghts\.org\//);
  assert.match(sitemap, /https:\/\/kn1ghts\.org\/blog/);
  assert.match(sitemap, /https:\/\/kn1ghts\.org\/blog\/web-ctf-field-guide/);
  assert.ok(!sitemap.includes("/beta"), "private preview appeared in sitemap");
  const guide = await get("/blog/web-ctf-field-guide");
  assert.match(guide, /Web CTF Security: Authorization, Sessions, and Safe Testing/);
  assert.ok(guide.includes("https://kn1ghts.org/blog/web-ctf-field-guide"), "guide canonical URL missing");
  const llms = await get("/llms.txt");
  assert.match(llms, /KN1GHTS/);
  const home = await get("/");
  assert.match(home, /Cybersecurity &amp; CTF Team in India/);
  assert.ok(home.includes("/kn1ghts-original-knight.webp"), "original knight asset missing");
  assert.match(home, /aria-label="KN1GHTS homepage under construction"/);
  const mainStart = home.indexOf("<main");
  const mainBodyStart = home.indexOf(">", mainStart) + 1;
  const mainEnd = home.indexOf("</main>", mainBodyStart);
  assert.ok(mainStart >= 0 && mainBodyStart > mainStart && mainEnd > mainBodyStart, "homepage main missing");
  const splash = home.slice(mainBodyStart, mainEnd);
  assert.match(splash, /<img /, "homepage image missing");
  assert.ok(!/<(?:h1|h2|nav|button|a)(?:\s|>)/i.test(splash), "homepage must be image-only");
  assert.ok(!home.includes('class="experience is-'), "public homepage exposed beta experience");
  const originalKnight = await fetch(origin + "/kn1ghts-original-knight.webp");
  assert.equal(originalKnight.status, 200, "original knight image is not reachable");
  assert.match(originalKnight.headers.get("content-type") ?? "", /image\/webp/);

  const publicTeam = await get("/team");
  assert.match(publicTeam, /TEAM/);
  const publicBlog = await get("/blog");
  assert.match(publicBlog, /FIELD NOTES/);

  const betaGate = await get("/beta");
  assert.match(betaGate, /Preview password/);
  assert.ok(!betaGate.includes('class="experience is-'), "locked beta exposed original homepage");
  const previewBypass = await get("/beta?preview=invalid-token");
  assert.ok(!previewBypass.includes('class="experience is-'), "beta preview parameter bypassed gate");

  const foreignPost = await fetch(origin + "/beta/access", {
    method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }), redirect: "manual",
  });
  assert.equal(foreignPost.status, 403, "cross-origin beta login was accepted");

  const wrongPost = await fetch(origin + "/beta/access", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "not-the-password" }), redirect: "manual",
  });
  assert.equal(wrongPost.status, 303);
  assert.equal(wrongPost.headers.get("set-cookie"), null);

  const rightPost = await fetch(origin + "/beta/access", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }), redirect: "manual",
  });
  assert.equal(rightPost.status, 303);
  const cookie = rightPost.headers.get("set-cookie");
  assert.ok(
    cookie && /httponly/i.test(cookie) && /samesite=strict/i.test(cookie) &&
    /path=\/beta/i.test(cookie) && /;\s*secure/i.test(cookie),
    "beta cookie must be secure, HttpOnly, same-site and path-scoped",
  );
  const beta = await fetch(origin + "/beta", { headers: { Cookie: cookie.split(";")[0] } });
  assert.equal(beta.status, 200);
  assert.ok((await beta.text()).includes('class="experience is-'), "valid beta access did not restore cinematic page");
  assert.match(beta.headers.get("x-robots-tag") ?? "", /noindex/);

  const join = await get("/contact");
  assert.match(join, /SEND APPLICATION/);
  const weekly = await get("/inhouse-weekly");
  assert.match(weekly, /CHALLENGE/);
  assert.match(home, /rel="canonical" href="https:\/\/kn1ghts\.org\/?"/);
  assert.match(home, /"@type":"Organization"/);
  const signin = await get("/sign-in");
  assert.match(signin, /name="robots" content="noindex/);
  console.log("Public and private smoke checks passed: construction page, Team, Blog, private beta authentication, community routes, SEO.");
} catch (error) {
  console.error(error);
  console.error(serverLogs.slice(-2500));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
