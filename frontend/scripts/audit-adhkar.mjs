const [baseUrl = "http://localhost:3000", debugPort = "9223"] = process.argv.slice(2);
const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) throw new Error("No local page target found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let requestId = 0;
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails?.text ?? "Runtime exception");
  if (!pending.has(message.id)) return;
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
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await send("Page.enable");
await send("Runtime.enable");
await evaluate('localStorage.setItem("joc-session-participant", "razi")');
await send("Page.navigate", { url: `${baseUrl}/tasks/adhkar-evening` });
await wait(1200);

const readCount = () => evaluate('document.querySelector("[class*=readCount]")?.textContent');
for (let attempt = 0; attempt < 3 && !(await readCount())?.includes("0 من 3"); attempt += 1) {
  await evaluate('document.querySelector("[class*=undoButton]")?.click()');
  await wait(150);
}
const initial = await readCount();
await evaluate('document.querySelector("[class*=readButton]")?.click()');
await wait(450);
const afterRead = await readCount();
await evaluate('Array.from(document.querySelectorAll("a")).find((link) => link.getAttribute("href") === "/tasks/adhkar")?.click()');
await wait(700);
const morningPath = await evaluate("location.pathname");
await evaluate('Array.from(document.querySelectorAll("a")).find((link) => link.getAttribute("href") === "/tasks/adhkar-evening")?.click()');
await wait(700);
const restored = await readCount();
await evaluate('document.querySelector("[class*=undoButton]")?.click()');
await wait(400);
const afterUndo = await readCount();
const overflow = await evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth");

const result = {
  initial,
  afterRead,
  morningPath,
  restored,
  afterUndo,
  overflow,
  errors,
  passed: initial?.includes("0 من 3") && afterRead?.includes("1 من 3") && morningPath === "/tasks/adhkar" && restored?.includes("1 من 3") && afterUndo?.includes("0 من 3") && !overflow && errors.length === 0,
};
socket.close();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
