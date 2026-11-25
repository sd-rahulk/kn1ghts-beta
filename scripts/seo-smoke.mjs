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
  const favicon = await fetch(origin + "/icon.png");
  assert.equal(favicon.status, 200, "transparent PNG favicon not served");
  assert.match(favicon.headers.get("content-type") ?? "", /image\/png/, "incorrect favicon content type");
  const faviconBytes = new Uint8Array(await favicon.arrayBuffer());
  assert.equal(faviconBytes[0], 0x89);
  assert.equal(faviconBytes[1], 0x50);
  assert.equal(faviconBytes[2], 0x4e);
  assert.equal(faviconBytes[3], 0x47);

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
  // The poster homepage carries no imagery: the knight asset is no longer
  // linked from it (it still exists in public/ and is checked reachable below).
  assert.ok(!home.includes("kn1ghts-original-knight"), "homepage still references the removed knight imagery");
  assert.match(home, /aria-label="KN1GHTS — back to top"/);
  assert.ok(home.includes("Skip to content"), "homepage skip link missing");
  const mainStart = home.indexOf("<main");
  const mainBodyStart = home.indexOf(">", mainStart) + 1;
  const mainEnd = home.indexOf("</main>", mainBodyStart);
  assert.ok(mainStart >= 0 && mainBodyStart > mainStart && mainEnd > mainBodyStart, "homepage main missing");
  const splash = home.slice(mainBodyStart, mainEnd);
  // The poster homepage is one announcement block: no <img> in <main>, no
  // scoreboard, no results table, no roster. Its proof is the ticker of
  // first places and the link to the full record at /pow.
  assert.ok(!splash.includes("results-table"), "poster homepage still renders the results table");
  assert.ok(!splash.includes("hero-score"), "poster homepage still renders the scoreboard");
  assert.ok(!splash.includes("roster"), "poster homepage still renders the roster");
  assert.match(splash, /poster-ticker/, "homepage announcement ticker missing");
  assert.match(splash, /cruXipher/, "ticker must name a first-place finish");
  // The headline is split into per-word spans for the kinetic type
  // treatment, so the raw HTML has no contiguous "<h1>Four first places
  // in 2026.</h1>" — strip tags, then match the announcement text.
  assert.match(home, /<h1[^>]*>/, "homepage must have a semantic fact headline");
  const homeText = home.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.ok(homeText.includes("Four first places in 2026."), "homepage must carry the announcement headline");
  // The header nav and footer sit outside <main>, so link checks run on `home`.
  assert.ok(home.includes('href="/team"'), "homepage must link to its team");
  assert.ok(home.includes('href="/blog"'), "homepage must link to its blog");
  assert.ok(home.includes('href="/pow"'), "announcement must link to the record");
  // The poster has no sections, so the old in-page anchors must be gone —
  // every nav link is a real page now (#home and #main are the only
  // in-page targets that may remain).
  for (const dead of ['href="#results"', 'href="#team"', 'href="#writeups"', 'href="#about"', 'href="#contact"']) {
    assert.ok(!home.includes(dead), `poster homepage still links to dead anchor ${dead}`);
  }
  assert.match(splash, /cybersecurity team that designs and competes in Capture the Flag/i, "nonvisual users need an accessible site summary");
  assert.ok(!home.includes('class="experience is-'), "public homepage exposed beta experience");
  // Unlinked from the homepage but still shipped in public/: it must stay reachable.
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


  // Simulate Vercel/Cloudflare rewriting the internal request URL or Host.
  // A real browser posting from kn1ghts.org must still pass the CSRF check.
  const canonicalPost = await fetch(origin + "/beta/access", {
    method: "POST",
    headers: {
      Origin: "https://kn1ghts.org",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }),
    redirect: "manual",
  });
  assert.equal(canonicalPost.status, 303, "canonical browser origin rejected behind proxy");
  assert.equal(canonicalPost.headers.get("location"), "https://kn1ghts.org/beta", "successful login redirected to internal hostname");
  assert.ok(/httponly/i.test(canonicalPost.headers.get("set-cookie") ?? ""), "canonical login did not set a session cookie");

  const wrongCanonicalPost = await fetch(origin + "/beta/access", {
    method: "POST",
    headers: { Origin: "https://kn1ghts.org", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "incorrect" }), redirect: "manual",
  });
  assert.equal(wrongCanonicalPost.status, 303);
  assert.equal(wrongCanonicalPost.headers.get("location"), "https://kn1ghts.org/beta?error=1");
  assert.equal(wrongCanonicalPost.headers.get("set-cookie"), null, "invalid password issued session cookie");

  const wwwPost = await fetch(origin + "/beta/access", {
    method: "POST",
    headers: { Origin: "https://www.kn1ghts.org", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }),
    redirect: "manual",
  });
  assert.equal(wwwPost.status, 303);
  assert.equal(wwwPost.headers.get("location"), "https://www.kn1ghts.org/beta");

  for (const untrustedOrigin of [
    "https://evil.example",
    "https://kn1ghts.org.evil.example",
    "https://kn1ghts.org/not-an-origin",
  ]) {
    const spoofed = await fetch(origin + "/beta/access", {
      method: "POST",
      headers: {
        Origin: untrustedOrigin,
        "X-Forwarded-Host": "kn1ghts.org",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }),
      redirect: "manual",
    });
    assert.equal(spoofed.status, 403, `untrusted origin ${untrustedOrigin} was accepted`);
    assert.equal(spoofed.headers.get("x-kn1ghts-beta-reject"), "origin");
    assert.equal(spoofed.headers.get("set-cookie"), null);
  }

  const missingOrigin = await fetch(origin + "/beta/access", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }),
    redirect: "manual",
  });
  assert.equal(missingOrigin.status, 403, "missing Origin bypassed CSRF protection");

  const wrongPost = await fetch(origin + "/beta/access", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "not-the-password" }), redirect: "manual",
  });
  assert.equal(wrongPost.status, 303);
  assert.equal(wrongPost.headers.get("set-cookie"), null);

  const rightPost = await fetch(origin + "/beta/access", {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: "local-test-only-32-character-long-secret" }),
    redirect: "manual",
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
  // Valid beta access now serves the poster homepage, not the cinematic page.
  const betaBody = await beta.text();
  // Same tag-stripped check as the public homepage: the kinetic headline
  // is split into per-word spans, so the raw HTML is not contiguous.
  const betaText = betaBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.ok(betaText.includes("Four first places in 2026."), "valid beta access did not restore the redesigned homepage");
  assert.ok(!betaBody.includes('class="experience is-'), "beta exposed the removed cinematic page");
  assert.match(beta.headers.get("x-robots-tag") ?? "", /noindex/);

  const join = await get("/contact");
  assert.match(join, /SEND APPLICATION/);
  const weekly = await get("/inhouse-weekly");
  assert.match(weekly, /CHALLENGE/);
  assert.match(home, /rel="canonical" href="https:\/\/kn1ghts\.org\/?"/);
  assert.match(home, /"@type":"Organization"/);
  assert.match(home, /kn1ghts · competitive cybersecurity &amp; CTFs/i, "stable visible brand identity missing");
  assert.match(home, /"logo":"https:\/\/kn1ghts\.org\/icon\.png"/, "organization logo missing");
  // Protect branded discovery from metadata regressions on every public page.
  const seoRoutes = ["/","/team","/events","/pow","/inhouse-weekly","/contact","/blog","/security","/blog/web-ctf-field-guide"];
  const descriptions = new Set();
  for (const route of seoRoutes) {
    const html = await get(route);
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert.ok(description, route + ": missing description");
    assert.ok(!descriptions.has(description), route + ": duplicate description");
    descriptions.add(description);
    const canonical = route === "/" ? "https://kn1ghts.org/" : "https://kn1ghts.org" + route;
    assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), route + ": incorrect canonical");
  }
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "duplicate sitemap URLs");
  const signin = await get("/sign-in");
  assert.match(signin, /name="robots" content="noindex/);
  console.log("Public and private smoke checks passed: poster homepage, Team, Blog, private beta authentication, community routes, SEO.");
} catch (error) {
  console.error(error);
  console.error(serverLogs.slice(-2500));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
