import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DEBUG_URL = process.env.QA_DEBUG_URL ?? "http://localhost:9222";
const OUTPUT_DIR = "responsive_screenshots";

const viewports = [
  { name: "tiny-phone", width: 280, height: 653, dpr: 2, mobile: true },
  { name: "small-phone", width: 320, height: 568, dpr: 2, mobile: true },
  { name: "android-phone", width: 360, height: 740, dpr: 3, mobile: true },
  { name: "iphone", width: 390, height: 844, dpr: 3, mobile: true },
  { name: "large-phone", width: 430, height: 932, dpr: 3, mobile: true },
  { name: "foldable", width: 540, height: 720, dpr: 2, mobile: true },
  { name: "short-landscape", width: 667, height: 375, dpr: 2, mobile: true },
  { name: "phone-landscape", width: 844, height: 390, dpr: 3, mobile: true },
  { name: "tablet-portrait", width: 768, height: 1024, dpr: 2, mobile: true },
  { name: "large-tablet", width: 820, height: 1180, dpr: 2, mobile: true },
  { name: "tablet-landscape", width: 1024, height: 768, dpr: 2, mobile: true },
  { name: "small-laptop", width: 1280, height: 720, dpr: 1, mobile: false },
  { name: "laptop", width: 1366, height: 768, dpr: 1, mobile: false },
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "full-hd", width: 1920, height: 1080, dpr: 1, mobile: false },
  { name: "ultrawide", width: 2560, height: 1080, dpr: 1, mobile: false },
];

const screenshotDevices = new Set(["tiny-phone", "iphone", "phone-landscape", "tablet-portrait", "tablet-landscape", "laptop", "full-hd", "ultrawide"]);
const chapters = ["home", "updates", "approach", "disciplines", "results", "writeups", "projects", "team", "journal", "recruitment", "contact"];
const chapterProgress = { home: 0, updates: .18, approach: .2, disciplines: .2, results: .2, writeups: .14, projects: .2, team: .12, journal: .2, recruitment: .18, contact: .25 };

