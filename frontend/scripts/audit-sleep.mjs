import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3100";
const debugPort = process.argv[3] ?? "9444";
const outputDir = path.resolve("frontend/artifacts/sleep-audit");
const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) throw new Error("Local browser target not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args?.map((arg) => arg.value ?? arg.description).join(" ") ?? "Console error");
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
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(outputDir, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: `${baseUrl}/login` });
await pause(800);
await evaluate('localStorage.removeItem("journey-of-change/state"); localStorage.removeItem("journey-of-change/sleep-session/razi/sleep"); localStorage.removeItem("journey-of-change/sleep-session/noura/sleep"); localStorage.setItem("joc-session-participant", "razi"); localStorage.setItem("joc-theme", "light")');
const results = [];
for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.name === "mobile" });
  await send("Page.navigate", { url: `${baseUrl}/tasks/sleep` });
  await pause(1500);
  const metrics = await evaluate(`(() => ({
    url: location.pathname,
    heading: document.querySelector('.sleep-page h1')?.textContent?.trim(),
    action: [...document.querySelectorAll('.sleep-page button')].map((button) => button.textContent?.trim()).find((value) => value?.includes('سأنام') || value?.includes('استيقظت') || value?.includes('تعديل سجل')),
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    hero: (() => { const rect = document.querySelector('.sleep-hero')?.getBoundingClientRect(); return rect && { x: Math.round(rect.x), width: Math.round(rect.width), height: Math.round(rect.height) }; })(),
    content: document.querySelector('.sleep-page')?.innerText.slice(0, 300),
  }))()`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const file = `sleep-${viewport.name}.png`;
  await writeFile(path.join(outputDir, file), Buffer.from(screenshot.data, "base64"));
  results.push({ viewport: viewport.name, screenshot: file, ...metrics });
}
const editorOpened = await evaluate(`(() => { const button = document.querySelector('.sleep-manual-link'); button?.click(); return Boolean(button); })()`);
await pause(150);
const editorScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await writeFile(path.join(outputDir, 'sleep-editor-mobile.png'), Buffer.from(editorScreenshot.data, 'base64'));
const manualFields = await evaluate(`(() => {
  const inputs = [...document.querySelectorAll('#sleep-manual-editor input[type="time"]')];
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  for (const [index, value] of ['22:30', '06:31'].entries()) {
    setter?.call(inputs[index], value);
    inputs[index]?.dispatchEvent(new Event('input', { bubbles: true }));
    inputs[index]?.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return inputs.length;
})()`);
await pause(150);
const saved = await evaluate(`(() => { const button = [...document.querySelectorAll('#sleep-manual-editor button')].find((item) => item.textContent?.includes('حفظ سجل النوم')); button?.click(); return Boolean(button); })()`);
await pause(400);
const recorded = await evaluate(`(() => ({
  duration: document.querySelector('.sleep-duration-ring strong')?.textContent?.trim(),
  qualityVisible: Boolean(document.querySelector('.sleep-quality-options')),
  editorClosed: !document.querySelector('#sleep-manual-editor'),
  width: document.documentElement.scrollWidth,
}))()`);
const recordedScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await writeFile(path.join(outputDir, 'sleep-recorded-mobile.png'), Buffer.from(recordedScreenshot.data, 'base64'));
const qualitySaved = await evaluate(`(() => { const button = [...document.querySelectorAll('.sleep-quality-options button')][3]; button?.click(); return Boolean(button); })()`);
await pause(400);
await send('Page.reload');
await pause(1200);
const persisted = await evaluate(`(() => ({
  duration: document.querySelector('.sleep-duration-ring strong')?.textContent?.trim(),
  quality: document.querySelectorAll('.sleep-quality-options button[aria-pressed="true"]').length,
  action: document.querySelector('.sleep-mobile-action button')?.textContent?.trim(),
}))()`);
await evaluate('localStorage.setItem("joc-session-participant", "noura")');
await send('Page.reload');
await pause(1200);
const automaticStart = await evaluate(`(() => { const button = document.querySelector('.sleep-mobile-action button'); button?.click(); return Boolean(button); })()`);
await pause(250);
const sessionKey = 'journey-of-change/sleep-session/noura/sleep';
const sessionStored = await evaluate(`localStorage.getItem(${JSON.stringify(sessionKey)})`);
const simulatedStart = new Date(Date.now() - 8 * 3_600_000).toISOString();
await evaluate(`localStorage.setItem(${JSON.stringify(sessionKey)}, ${JSON.stringify(simulatedStart)})`);
await send('Page.reload');
await pause(1200);
const activeBeforeWake = await evaluate(`(() => ({
  action: document.querySelector('.sleep-mobile-action button')?.textContent?.trim(),
  duration: document.querySelector('.sleep-duration-ring strong')?.textContent?.trim(),
}))()`);
const automaticWake = await evaluate(`(() => { const button = document.querySelector('.sleep-mobile-action button'); button?.click(); return Boolean(button); })()`);
await pause(350);
const afterWake = await evaluate(`(() => ({
  action: document.querySelector('.sleep-mobile-action button')?.textContent?.trim(),
  duration: document.querySelector('.sleep-duration-ring strong')?.textContent?.trim(),
  sessionCleared: !localStorage.getItem(${JSON.stringify(sessionKey)}),
  bedtime: document.querySelector('.sleep-clock-point strong')?.textContent?.trim(),
}))()`);
socket.close();
console.log(JSON.stringify({ results, interaction: { editorOpened, manualFields, saved, recorded, qualitySaved, persisted, automaticStart, sessionStored: Boolean(sessionStored), activeBeforeWake, automaticWake, afterWake }, errors }, null, 2));
if (errors.length || results.some((result) => result.url !== "/tasks/sleep" || !result.heading || result.pageWidth > result.viewportWidth + 1) || !editorOpened || manualFields !== 2 || !saved || recorded.duration !== '8 س 01 د' || !recorded.qualityVisible || !recorded.editorClosed || !qualitySaved || persisted.duration !== '8 س 01 د' || persisted.quality !== 1 || !persisted.action?.includes('تعديل سجل') || !automaticStart || !sessionStored || !activeBeforeWake.action?.includes('استيقظت') || !automaticWake || !afterWake.action?.includes('تعديل سجل') || !afterWake.sessionCleared || !afterWake.duration?.includes('8 س')) process.exitCode = 1;
