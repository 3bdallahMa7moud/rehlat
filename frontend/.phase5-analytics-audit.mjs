import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [label = "capture", widthArg = "390", heightArg = "844", theme = "light", clickSelector = ""] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
const port = 9333;
const baseUrl = "http://localhost:3000";
const outputDir = resolve("artifacts/phase5-analytics");

if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error("Viewport must be numeric");

let targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
let page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) page = targets.find((target) => target.type === "page" && target.url === "about:blank");
if (!page) throw new Error("No isolated Chrome page target found on port 9333");

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
const consoleEvents = [];
const exceptions = [];
const failedRequests = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.consoleAPICalled") {
    const values = (message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? "");
    consoleEvents.push({ type: message.params.type, text: values.join(" ").slice(0, 500) });
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails?.text ?? "exception");
  if (message.method === "Network.loadingFailed" && !message.params.canceled) failedRequests.push({ error: message.params.errorText, type: message.params.type });
  if (!message.id || !pending.has(message.id)) return;
  const { resolve: resolveRequest, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolveRequest(message.result);
});

await new Promise((resolveOpen, reject) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveRequest, reject) => pending.set(id, { resolve: resolveRequest, reject }));
}

await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 600,
  screenWidth: width,
  screenHeight: height,
});
await send("Runtime.evaluate", {
  expression: `localStorage.setItem("joc-session-participant", "razi"); localStorage.setItem("joc-theme", ${JSON.stringify(theme)});`,
});
await send("Page.navigate", { url: `${baseUrl}/analytics` });
await new Promise((resolveWait) => setTimeout(resolveWait, 2600));

if (clickSelector) {
  const clickResult = await send("Runtime.evaluate", {
    expression: `(() => { const node = document.querySelector(${JSON.stringify(clickSelector)}); if (!node) return false; node.click(); return true; })()`,
    returnByValue: true,
  });
  if (!clickResult.result.value) throw new Error(`Selector not found: ${clickSelector}`);
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));
}

const expression = `(() => {
  const visible = (node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const smallText = [...document.querySelectorAll("main *")].filter((node) => {
    if (!visible(node) || node.children.length || !node.textContent?.trim()) return false;
    return Number.parseFloat(getComputedStyle(node).fontSize) < 11;
  }).map((node) => ({ tag: node.tagName.toLowerCase(), text: node.textContent.trim().slice(0, 80), size: getComputedStyle(node).fontSize }));
  const pageControls = [...document.querySelectorAll(".analytics-page button, .analytics-page a")].filter(visible);
  const touchViolations = pageControls.map((node) => {
    const rect = node.getBoundingClientRect();
    return { text: node.textContent?.trim().slice(0, 60), width: Math.round(rect.width), height: Math.round(rect.height) };
  }).filter((item) => item.width < 44 || item.height < 44);
  const storage = (() => {
    try {
      const raw = localStorage.getItem("journey-of-change/state");
      const parsed = raw ? JSON.parse(raw) : null;
      const data = parsed?.data ?? parsed;
      return {
        progressDaysForParticipant: Array.isArray(data?.progress) ? data.progress.filter((item) => item.userId === "razi").length : null,
        participantCount: Array.isArray(data?.participants) ? data.participants.length : null,
      };
    } catch { return null; }
  })();
  return {
    url: location.pathname,
    viewport: { innerWidth, innerHeight },
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    cards: [...document.querySelectorAll("main .app-card")].filter(visible).length,
    chartPoints: [...document.querySelectorAll(".chart-column, [data-analytics-point]")].filter(visible).length,
    buttons: [...document.querySelectorAll("main button, main a.button")].filter(visible).length,
    filters: [...document.querySelectorAll("[data-analytics-period]")].filter(visible).map((node) => ({ value: node.getAttribute("data-analytics-period"), pressed: node.getAttribute("aria-pressed"), text: node.textContent.trim() })),
    metrics: [...document.querySelectorAll("[data-analytics-metric]")].filter(visible).map((node) => ({ key: node.getAttribute("data-analytics-metric"), text: node.textContent.trim().replace(/\\s+/g, " ") })),
    headings: [...document.querySelectorAll("main h1, main h2")].filter(visible).map((node) => node.textContent.trim()).slice(0, 16),
    smallTextCount: smallText.length,
    smallText,
    touchViolations,
    theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    storage,
  };
})()`;

const result = await send("Runtime.evaluate", { expression, returnByValue: true });
const audit = result.result.value;
const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
const errors = {
  console: consoleEvents.filter((item) => item.type === "error" || item.type === "warning"),
  exceptions,
  failedRequests,
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, `${label}.png`), Buffer.from(screenshot.data, "base64"));
await writeFile(resolve(outputDir, `${label}.json`), `${JSON.stringify({ label, audit, errors }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ label, audit, errors }));
socket.close();
