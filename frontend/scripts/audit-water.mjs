const [baseUrl = "http://localhost:3000", debugPort = "9223"] = process.argv.slice(2);
const targets = await fetch("http://127.0.0.1:" + debugPort + "/json").then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) throw new Error("No local page target found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
const runtimeErrors = [];

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
await send("Page.enable");
await send("Runtime.enable");
await evaluate('localStorage.setItem("joc-session-participant", "razi")');
await send("Page.navigate", { url: baseUrl + "/tasks/water" });
await wait(1200);

const readState = () => evaluate(`(() => {
  const meter = document.querySelector('[role="progressbar"][aria-label="نسبة شرب الماء اليوم"]');
  const outside = [...document.querySelectorAll("body *")].some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.right > innerWidth + 1 || rect.left < -1;
  });
  return { progress: Number(meter?.getAttribute("aria-valuenow")), outside };
})()`);

const before = await readState();
const quickAdded = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("+250"));
  button?.click();
  return Boolean(button);
})()`);
await wait(250);
const afterAdd = await readState();

const undoClicked = await evaluate(`(() => {
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("تراجع عن"));
  button?.click();
  return Boolean(button);
})()`);
await wait(250);
const afterUndo = await readState();

const targetBefore = await evaluate(`document.querySelector('[class*="recommendationResult"] strong')?.textContent`);
const weightChanged = await evaluate(`(() => {
  const input = document.querySelector('input[type="number"][min="35"][max="200"]');
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, "82");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await wait(250);
const targetAfter = await evaluate(`document.querySelector('[class*="recommendationResult"] strong')?.textContent`);

const result = {
  quickAddUpdatesProgress: quickAdded && afterAdd.progress > before.progress,
  undoRestoresProgress: undoClicked && afterUndo.progress === before.progress,
  calculatorUpdatesTarget: weightChanged && targetBefore !== targetAfter,
  responsiveOverflow: before.outside,
  runtimeErrors,
  snapshots: { before, afterAdd, afterUndo, targetBefore, targetAfter },
};

socket.close();
console.log(JSON.stringify(result, null, 2));
if (!result.quickAddUpdatesProgress || !result.undoRestoresProgress || !result.calculatorUpdatesTarget || result.responsiveOverflow || runtimeErrors.length) {
  process.exitCode = 1;
}
