import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const pages = await (await fetch("http://localhost:9222/json")).json();
const ws = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
});
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await delay(300);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function shot(name) {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`responsive_screenshots/changes-${name}.png`, Buffer.from(result.data, "base64"));
}
const contactTopExpression = `(() => { const top = document.querySelector('#contact').getBoundingClientRect().top + scrollY; return Math.max(90, top - (document.documentElement.scrollHeight - innerHeight)); })()`;
await mkdir("responsive_screenshots", { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
const results = [];
const viewports = [[1366, 768], [390, 844], [280, 653], [844, 390]].filter(([width]) => !process.argv.includes("--mobile-only") || width < 900);
for (const [width, height] of viewports) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 900 });
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await waitFor("document.documentElement.classList.contains('intro-lock')");
  const intro = await evaluate(`({ locked: document.documentElement.classList.contains('intro-lock'), skip: !!document.querySelector('.intro-skip') })`);
  assert.equal(intro.locked, true);
  assert.equal(intro.skip, true);
  await evaluate("document.querySelector('.intro-skip').click()");
  await delay(180);
  assert.equal(await evaluate("Boolean(document.querySelector('.intro-skip')?.disabled) || document.querySelector('.experience').classList.contains('is-loaded')"), true);
  await waitFor("!document.documentElement.classList.contains('intro-lock')");
  await waitFor("Number(document.querySelector('.intro-transition').style.opacity) === 0");
  const skipped = await evaluate(`({ locked: document.documentElement.classList.contains('intro-lock'), loaded: document.querySelector('.experience').classList.contains('is-loaded'), skip: !!document.querySelector('.intro-skip'), y: scrollY })`);
  assert.deepEqual(skipped, { locked: false, loaded: true, skip: false, y: 0 });
  await shot(`${width}-hero`);
  const links = await evaluate(`Array.from(document.querySelectorAll('.menu-overlay nav a'), a => ({ label: a.textContent, href: a.getAttribute('href'), exists: !!document.querySelector(a.getAttribute('href')) }))`);
  assert.equal(links.length, 6);
  assert.ok(links.every((link) => link.exists));
  for (let index = 0; index < links.length; index++) {
    await evaluate("document.querySelector('.menu-toggle').click()");
    await delay(850);
    if (index === 0) await shot(`${width}-menu`);
    await evaluate(`document.querySelectorAll('.menu-overlay nav a')[${index}].click()`);
    const expectedTop = index === 0 ? 0 : index === 5 ? await evaluate(contactTopExpression) : 74;
    await waitFor(`Math.abs(document.querySelector('${links[index].href}').getBoundingClientRect().top - ${expectedTop}) < 8`);
    const jump = await evaluate(`(() => { const target = document.querySelector('${links[index].href}'); return { top: Math.round(target.getBoundingClientRect().top), open: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), inert: document.querySelector('#story').inert }; })()`);
    assert.equal(jump.open, "false");
    assert.equal(jump.inert, false);
    assert.ok(Math.abs(jump.top - expectedTop) <= 10, JSON.stringify({ width, index, jump }));
  }
  await shot(`${width}-contact`);
  const form = await evaluate(`({ fields: Array.from(document.querySelectorAll('.contact-form input,.contact-form textarea'), n => n.name), disabled: document.querySelector('.contact-form button').disabled, overflow: document.documentElement.scrollWidth - innerWidth, blur: getComputedStyle(document.querySelector('.disciplines')).backdropFilter })`);
  assert.deepEqual(form.fields, ["name", "email", "message"]);
  assert.equal(form.disabled, true);
  assert.ok(form.overflow <= 1, JSON.stringify(form));
  await evaluate("document.querySelector('.wordmark').click()");
  await waitFor("scrollY < 8");
  await evaluate("document.querySelector('.hero-contact').click()");
  await delay(200);
  const midJump = await evaluate("scrollY");
  const expectedContactTop = await evaluate(contactTopExpression);
  await waitFor(`Math.abs(document.querySelector('#contact').getBoundingClientRect().top - ${expectedContactTop}) < 8`);
  assert.ok(Math.abs(await evaluate("document.querySelector('#contact').getBoundingClientRect().top") - expectedContactTop) < 8);
  results.push({ width, height, intro, skipped, form, midJump, links: links.map((link) => link.href) });
  console.log(`Passed ${width}x${height}: intro, menu links, contact shortcut, form, overflow`);
}
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.navigate", { url: "http://localhost:3000/" });
await delay(1800);
assert.equal(await evaluate("document.documentElement.classList.contains('intro-lock')"), false);
assert.equal(errors.length, 0, JSON.stringify(errors));
await writeFile("responsive_screenshots/changes-results.json", JSON.stringify({ results, reducedMotion: "passed", errors }, null, 2));
console.log("Reduced motion and runtime error checks passed.");
ws.close();
