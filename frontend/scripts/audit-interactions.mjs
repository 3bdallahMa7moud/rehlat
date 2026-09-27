const [baseUrl = "http://localhost:3000", debugPort = "9222"] = process.argv.slice(2);

const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) throw new Error(`No ${baseUrl} page target found on port ${debugPort}`);

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
let runtimeErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    runtimeErrors.push((message.params.args ?? []).map((arg) => arg.value ?? arg.description ?? "").join(" "));
  }
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
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const checks = [];

async function navigate(path, participantId = "razi") {
  runtimeErrors = [];
  await evaluate(`localStorage.setItem("joc-session-participant", ${JSON.stringify(participantId)})`);
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  await wait(900);
  const actual = await evaluate("location.pathname");
  if (actual !== path) throw new Error(`Expected ${path}, reached ${actual}`);
}

function record(name, passed, details = {}) {
  checks.push({ name, passed: Boolean(passed), ...details });
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});

await navigate("/ai");
const composerReady = await evaluate(`(() => {
  const textarea = document.querySelector("textarea");
  if (!textarea) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, "رتب لي مهمة قصيرة");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
record("ai composer accepts input", composerReady);
await wait(100);
const submitted = await evaluate(`(() => {
  const form = document.querySelector("textarea")?.closest("form");
  if (!form) return false;
  form.requestSubmit();
  return true;
})()`);
await wait(1200);
const aiResult = await evaluate(`(() => ({
  userMessages: document.querySelectorAll('article[aria-label="رسالتك"]').length,
  assistantMessages: document.querySelectorAll('article[aria-label="رد المساعد"]').length,
  hasError: Boolean(document.querySelector('[role="alert"]')),
}))()`);
record("ai sends and answers", submitted && aiResult.userMessages > 0 && aiResult.assistantMessages > 0 && !aiResult.hasError, aiResult);
const historyOpened = await evaluate(`(() => {
  const toggle = document.querySelector('button[aria-label="فتح سجل المحادثات"]');
  const panel = document.querySelector('aside[aria-label="سجل المحادثات"]');
  if (!toggle || !panel) return false;
  toggle.click();
  return true;
})()`);
await wait(250);
const historyVisible = await evaluate(`(() => {
  const panel = document.querySelector('aside[aria-label="سجل المحادثات"]');
  return Boolean(panel && getComputedStyle(panel).visibility === "visible");
})()`);
record("ai history opens on mobile", historyOpened && historyVisible);
record("ai has no runtime errors", runtimeErrors.length === 0, { runtimeErrors: [...runtimeErrors] });

await navigate("/history");
const historyResult = await evaluate(`(() => {
  const period = document.querySelector('[data-history-period="30"]');
  period?.click();
  const details = document.querySelector('[data-history-details]');
  details?.click();
  return { period: Boolean(period), details: Boolean(details) };
})()`);
await wait(150);
const dialogOpened = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
const dialogClosed = await evaluate(`(() => {
  const close = document.querySelector('[data-history-dialog-close]');
  close?.click();
  return Boolean(close);
})()`);
await wait(150);
const dialogGone = await evaluate(`!document.querySelector('[role="dialog"]')`);
record("history filters and dialog work", historyResult.period && historyResult.details && dialogOpened && dialogClosed && dialogGone);
record("history has no runtime errors", runtimeErrors.length === 0, { runtimeErrors: [...runtimeErrors] });

await navigate("/analytics");
const analyticsChanged = await evaluate(`(() => {
  const filter = document.querySelector('[data-analytics-period="30"]');
  filter?.click();
  return Boolean(filter);
})()`);
await wait(150);
const analyticsPressed = await evaluate(`document.querySelector('[data-analytics-period="30"]')?.getAttribute("aria-pressed") === "true"`);
record("analytics period changes", analyticsChanged && analyticsPressed);
record("analytics has no runtime errors", runtimeErrors.length === 0, { runtimeErrors: [...runtimeErrors] });

await navigate("/reports");
const reportsChanged = await evaluate(`(() => {
  const buttons = [...document.querySelectorAll('.reports-period-heading button')];
  const monthly = buttons.find((button) => button.textContent?.includes("الشهر"));
  monthly?.click();
  return Boolean(monthly);
})()`);
await wait(150);
const reportsMonthly = await evaluate(`(() => {
  const buttons = [...document.querySelectorAll('.reports-period-heading button')];
  return buttons.some((button) => button.textContent?.includes("الشهر") && button.getAttribute("aria-selected") === "true");
})()`);
record("reports period changes", reportsChanged && reportsMonthly);
record("reports has no runtime errors", runtimeErrors.length === 0, { runtimeErrors: [...runtimeErrors] });

socket.close();
const failures = checks.filter((check) => !check.passed);
console.log(JSON.stringify({ checked: checks.length, failures, checks }, null, 2));
if (failures.length) process.exitCode = 1;
