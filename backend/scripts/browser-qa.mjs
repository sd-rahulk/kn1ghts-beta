import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const pages = await (await fetch("http://localhost:9222/json")).json();
const page = pages.find((item) => item.type === "page");
assert.ok(page, "Start a local Chrome debugging session on port 9222 first.");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map(), errors = [];
socket.addEventListener("message", ({ data }) => {
  const result = JSON.parse(data);
  if (result.id) { const callback = pending.get(result.id); if (!callback) return; pending.delete(result.id); result.error ? callback.reject(result.error) : callback.resolve(result.result); }
  if (result.method === "Runtime.exceptionThrown") errors.push(result.params.exceptionDetails);
});
function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value; }
async function waitFor(expression) { for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 250)); } throw new Error(`Timed out: ${expression}. ${await evaluate("JSON.stringify({width:innerWidth,results:Array.from(document.querySelectorAll('#results,.results-list,#writeups')).map(n=>({class:n.className,height:n.offsetHeight,top:n.offsetTop,min:n.style.minHeight,rectBottom:n.getBoundingClientRect().bottom,rectTop:n.getBoundingClientRect().top})),message:document.querySelector('.form-message')?.textContent})")}`); }
async function screenshot(name) { await mkdir("responsive_screenshots", { recursive: true }); const result = await send("Page.captureScreenshot", { format: "png" }); await writeFile(`responsive_screenshots/${name}.png`, Buffer.from(result.data, "base64")); }
async function tab(name) { await evaluate(`Array.from(document.querySelectorAll('.sidebar nav button')).find(button => button.textContent.toLowerCase().includes(${JSON.stringify(name.toLowerCase())})).click()`); await new Promise((resolve) => setTimeout(resolve, 700)); }
async function overflow() { return evaluate("document.documentElement.scrollWidth > innerWidth + 1"); }
try {
  await send("Runtime.enable"); await send("Page.enable");
  await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://localhost:3001/login" });
  await waitFor("Boolean(document.querySelector('input[type=email]'))");
  await screenshot("admin-login-desktop");
  await evaluate("document.querySelector('input[type=email]').focus()"); await send("Input.insertText", { text: "owner@kn1ghts.test" });
  await evaluate("document.querySelector('input[type=password]').focus()"); await send("Input.insertText", { text: "Kn1ghts-local-only-2026!" });
  await evaluate("document.querySelector('button.primary').click()");
  await waitFor("Boolean(document.querySelector('.admin-shell'))");
  assert.equal(await overflow(), false, "Desktop sections overflow"); await screenshot("admin-sections-desktop");
  for (const name of ["Settings", "Inbox", "History", "Access"]) { await tab(name); assert.equal(await overflow(), false, `${name} overflow`); }
  await tab("Inbox"); await screenshot("admin-inbox-desktop");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const name of ["Sections", "Settings", "Inbox", "History", "Access"]) { await tab(name); assert.equal(await overflow(), false, `Mobile ${name} overflow`); }
  await tab("Sections"); await screenshot("admin-sections-mobile");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log("PASS: Firebase browser login, authenticated navigation, all five desktop/mobile screens, no horizontal overflow, no runtime exceptions.");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 800 });
    await send("Page.navigate", { url: "http://localhost:3000/?skipIntro=1" });
    await waitFor("Boolean(document.querySelector('.experience.is-loaded'))");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    assert.equal(await overflow(), false, `Public ${name} overflow`);
    assert.equal(await evaluate("document.querySelectorAll('[data-section-type]').length"), 12);
    await screenshot(`cms-public-${name}`);
    await evaluate("document.getElementById('contact').scrollIntoView({block:'center'})");
    await new Promise((resolve) => setTimeout(resolve, 300));
    await screenshot(`cms-contact-${name}`);
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  // A real copy edit can exceed an absolute list's original chapter height.
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://localhost:3000/?skipIntro=1" });
  await waitFor("Boolean(document.querySelector('.experience.is-loaded'))");
  await evaluate("window.scrollTo(0,0); document.querySelector('.results-list p').textContent = 'Long edited copy. '.repeat(1200)");
  await waitFor("document.querySelector('.results-list').getBoundingClientRect().bottom <= document.getElementById('writeups').getBoundingClientRect().top");
  console.log("PASS: public CMS rendering, preserved hero, contact section, desktop/mobile sizing, and edited content expansion.");
  await send("Page.navigate", { url: "http://localhost:3001" });
} finally { socket.close(); }
