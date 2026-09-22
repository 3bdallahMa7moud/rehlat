const participantRoutes = [
  "/dashboard",
  "/tasks",
  "/tasks/quran",
  "/tasks/prayer",
  "/tasks/adhkar",
  "/tasks/reading",
  "/tasks/sport",
  "/tasks/water",
  "/tasks/sleep",
  "/tasks/skill",
  "/focus",
  "/competition",
  "/streaks",
  "/honors",
  "/analytics",
  "/reports",
  "/ai",
  "/history",
  "/messages",
  "/notifications",
  "/settings",
];

const adminRoutes = [
  "/admin",
  "/admin/participants",
  "/admin/participants/razi",
  "/admin/tasks",
  "/admin/analytics",
  "/admin/activity",
  "/admin/data",
];

const targets = await fetch("http://localhost:9222/json").then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.includes("localhost:3000"));
if (!page) throw new Error("No local page target found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function auditRoute(path, participantId) {
  await evaluate(`localStorage.setItem("joc-session-participant", ${JSON.stringify(participantId)})`);
  await send("Page.navigate", { url: `http://localhost:3000${path}` });
  await new Promise((resolve) => setTimeout(resolve, 900));
  return JSON.parse(await evaluate(`JSON.stringify({
    requested: ${JSON.stringify(path)},
    actual: location.pathname,
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    heading: document.querySelector("h1")?.textContent?.trim() || document.querySelector("h2")?.textContent?.trim() || "",
    hasRuntimeError: document.body.innerText.includes("Application error") || document.body.innerText.includes("حدث خطأ غير متوقع")
  })`));
}

await send("Page.enable");
await send("Runtime.enable");
const results = [];

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  await send("Emulation.setDeviceMetricsOverride", {
    ...viewport,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 620,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  for (const path of participantRoutes) results.push(await auditRoute(path, "razi"));
  for (const path of adminRoutes) results.push(await auditRoute(path, "admin"));
}

const failures = results.filter((result) => result.hasRuntimeError || result.bodyWidth > result.width + 1 || result.scrollWidth > result.width + 1 || !result.heading);
console.log(JSON.stringify({ checked: results.length, failures }, null, 2));
socket.close();
if (failures.length) process.exitCode = 1;
