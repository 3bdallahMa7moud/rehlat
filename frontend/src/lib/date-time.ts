/** Central project clock and calendar helpers. */
export const PROJECT_TIMEZONE = "Asia/Riyadh";

type DateInput = Date | string | number;

function asDate(value: DateInput = new Date()): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parts(value: DateInput = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: PROJECT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  return Object.fromEntries(formatter.formatToParts(asDate(value)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function getProjectNow(): Date { return new Date(); }

export function getProjectDateKey(value: DateInput = getProjectNow()): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const projectParts = parts(value);
  return `${projectParts.year}-${projectParts.month}-${projectParts.day}`;
}

export function getProjectDayStart(value: DateInput = getProjectNow()): Date {
  const [year, month, day] = getProjectDateKey(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000);
}

export function isSameProjectDay(left: DateInput, right: DateInput): boolean { return getProjectDateKey(left) === getProjectDateKey(right); }

export function formatProjectDate(value: DateInput, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("ar-EG", { timeZone: PROJECT_TIMEZONE, day: "numeric", month: "long", hour: "numeric", minute: "2-digit", ...options }).format(asDate(value));
}

/** A date-only label for the dashboard, aligned with the project's daily records. */
export function formatDashboardDate(value: DateInput = getProjectNow()): string {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: PROJECT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(asDate(value));
}

export function formatRelativeTime(value: DateInput, now: DateInput = getProjectNow()): string {
  const date = asDate(value); const current = asDate(now);
  const deltaSeconds = Math.max(0, Math.floor((current.getTime() - date.getTime()) / 1000));
  if (deltaSeconds < 60) return "الآن";
  if (deltaSeconds < 3600) return `منذ ${Math.floor(deltaSeconds / 60)} دقيقة`;
  if (isSameProjectDay(date, current)) return `منذ ${Math.floor(deltaSeconds / 3600)} ساعة`;
  const yesterday = new Date(current.getTime() - 86_400_000);
  if (isSameProjectDay(date, yesterday)) return `أمس، ${new Intl.DateTimeFormat("ar-EG", { timeZone: PROJECT_TIMEZONE, hour: "numeric", minute: "2-digit" }).format(date)}`;
  return formatProjectDate(date);
}

export function getProjectTimestamp(): string { return getProjectNow().toISOString(); }
