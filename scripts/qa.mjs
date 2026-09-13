import { writeFile } from "node:fs/promises";

const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((item) => item.type === "page" && item.url.startsWith("http://localhost")) || pages.find((item) => item.type === "page" && item.url === "about:blank");
if (!page) throw new Error("No debug page");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
const events = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else if (message.method?.includes("exception") || message.method?.includes("console") || message.method?.includes("log")) {
    events.push(message);
  }
});

function send(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Page.navigate", { url: "http://localhost:3000/?skipIntro=1" });
await new Promise((resolve) => setTimeout(resolve, 7000));

const expression = `(() => {
  const pick = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const style = getComputedStyle(node);
    return { className: node.className, display: style.display, visibility: style.visibility, opacity: style.opacity, color: style.color, rect: node.getBoundingClientRect().toJSON() };
  };
  return {
    title: document.title,
    bodyText: document.body.innerText.slice(0, 500),
    loader: pick('.loader'),
    header: pick('.header'),
    hero: pick('.hero-type'),
    canvas: pick('canvas'),
    scrollHeight: document.documentElement.scrollHeight,
    devicePixelRatio,
  };
})()`;
const state = await send("Runtime.evaluate", { expression, returnByValue: true });
const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
await writeFile("qa-hero.png", Buffer.from(shot.data, "base64"));
const frames = [];
for (const [name, progress] of [["recon", .17], ["exploit", .40], ["proof", .56], ["team", .77], ["finale", .96]]) {
  await send("Runtime.evaluate", { expression: `window.scrollTo(0, document.documentElement.scrollHeight * ${progress})` });
  await new Promise((resolve) => setTimeout(resolve, 2600));
  const frameState = await send("Runtime.evaluate", { expression: `(() => ({ y: scrollY, text: [...document.querySelectorAll('h2')].filter(n => { const r=n.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight }).map(n=>n.innerText) }))()`, returnByValue: true });
  const frameShot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(`qa-${name}.png`, Buffer.from(frameShot.data, "base64"));
  frames.push({ name, ...frameState.result.value });
}
console.log(JSON.stringify({ state: state.result.value, frames, events }, null, 2));
ws.close();
