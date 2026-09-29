import { writeFile } from "node:fs/promises";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const debugPort = Number(process.env.E2E_DEBUG_PORT ?? 9228);
const width = Number(process.env.E2E_WIDTH ?? 390);
const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl));
if (!page) throw new Error("No local browser page target found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
let requestId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
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

function send(method, params = {}) {
  const id = ++requestId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch {
      // Navigation may replace the execution context while loading.
    }
    await sleep(120);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function navigate(path, heading) {
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(`location.pathname === ${JSON.stringify(path)} && document.querySelector('main h1')?.textContent?.includes(${JSON.stringify(heading)})`, path);
}

const taskTitle = "اختبار رحلة الواجهة";
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width <= 620 });
  await navigate("/login", "مرحبًا");
  await evaluate('localStorage.clear(); localStorage.setItem("joc-session-participant", "admin"); true');
  await navigate("/admin/tasks/new", "إضافة مهمة تفصيلية");
  await sleep(300);

  await evaluate(`(() => {
    [...document.querySelectorAll('button')].find((button) => button.textContent.includes('إنشاء المهمة') && button.getClientRects().length > 0)?.click();
    return true;
  })()`);
  await waitFor(`document.querySelector('#task-editor-error')?.textContent?.includes('اسم المهمة')`, "required task title validation");

  await evaluate(`document.querySelector('button[aria-label="إسناد المهمة"]')?.click(); true`);
  await waitFor(` [...document.querySelectorAll('[role="option"]')].some((option) => option.textContent.includes('مشاركون محددون'))`, "assignment options");
  await evaluate(`[...document.querySelectorAll('[role="option"]')].find((option) => option.textContent.includes('مشاركون محددون'))?.click(); true`);
  await waitFor(` [...document.querySelectorAll('#task-schedule label')].some((label) => label.textContent.includes('رازي') && label.querySelector('input[type="checkbox"]'))`, "participant checkboxes");
  const adminExcluded = await evaluate(`![...document.querySelectorAll('#task-schedule label')].some((label) => label.textContent.includes('المشرف'))`);
  if (!adminExcluded) throw new Error("Admin account appeared in task assignees");
  await evaluate(`[...document.querySelectorAll('#task-schedule label')].find((label) => label.textContent.includes('رازي'))?.querySelector('input')?.click(); true`);

  const titleEntered = await evaluate(`(() => {
    const input = [...document.querySelectorAll('label')].find((label) => label.textContent.includes('اسم المهمة *'))?.querySelector('input');
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(taskTitle)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  if (!titleEntered) throw new Error("Task title field was not found");
  await waitFor(`document.querySelector('[aria-label="ملخص المهمة قبل الحفظ"] h2')?.textContent === ${JSON.stringify(taskTitle)}`, "task preview update");
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('إنشاء المهمة') && button.getClientRects().length > 0)?.click(); true`);
  await waitFor(`location.pathname === '/admin/tasks' && [...document.querySelectorAll('article')].some((card) => card.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)})`, "created task card");

  const createdId = await evaluate(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    return card?.querySelector('a[href$="/edit"]')?.getAttribute('href')?.split('/')[3];
  })()`);
  if (!createdId) throw new Error("Created task ID was not found");

  await evaluate(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    card?.querySelector('button[aria-label^="نسخ"]')?.click();
    return true;
  })()`);
  await waitFor(` [...document.querySelectorAll('article h2')].some((heading) => heading.textContent === ${JSON.stringify(`${taskTitle} (نسخة)`)})`, "duplicated task");

  await evaluate(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    card?.querySelector('button[aria-label^="أرشفة"]')?.click();
    return true;
  })()`);
  await waitFor(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    return card?.textContent?.includes('مؤرشفة');
  })()`, "archived task");
  await evaluate(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    card?.querySelector('button[aria-label^="استعادة"]')?.click();
    return true;
  })()`);
  await waitFor(`(() => {
    const card = [...document.querySelectorAll('article')].find((item) => item.querySelector('h2')?.textContent === ${JSON.stringify(taskTitle)});
    return card?.textContent?.includes('نشطة');
  })()`, "restored task");

  await evaluate('localStorage.setItem("joc-session-participant", "noura"); true');
  await navigate("/tasks", "مهامي");
  if (await evaluate(`document.body.innerText.includes(${JSON.stringify(taskTitle)})`)) throw new Error("Assigned task appeared for an unrelated participant");
  await evaluate('localStorage.setItem("joc-session-participant", "razi"); true');
  await navigate("/tasks", "مهامي");
  await waitFor(`document.body.innerText.includes(${JSON.stringify(taskTitle)})`, "participant task visibility");
  await navigate(`/tasks/${createdId}`, taskTitle);
  await waitFor(` [...document.querySelectorAll('main button')].some((button) => button.textContent.includes('سجّل مرة'))`, "task progress action");
  await evaluate(`(() => { [...document.querySelectorAll('main button')].find((button) => button.textContent.includes('سجّل مرة'))?.click(); return true; })()`);
  await waitFor(`document.querySelector('.task-execution-progress strong')?.textContent?.includes('1 / 1')`, "task progress update");
  await send("Page.reload");
  await waitFor(`document.querySelector('.task-execution-progress strong')?.textContent?.includes('1 / 1')`, "persisted task progress");

  await navigate("/ai", "المحادثات");
  await waitFor(`Boolean(document.querySelector('[aria-label="أسئلة للبدء"] button'))`, "assistant starter actions");
  if (process.env.E2E_SCREENSHOT) {
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(process.env.E2E_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  await evaluate(`document.querySelector('[aria-label="أسئلة للبدء"] button')?.click(); true`);
  await waitFor(`!document.querySelector('[aria-label="أسئلة للبدء"]')`, "assistant first message");

  await evaluate('localStorage.setItem("joc-session-participant", "admin"); true');
  await navigate("/admin/reports", "التقارير والتحليلات");
  await waitFor(` [...document.querySelectorAll('button')].some((button) => button.textContent.includes('حفظ التقرير الحالي') && !button.disabled)`, "savable admin report");
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('حفظ التقرير الحالي')); button.scrollIntoView(); button.click(); return true; })()`);
  await waitFor(`document.querySelectorAll('.report-saved-item').length === 1`, "saved report entry");
  await send("Page.reload");
  await waitFor(`document.querySelectorAll('.report-saved-item').length === 1`, "persisted report entry");
  await evaluate(`document.querySelector('.report-saved-item button:last-child')?.click(); true`);
  await waitFor(`document.querySelectorAll('.report-saved-item').length === 0`, "removed report entry");

  console.log(JSON.stringify({ ok: true, width, createdId, checks: ["validation", "assignment", "create", "duplicate", "archive", "restore", "participant visibility", "progress persistence", "assistant starter", "report save", "report persistence", "report delete"] }));
} finally {
  socket.close();
}
