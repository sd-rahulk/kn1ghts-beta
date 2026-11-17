import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = "3176";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
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
  const llms = await get("/llms.txt");
  assert.match(llms, /KN1GHTS/);
  const home = await get("/");
  assert.match(home, /rel="canonical" href="https:\/\/kn1ghts\.org\/?"/);
  assert.match(home, /"@type":"Organization"/);
  const signin = await get("/sign-in");
  assert.match(signin, /name="robots" content="noindex/);
  console.log("SEO smoke checks passed: robots, sitemap, llms, canonical, structured data, noindex.");
} catch (error) {
  console.error(error);
  console.error(serverLogs.slice(-2500));
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
}
