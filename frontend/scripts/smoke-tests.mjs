import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
const required = [
  "src/app/(participant)/tasks/[id]/page.tsx",
  "src/app/loading.tsx",
  "src/app/error.tsx",
  "src/app/manifest.ts",
  "src/lib/storage.ts",
  "src/lib/realtime.ts",
  "src/lib/export.ts",
  "src/components/tasks/TaskRegistry.tsx",
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) throw new Error(`Missing required files: ${missing.join(", ")}`);

const participantRoutes = readFileSync(join(root, "src/components/features/ProductPage.tsx"), "utf8");
for (const page of ["dashboard", "tasks", "focus", "reports", "settings", "admin-dashboard"]) {
  if (!participantRoutes.includes(`"${page}"`)) throw new Error(`Product page is not registered: ${page}`);
}

const registry = readFileSync(join(root, "src/components/tasks/TaskRegistry.tsx"), "utf8");
for (const type of ["quran", "prayer", "adhkar", "reading", "sport", "water", "sleep", "general"]) {
  if (!registry.includes(`${type}:`)) throw new Error(`Task type is not registered: ${type}`);
}

console.log(JSON.stringify({ ok: true, checkedFiles: required.length, taskTypes: 8 }));
