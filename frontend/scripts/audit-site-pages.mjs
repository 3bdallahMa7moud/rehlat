import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const debugPort = Number(process.env.AUDIT_DEBUG_PORT ?? 9228);
const outputDir = path.resolve(process.env.AUDIT_OUTPUT_DIR ?? "artifacts/site-audit");
const systemOnly = process.argv.includes("--system-only");
const deepOnly = process.argv.includes("--deep-only");
const darkOnly = process.argv.includes("--dark-only");
const participantRoutes = [
  "/dashboard", "/tasks", "/tasks/prayer", "/tasks/quran", "/tasks/adhkar", "/tasks/adhkar-evening",
  "/tasks/reading", "/tasks/lesson-review", "/tasks/sport", "/tasks/water", "/tasks/skill", "/tasks/family", "/tasks/sleep",
  "/focus", "/streaks", "/competition", "/honors", "/analytics", "/reports", "/history", "/ai",
  "/messages", "/notifications", "/settings", "/quran",
];
const adminRoutes = [
  "/admin", "/admin/participants", "/admin/participants/razi", "/admin/tasks", "/admin/tasks/new",
  "/admin/tasks/prayer/edit", "/admin/reports", "/admin/analytics", "/admin/activity", "/admin/data",
];
const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const page = targets.find((item) => item.type === "page" && item.url.startsWith(baseUrl));
if (!page) throw new Error("No local browser page target found");
const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  const promise = pending.get(message.id);
  if (!promise) return;
  pending.delete(message.id);
  if (message.error) promise.reject(new Error(message.error.message));
  else promise.resolve(message.result);
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
const send = (method, params = {}) => {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(outputDir, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");

async function setSession(id) {
  await send("Page.navigate", { url: `${baseUrl}/login` });
  await wait(800);
  await evaluate(`localStorage.setItem("joc-session-participant", ${JSON.stringify(id)})`);
  await send("Page.reload", { ignoreCache: false });
  await wait(900);
}

const results = [];
async function auditRoute(route, role, viewport) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
  await send("Page.navigate", { url: `${baseUrl}${route}` });
  await wait(700);
  for (let retry = 0; retry < 10; retry += 1) {
    const state = await evaluate("({ready: document.readyState, guard: Boolean(document.querySelector('.route-guard-state')), heading: document.querySelector('main h1')?.textContent})");
    if (state.ready === "complete" && !state.guard && (state.heading || retry >= 3)) break;
    await wait(300);
  }
  const metrics = await evaluate(`(() => {
    const main = document.querySelector('main.app-main') ?? document.querySelector('main') ?? document.body;
    const elements = [...main.querySelectorAll('button, a, input, select, textarea')];
    const visible = elements.filter((el) => { const rect = el.getBoundingClientRect(); const style = getComputedStyle(el); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; });
    const small = visible.filter((el) => { const rect = el.getBoundingClientRect(); return rect.width < 40 || rect.height < 36; }).slice(0, 8).map((el) => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 40), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }));
    const images = [...main.querySelectorAll('img')];
    return {
      url: location.pathname, title: document.title, h1: [...main.querySelectorAll('h1')].map((el) => el.textContent?.trim()),
      headings: [...main.querySelectorAll('h2')].slice(0, 10).map((el) => el.textContent?.trim()),
      textLength: main.innerText.length, controls: visible.length, smallControls: small,
      scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight,
      imageCount: images.length, brokenImages: images.filter((img) => img.complete && img.naturalWidth === 0).length,
      pendingImages: images.filter((img) => !img.complete).length,
      hasEmptyState: Boolean(main.querySelector('[class*=empty-state]')),
      bodyExcerpt: main.innerText.slice(0, 240).replace(/\\s+/g, ' '),
    };
  })()`);
  const file = `${role}-${route.replaceAll("/", "-").replace(/^-/, "") || "root"}-${viewport.name}${deepOnly ? "-full" : darkOnly ? "-dark" : ""}.jpg`;
  const screenshot = await send("Page.captureScreenshot", {
    format: "jpeg", quality: 68, captureBeyondViewport: deepOnly,
    ...(deepOnly ? { clip: { x: 0, y: 0, width: viewport.width, height: Math.min(metrics.scrollHeight, 4000), scale: 1 } } : {}),
  });
  await writeFile(path.join(outputDir, file), Buffer.from(screenshot.data, "base64"));
  const result = { role, route, viewport: viewport.name, screenshot: file, ...metrics };
  results.push(result);
  console.log(`${viewport.name.padEnd(7)} ${route.padEnd(30)} ${metrics.url.padEnd(30)} ${metrics.scrollWidth > metrics.clientWidth ? "OVERFLOW" : "ok"} ${metrics.h1.join(" / ")}`);
}

const viewports = [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }];
for (const [role, id, routes] of (systemOnly ? [] : darkOnly ? [["participant", "razi", ["/dashboard", "/tasks/adhkar-evening", "/tasks/reading", "/tasks/sleep"]], ["admin", "admin", ["/admin/tasks/new", "/admin/participants", "/admin/data"]]] : deepOnly ? [["participant", "razi", ["/tasks/adhkar", "/tasks/reading", "/tasks/sleep", "/reports"]], ["admin", "admin", ["/admin/tasks/new", "/admin/participants", "/admin/reports", "/admin/data"]]] : [["participant", "razi", participantRoutes], ["admin", "admin", adminRoutes]])) {
  await setSession(id);
  if (darkOnly) { await evaluate('localStorage.setItem("joc-theme", "dark")'); await send("Page.reload"); await wait(700); }
  for (const viewport of (deepOnly || darkOnly ? viewports.filter((item) => item.name === "mobile") : viewports)) for (const route of routes) await auditRoute(route, role, viewport);
}
await send("Page.navigate", { url: `${baseUrl}/login` });
await wait(500);
await evaluate('localStorage.removeItem("joc-session-participant")');
if (!deepOnly && !darkOnly) for (const viewport of viewports) for (const route of (systemOnly ? ["/login", "/setup-pin", "/forbidden", "/missing-page"] : ["/login"])) await auditRoute(route, "auth", viewport);
await writeFile(path.join(outputDir, systemOnly ? "results-system.json" : deepOnly ? "results-deep.json" : darkOnly ? "results-dark.json" : "results.json"), JSON.stringify({ auditedAt: new Date().toISOString(), errors, pages: results }, null, 2));
socket.close();
console.log(JSON.stringify({ total: results.length, errors, overflow: results.filter((item) => item.scrollWidth > item.clientWidth).map((item) => `${item.route}:${item.viewport}`) }));
