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

async function navigate(path) {
  await send("Page.navigate", { url: `http://localhost:3000${path}` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1280, screenHeight: 900 });
await evaluate('localStorage.setItem("joc-session-participant", "admin")');

await navigate("/admin/participants");
const participants = await evaluate(`(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const setInput = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const clickButton = (root, text) => {
    const button = [...root.querySelectorAll("button")].find((item) => item.textContent.includes(text));
    if (!button) throw new Error("Button not found: " + text);
    button.click();
  };
  clickButton(document, "مشارك جديد");
  await wait(100);
  let dialog = document.querySelector('[role="dialog"]');
  setInput(dialog.querySelector("input"), "عضو اختبار");
  await wait(100);
  clickButton(dialog, "حفظ التغييرات");
  await wait(150);
  let row = [...document.querySelectorAll(".admin-table-row")].find((item) => item.textContent.includes("عضو اختبار"));
  const added = Boolean(row);
  row.querySelector('button[aria-label^="تعديل"]').click();
  await wait(100);
  dialog = document.querySelector('[role="dialog"]');
  setInput(dialog.querySelector("input"), "عضو معدل");
  await wait(100);
  clickButton(dialog, "حفظ التغييرات");
  await wait(150);
  row = [...document.querySelectorAll(".admin-table-row")].find((item) => item.textContent.includes("عضو معدل"));
  const edited = Boolean(row);
  row.querySelector('button[aria-label^="حذف"]').click();
  await wait(100);
  dialog = document.querySelector('[role="dialog"]');
  clickButton(dialog, "حذف المشارك");
  await wait(150);
  const deleted = ![...document.querySelectorAll(".admin-table-row")].some((item) => item.textContent.includes("عضو معدل"));
  return { added, edited, deleted };
})()`);

await navigate("/admin/tasks");
const tasks = await evaluate(`(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const setInput = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const clickButton = (root, text) => {
    const button = [...root.querySelectorAll("button")].find((item) => item.textContent.includes(text));
    if (!button) throw new Error("Button not found: " + text);
    button.click();
  };
  clickButton(document, "مهمة جديدة");
  await wait(100);
  let dialog = document.querySelector('[role="dialog"]');
  const inputs = dialog.querySelectorAll("input");
  setInput(inputs[0], "مهمة اختبار");
  setInput(inputs[1], "7");
  await wait(100);
  clickButton(dialog, "حفظ المهمة");
  await wait(150);
  let row = [...document.querySelectorAll(".admin-task-row")].find((item) => item.textContent.includes("مهمة اختبار"));
  const added = Boolean(row);
  row.querySelector('button[aria-label^="تعديل"]').click();
  await wait(100);
  dialog = document.querySelector('[role="dialog"]');
  setInput(dialog.querySelector("input"), "مهمة معدلة");
  await wait(100);
  clickButton(dialog, "حفظ التعديلات");
  await wait(150);
  row = [...document.querySelectorAll(".admin-task-row")].find((item) => item.textContent.includes("مهمة معدلة"));
  const edited = Boolean(row);
  row.querySelector('button[aria-label^="حذف"]').click();
  await wait(100);
  dialog = document.querySelector('[role="dialog"]');
  clickButton(dialog, "حذف المهمة");
  await wait(150);
  const deleted = ![...document.querySelectorAll(".admin-task-row")].some((item) => item.textContent.includes("مهمة معدلة"));
  return { added, edited, deleted };
})()`);

console.log(JSON.stringify({ participants, tasks }));
socket.close();