const pages = await (await fetch(`${DEBUG_URL}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error(`No Chrome debug page found at ${DEBUG_URL}`);

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const networkFailures = [];
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails);
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) runtimeErrors.push(message.params.entry);
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push(message.params);
});

function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed");
  return result.result.value;
}

async function setViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  await send("Emulation.setTouchEmulationEnabled", viewport.mobile
    ? { enabled: true, maxTouchPoints: 5 }
    : { enabled: false });
}

async function navigate(path = "/?skipIntro=1", wait = 1300) {
  await send("Page.navigate", { url: `${BASE_URL}${path}` });
  await delay(wait);
}

async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 76, fromSurface: true, captureBeyondViewport: false });
  await writeFile(`${OUTPUT_DIR}/${name}.jpg`, Buffer.from(shot.data, "base64"));
}

const globalAuditExpression = `(() => {
  const round = (value) => Math.round(value * 10) / 10;
  const visible = (node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .01 && rect.width > 0 && rect.height > 0;
  };
  const selector = (node) => node.id ? '#' + node.id : node.classList.length ? '.' + [...node.classList].join('.') : node.tagName.toLowerCase();
  const excludedOverflow = (node) => node.closest('.canvas-shell, .atmosphere, .grain, [data-track], .recruitment-mark, .cursor');
  const overflow = [...document.body.querySelectorAll('*')].filter((node) => {
    if (!visible(node) || excludedOverflow(node) || getComputedStyle(node).position === 'fixed') return false;
    const rect = node.getBoundingClientRect();
    return rect.left < -1 || rect.right > innerWidth + 1;
  }).slice(0, 20).map((node) => ({ selector: selector(node), left: round(node.getBoundingClientRect().left), right: round(node.getBoundingClientRect().right) }));
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const brokenImages = [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
  const externalLinkIssues = [...document.querySelectorAll('a[target="_blank"]')].filter((link) => !link.relList.contains('noreferrer')).map((link) => link.href);
  const unlabeledControls = [...document.querySelectorAll('button, a')].filter((node) => !((node.getAttribute('aria-label') || node.textContent || '').trim())).map(selector);
  const canvas = document.querySelector('canvas');
  const canvasRect = canvas?.getBoundingClientRect();
  const headerRect = document.querySelector('.header')?.getBoundingClientRect();
  const mobileTargets = [...document.querySelectorAll('button, .network-cta')].filter(visible).map((node) => {
    const rect = node.getBoundingClientRect();
    return { selector: selector(node), width: round(rect.width), height: round(rect.height) };
  }).filter((item) => item.width < 44 || item.height < 44);
  return {
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    semantic: { h1Count: document.querySelectorAll('h1').length, chapterCount: document.querySelectorAll('[data-chapter]').length, navButtonCount: document.querySelectorAll('.menu-overlay nav button').length, duplicateIds },
    canvas: canvasRect ? { width: round(canvasRect.width), height: round(canvasRect.height) } : null,
    header: headerRect ? { top: round(headerRect.top), left: round(headerRect.left), right: round(headerRect.right), height: round(headerRect.height) } : null,
    overflow,
    brokenImages,
    externalLinkIssues,
    unlabeledControls,
    mobileTargets,
    fonts: document.fonts.status,
    cursor: getComputedStyle(document.body).cursor,
    menuClosed: { expanded: document.querySelector('.menu-toggle')?.getAttribute('aria-expanded'), hidden: document.querySelector('.menu-overlay')?.getAttribute('aria-hidden') },
  };
})()`;

async function auditChapter(id) {
  await evaluate(`(() => { const section = document.querySelector('#${id}'); const range = Math.max(0, section.offsetHeight - innerHeight); window.scrollTo(0, section.offsetTop + range * ${chapterProgress[id]}); return true; })()`);
  await delay(450);
  return evaluate(`(() => {
    const section = document.querySelector('#${id}');
    const visible = [...section.querySelectorAll('h1,h2,h3,p,strong,a,article')].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > .05;
    });
    const overflow = [...section.querySelectorAll('*')].filter((node) => {
      if (node.closest('[data-track]') || getComputedStyle(node).position === 'fixed') return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
    }).slice(0, 10).map((node) => node.id ? '#' + node.id : '.' + [...node.classList].join('.'));
    return { id: '${id}', visibleContent: visible.length, overflow, scrollY: Math.round(scrollY), sectionHeight: Math.round(section.offsetHeight) };
  })()`);
}

async function testLoader() {
  await setViewport({ width: 390, height: 844, dpr: 3, mobile: true });
  await send("Page.navigate", { url: `${BASE_URL}/` });
  await delay(250);
  const initial = await evaluate(`(() => { const loader = document.querySelector('.loader'); return { exists: !!loader, done: loader?.classList.contains('is-done'), value: loader?.getAttribute('aria-label'), visibility: getComputedStyle(loader).visibility }; })()`);
  await screenshot("feature-loader-active");
  await delay(2200);
  const complete = await evaluate(`(() => { const loader = document.querySelector('.loader'); return { done: loader?.classList.contains('is-done'), visibility: getComputedStyle(loader).visibility, loaded: document.querySelector('.experience')?.classList.contains('is-loaded') }; })()`);
  return { initial, complete };
}

async function testInteractions() {
  await setViewport({ width: 390, height: 844, dpr: 3, mobile: true });
  await navigate();
  const initial = await evaluate(`(() => ({ expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), bodyOverflow: document.body.style.overflow }))()`);
  await evaluate(`document.querySelector('.menu-toggle').click()`);
  await delay(900);
  const opened = await evaluate(`(() => ({ expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), bodyOverflow: document.body.style.overflow, overlayHidden: document.querySelector('.menu-overlay').getAttribute('aria-hidden'), pointerEvents: getComputedStyle(document.querySelector('.menu-overlay')).pointerEvents, focused: document.activeElement?.textContent?.trim(), storyInert: document.querySelector('#story')?.inert ?? false, scrollable: document.querySelector('.menu-overlay').scrollHeight >= document.querySelector('.menu-overlay').clientHeight }))()`);
  await screenshot("feature-menu-open-mobile");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await delay(120);
  const escaped = await evaluate(`(() => ({ expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), bodyOverflow: document.body.style.overflow, overlayHidden: document.querySelector('.menu-overlay').getAttribute('aria-hidden') }))()`);
  const jumps = [];
  for (let index = 0; index < chapters.length; index++) {
    await evaluate(`document.querySelector('.menu-toggle').click()`);
    await delay(40);
    await evaluate(`document.querySelectorAll('.menu-overlay nav button')[${index}].click()`);
    await delay(1000);
    jumps.push(await evaluate(`(() => { const target = document.querySelectorAll('[data-chapter]')[${index}]; return { id: target.id, top: Math.round(target.getBoundingClientRect().top), expanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded') }; })()`));
  }
  await evaluate(`window.scrollTo(0, document.documentElement.scrollHeight * .55)`);
  await delay(80);
  await evaluate(`document.querySelector('.wordmark').click()`);
  await delay(2000);
  const wordmark = await evaluate(`({ scrollY: Math.round(scrollY) })`);
  const skipLink = await evaluate(`(() => { const link = document.querySelector('.skip-link'); link.focus(); const rect = link.getBoundingClientRect(); return { focused: document.activeElement === link, top: Math.round(rect.top), href: link.getAttribute('href') }; })()`);
  const links = await evaluate(`(() => ({ external: [...document.querySelectorAll('a[target="_blank"]')].map((link) => ({ href: link.href, rel: link.rel, target: link.target })), internal: [...document.querySelectorAll('a[href^="#"]')].map((link) => link.getAttribute('href')) }))()`);
  return { initial, opened, escaped, jumps, wordmark, skipLink, links };
}

async function testReducedMotion() {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await setViewport({ width: 1366, height: 768, dpr: 1, mobile: false });
  await navigate();
  const state = await evaluate(`(() => ({ matches: matchMedia('(prefers-reduced-motion: reduce)').matches, grainDisplay: getComputedStyle(document.querySelector('.grain')).display, revealOpacity: getComputedStyle(document.querySelector('[data-reveal]')).opacity, trackTransform: getComputedStyle(document.querySelector('[data-track]')).transform }))()`);
  await screenshot("feature-reduced-motion");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  return state;
}

async function testOrientationChange() {
  await setViewport({ width: 390, height: 844, dpr: 3, mobile: true });
  await navigate();
  await setViewport({ width: 844, height: 390, dpr: 3, mobile: true });
  await delay(650);
  const landscape = await evaluate(globalAuditExpression);
  await screenshot("feature-live-orientation-landscape");
  await setViewport({ width: 390, height: 844, dpr: 3, mobile: true });
  await delay(650);
  const portrait = await evaluate(globalAuditExpression);
  return { landscape, portrait };
}

async function testBlockedAssets() {
  await send("Network.setBlockedURLs", { urls: ["*images.unsplash.com/*", "*fonts.googleapis.com/*", "*fonts.gstatic.com/*"] });
  await setViewport({ width: 390, height: 844, dpr: 3, mobile: true });
  await navigate("/?skipIntro=1", 1800);
  await evaluate(`document.querySelector('#team').scrollIntoView()`);
  await delay(500);
  const state = await evaluate(`(() => ({
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
    placeholders: document.querySelectorAll('.team-card .portrait-placeholder').length,
    teamCards: document.querySelectorAll('.team-card').length,
    fontsStatus: document.fonts.status,
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))()`);
  await screenshot("feature-blocked-assets-fallback");
  await send("Network.setBlockedURLs", { urls: [] });
  return state;
}

async function testContentStress(viewport) {
  await setViewport(viewport);
  await navigate();
  return evaluate(`(() => {
    const team = document.querySelector('#team');
    const teamGrid = team.querySelector('.team-grid');
    const originalCards = [...teamGrid.children];
    while (teamGrid.children.length < 8) teamGrid.append(originalCards[teamGrid.children.length % originalCards.length].cloneNode(true));
    team.style.setProperty('--team-height', (76 + Math.ceil(teamGrid.children.length / 2) * 77) + 'dvh');
    const results = document.querySelector('#results');
    const resultsList = results.querySelector('.results-list');
    const originalResults = [...resultsList.children];
    while (resultsList.children.length < 6) resultsList.append(originalResults[resultsList.children.length % originalResults.length].cloneNode(true));
    results.style.setProperty('--results-height', 'calc(75dvh + ' + (resultsList.children.length * 190) + 'px)');
    const longText = 'EXTREMELYLONGREALWORLDCONTENTWITHOUTMANUALLINEBREAKS'.repeat(6);
    resultsList.querySelector('h3').textContent = longText;
    resultsList.querySelector('p').textContent = longText;
    const sectionSpill = (section, content) => {
      const sectionBottom = section.getBoundingClientRect().bottom + scrollY;
      const contentBottom = Math.max(...[...content.querySelectorAll('*')].map((node) => node.getBoundingClientRect().bottom + scrollY));
      return Math.max(0, Math.round(contentBottom - sectionBottom));
    };
    return { teamCards: teamGrid.children.length, teamSpill: sectionSpill(team, teamGrid), resultCards: resultsList.children.length, resultsSpill: sectionSpill(results, resultsList), documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, longHeadingOverflow: resultsList.querySelector('h3').scrollWidth - resultsList.querySelector('h3').clientWidth, teamHeight: team.offsetHeight, resultsHeight: results.offsetHeight };
  })()`);
}

await mkdir(OUTPUT_DIR, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Network.clearBrowserCache");

const matrix = [];
for (const viewport of viewports) {
  await setViewport(viewport);
  await navigate();
  await evaluate("window.scrollTo(0, 0)");
  await delay(100);
  const audit = await evaluate(globalAuditExpression);
  const chapterAudits = [];
  for (const chapter of chapters) {
    const chapterAudit = await auditChapter(chapter);
    chapterAudits.push(chapterAudit);
    if (screenshotDevices.has(viewport.name)) await screenshot(`${viewport.name}-${chapter}`);
  }
  await evaluate("window.scrollTo(0, 0)");
  await evaluate("document.querySelector('.menu-toggle').click()");
  await delay(900);
  const menu = await evaluate(`(() => { const overlay = document.querySelector('.menu-overlay'); const last = overlay.querySelector('nav button:last-child').getBoundingClientRect(); return { clientHeight: overlay.clientHeight, scrollHeight: overlay.scrollHeight, canScroll: overlay.scrollHeight > overlay.clientHeight, lastButtonBottom: Math.round(last.bottom) }; })()`);
  if (screenshotDevices.has(viewport.name)) await screenshot(`${viewport.name}-menu`);
  await evaluate("document.querySelector('.menu-toggle').click()");
  matrix.push({ device: viewport, audit, chapters: chapterAudits, menu });
}

const functional = {
  loader: await testLoader(),
  interactions: await testInteractions(),
  reducedMotion: await testReducedMotion(),
  orientation: await testOrientationChange(),
  blockedAssets: await testBlockedAssets(),
  contentStress: {
    mobile: await testContentStress({ width: 390, height: 844, dpr: 3, mobile: true }),
    shortDesktop: await testContentStress({ width: 1280, height: 600, dpr: 1, mobile: false }),
    desktop: await testContentStress({ width: 1440, height: 900, dpr: 1, mobile: false }),
  },
};

const results = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  matrix,
  functional,
  runtimeErrors: runtimeErrors.map((error) => ({ text: error.text ?? error.message ?? error.source, url: error.url })),
  networkFailures: networkFailures.filter((failure) => failure.blockedReason !== "inspector").map((failure) => ({ errorText: failure.errorText, type: failure.type, blockedReason: failure.blockedReason })).slice(0, 50),
};

await writeFile(`${OUTPUT_DIR}/results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify({ devices: matrix.length, screenshots: [...screenshotDevices].length * (chapters.length + 1) + 5, runtimeErrors: results.runtimeErrors.length, networkFailures: results.networkFailures.length, blockedAssets: functional.blockedAssets, contentStress: functional.contentStress }, null, 2));
ws.close();
