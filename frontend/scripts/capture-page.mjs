import { writeFile } from "node:fs/promises";

const [path = "/dashboard", output = "page-audit.png", widthArg = "390", heightArg = "844", theme = "light", participantId = ""] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
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

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 620, screenWidth: width, screenHeight: height });
if (participantId) {
  await send("Runtime.evaluate", {
    expression: participantId === "none"
      ? 'localStorage.removeItem("joc-session-participant")'
      : `localStorage.setItem("joc-session-participant", ${JSON.stringify(participantId)})`,
  });
}
await send("Page.navigate", { url: `http://localhost:3000${path}` });
await new Promise((resolve) => setTimeout(resolve, 700));
await send("Runtime.evaluate", { expression: `localStorage.setItem("joc-theme", "${theme}"); document.documentElement.classList.toggle("dark", "${theme}" === "dark"); document.documentElement.style.colorScheme = "${theme}";` });
await new Promise((resolve) => setTimeout(resolve, 1200));

const audit = await send("Runtime.evaluate", {
  expression: `JSON.stringify({url: location.pathname, innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, scrollX, outside: [...document.querySelectorAll("body *")].map((element) => { const rect = element.getBoundingClientRect(); return { tag: element.tagName, className: String(element.className).slice(0, 90), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }; }).filter((item) => item.right > innerWidth + 1 || item.left < -1).sort((a, b) => b.width - a.width).slice(0, 20)})`,
  returnByValue: true,
});
const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
await writeFile(output, Buffer.from(screenshot.data, "base64"));
console.log(audit.result.value);
socket.close();
