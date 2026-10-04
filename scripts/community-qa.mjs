import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const debug = process.env.QA_DEBUG_URL ?? "http://localhost:9222";
const output = "responsive_screenshots/community";
const routes = ["blog", "events", "inhouse-weekly", "pow", "team", "contact", "sign-in", "sign-up", "account"];
const viewports = [{ name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false }, { name: "mobile", width: 390, height: 844, dpr: 3, mobile: true }];
const pages = await (await fetch(`${debug}/json`)).json(), target = pages.find((item) => item.type === "page");
if (!target) throw new Error("No Chrome debug page is available.");
const ws = new WebSocket(target.webSocketDebuggerUrl), pending = new Map(); let id = 0;
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
const errors = [];
ws.addEventListener("message", (event) => { const value = JSON.parse(event.data); if (value.id && pending.has(value.id)) { const pair = pending.get(value.id); pending.delete(value.id); value.error ? pair.reject(new Error(value.error.message)) : pair.resolve(value.result); } else if (value.method === "Runtime.exceptionThrown") errors.push(value.params.exceptionDetails.text); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const current = ++id; pending.set(current, { resolve, reject }); ws.send(JSON.stringify({ id: current, method, params })); });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
await mkdir(output, { recursive: true }); await send("Page.enable"); await send("Runtime.enable");
const results = [];
for (const viewport of viewports) for (const route of routes) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr, mobile: viewport.mobile, screenWidth: viewport.width, screenHeight: viewport.height });
  await send("Page.navigate", { url: `${base}/${route}` }); await delay(650);
  const audit = await evaluate(`(() => ({ title: document.title, h1: document.querySelectorAll('h1').length, forms: document.querySelectorAll('form').length, overflow: document.documentElement.scrollWidth-document.documentElement.clientWidth, brokenImages: [...document.images].filter(i=>i.complete&&i.naturalWidth===0).length, unlabeled: [...document.querySelectorAll('button,a,input,textarea,select')].filter(n=>!((n.getAttribute('aria-label')||n.textContent||n.getAttribute('name')||n.closest('label')?.textContent||'').trim())).length, bodyText: document.body.innerText.length }))()`);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 78, fromSurface: true, captureBeyondViewport: false });
  await writeFile(`${output}/${viewport.name}-${route}.jpg`, Buffer.from(shot.data, "base64"));
  results.push({ viewport: viewport.name, route, ...audit });
}
await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results, errors }, null, 2)); ws.close();
