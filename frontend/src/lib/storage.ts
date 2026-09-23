import type {
  ActivityEvent,
  AppNotification,
  EncouragementMessage,
  Participant,
  PresenceStatus,
  Task,
  TaskDetail,
  TaskStatus,
} from "@/types/models";

/**
 * Versioned, browser-safe persistence for the local/demo data layer.
 *
 * The adapter deliberately has no React dependency.  A provider can hydrate its
 * own state from `read()` and persist updates with `update()`, while a future
 * API-backed adapter can implement the same `StorageAdapter` contract.
 */

export const JOURNEY_STORAGE_KEY = "journey-of-change/state";
export const JOURNEY_STORAGE_VERSION = 3;

export type ISODateTime = string;

export interface DailyTaskRecord {
  userId: string;
  taskId: string;
  localDate: string;
  status: TaskStatus;
  current: number;
  actualMinutes: number;
  details?: Task["details"];
  awardedPoints?: number;
  detailItems?: TaskDetail[];
  startedAt?: ISODateTime;
  pausedAt?: ISODateTime;
  completedAt?: ISODateTime;
  updatedAt: ISODateTime;
}

export type FocusTimerStatus = "idle" | "running" | "paused" | "completed" | "cancelled";

export interface FocusTimerSnapshot {
  id: string;
  userId: string;
  localDate: string;
  durationSeconds: number;
  elapsedSeconds: number;
  status: FocusTimerStatus;
  startedAt?: ISODateTime;
  pausedAt?: ISODateTime;
  finishedAt?: ISODateTime;
  updatedAt: ISODateTime;
}

export interface FocusSession {
  id: string;
  userId: string;
  localDate: string;
  durationSeconds: number;
  actualSeconds: number;
  startedAt: ISODateTime;
  finishedAt: ISODateTime;
  taskId?: string;
}

export interface ProgressSnapshot {
  userId: string;
  localDate: string;
  percent: number;
  completed: number;
  partial: number;
  remaining: number;
  total: number;
  actualMinutes: number;
  updatedAt: ISODateTime;
}

export interface StreakSnapshot {
  userId: string;
  current: number;
  best: number;
  successfulDays: number;
  history: Array<{
    date: string;
    status: "successful" | "unsuccessful" | "partial" | "today" | "future";
  }>;
  updatedAt: ISODateTime;
}

export interface DayStatusSnapshot {
  userId: string;
  localDate: string;
  status: "not_started" | "started" | "in_progress" | "almost_complete" | "complete";
  updatedAt: ISODateTime;
}

export interface PresenceRecord {
  userId: string;
  name: string;
  status: PresenceStatus;
  currentTaskId?: string;
  currentTaskTitle?: string;
  lastSeenAt: ISODateTime;
  expiresAt: ISODateTime;
}

export interface JourneySettings {
  soundEnabled: boolean;
  quranAyahsPerPage: number;
  theme: "light" | "dark" | "system";
  timezone?: string;
}

export interface JourneySession {
  participantId: string | null;
  signedInAt?: ISODateTime;
}

/**
 * This is the complete local/demo data contract.  Arrays are intentionally
 * normalized by ID (rather than nested by display name) so a backend adapter
 * can replace each collection without changing consuming views.
 */
export interface JourneyPersistedState {
  participants: Participant[];
  tasks: Task[];
  dailyTaskRecords: DailyTaskRecord[];
  focusTimers: FocusTimerSnapshot[];
  focusSessions: FocusSession[];
  progress: ProgressSnapshot[];
  streaks: StreakSnapshot[];
  dayStatuses: DayStatusSnapshot[];
  notifications: AppNotification[];
  /** Feedback already shown to the participant, keyed by stable domain IDs. */
  seenFeedbackIds: string[];
  messages: EncouragementMessage[];
  activity: ActivityEvent[];
  settings: JourneySettings;
  session: JourneySession;
  presence: PresenceRecord[];
}

export interface VersionedEnvelope<T> {
  version: number;
  savedAt: ISODateTime;
  data: T;
}

export type StorageMigration = (value: unknown) => unknown;

export interface VersionedStorageOptions<T> {
  key: string;
  version: number;
  defaults: () => T;
  migrations?: Record<number, StorageMigration>;
  validate?: (value: unknown) => value is T;
  legacyKeys?: string[];
}

export interface StorageAdapter<T> {
  readonly key: string;
  readonly version: number;
  read(): T;
  readEnvelope(): VersionedEnvelope<T> | null;
  write(value: T): void;
  update(updater: (current: T) => T): T;
  reset(): T;
  subscribe(listener: (value: T) => void): () => void;
  destroy(): void;
}

const hasWindow = () => typeof window !== "undefined";

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON for values that structuredClone cannot handle.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function now(): ISODateTime {
  return new Date().toISOString();
}

function getLocalStorage(): Storage | null {
  if (!hasWindow()) return null;

  try {
    const storage = window.localStorage;
    const probeKey = "__joc_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function parseRaw(raw: string): { version: number; data: unknown } {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "object" && parsed !== null && "data" in parsed) {
    const candidate = parsed as { version?: unknown; data: unknown };
    return {
      version: typeof candidate.version === "number" ? candidate.version : 0,
      data: candidate.data,
    };
  }

  // Before versioning, callers may have persisted the data object directly.
  return { version: 0, data: parsed };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** A conservative runtime guard used after migrations and JSON parsing. */
export function isJourneyPersistedState(value: unknown): value is JourneyPersistedState {
  if (!isRecord(value)) return false;

  const arrayKeys = [
    "participants",
    "tasks",
    "dailyTaskRecords",
    "focusTimers",
    "focusSessions",
    "progress",
    "streaks",
    "dayStatuses",
    "notifications",
    "messages",
    "activity",
    "presence",
  ] as const;

  if (arrayKeys.some((key) => !Array.isArray(value[key]))) return false;
  if (!isRecord(value.settings) || !isRecord(value.session)) return false;
  if (typeof value.settings.soundEnabled !== "boolean") return false;
  if (value.settings.theme !== "light" && value.settings.theme !== "dark" && value.settings.theme !== "system") {
    return false;
  }
  return value.session.participantId === null || typeof value.session.participantId === "string";
}

export function createEmptyJourneyState(): JourneyPersistedState {
  return {
    participants: [],
    tasks: [],
    dailyTaskRecords: [],
    focusTimers: [],
    focusSessions: [],
    progress: [],
    streaks: [],
    dayStatuses: [],
    notifications: [],
    seenFeedbackIds: [],
    messages: [],
    activity: [],
    settings: { soundEnabled: true, quranAyahsPerPage: 5, theme: "light" },
    session: { participantId: null },
    presence: [],
  };
}

/**
 * Create a generic versioned localStorage adapter.  All browser APIs are
 * resolved lazily, making this safe to import from a server component.
 */
export function createVersionedStorage<T>(options: VersionedStorageOptions<T>): StorageAdapter<T> {
  const listeners = new Set<(value: T) => void>();
  const storageEvent = (event: StorageEvent) => {
    if (event.key !== options.key || !event.newValue) return;
    const envelope = decode(event.newValue);
    if (envelope) notify(envelope.data);
  };

  let listening = false;

  function ensureListener() {
    if (!hasWindow() || listening) return;
    window.addEventListener("storage", storageEvent);
    listening = true;
  }

  function decode(raw: string): VersionedEnvelope<T> | null {
    try {
      const parsed = parseRaw(raw);
      let value = parsed.data;
      let version = parsed.version;

      while (version < options.version) {
        const migration = options.migrations?.[version + 1] ?? options.migrations?.[version];
        if (!migration) throw new Error(`Missing migration for ${options.key} v${version} → v${options.version}`);
        value = migration(value);
        version += 1;
      }

      if (version > options.version) throw new Error(`Unsupported ${options.key} version ${version}`);
      if (options.validate && !options.validate(value)) throw new Error(`Invalid data for ${options.key}`);

      return { version: options.version, savedAt: now(), data: clone(value) as T };
    } catch {
      return null;
    }
  }

  function notify(value: T) {
    const snapshot = clone(value);
    listeners.forEach((listener) => listener(snapshot));
  }

  function readEnvelope(): VersionedEnvelope<T> | null {
    const storage = getLocalStorage();
    if (!storage) return null;

    const keys = [options.key, ...(options.legacyKeys ?? [])];
    for (const key of keys) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const envelope = decode(raw);
      if (envelope) return envelope;

      // Keep corrupt data available for debugging, but never let it break the UI.
      try {
        storage.setItem(`${key}.corrupt.${Date.now()}`, raw);
        storage.removeItem(key);
      } catch {
        // Quota/private-mode errors are intentionally ignored.
      }
    }

    return null;
  }

  function read(): T {
    return clone(readEnvelope()?.data ?? options.defaults());
  }

  function write(value: T) {
    const next = clone(value);
    const envelope: VersionedEnvelope<T> = { version: options.version, savedAt: now(), data: next };
    const storage = getLocalStorage();

    if (storage) {
      try {
        storage.setItem(options.key, JSON.stringify(envelope));
      } catch {
        // A full or restricted localStorage must not prevent in-memory updates.
      }
    }

    notify(next);
  }

  function update(updater: (current: T) => T): T {
    const next = updater(read());
    write(next);
    return clone(next);
  }

  function reset(): T {
    const next = clone(options.defaults());
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.removeItem(options.key);
      } catch {
        // Ignore storage restrictions; listeners still receive the reset value.
      }
    }
    notify(next);
    return next;
  }

  function subscribe(listener: (value: T) => void) {
    ensureListener();
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function destroy() {
    if (hasWindow() && listening) window.removeEventListener("storage", storageEvent);
    listening = false;
    listeners.clear();
  }

  function decodeForRead(): VersionedEnvelope<T> | null {
    return readEnvelope();
  }

  return {
    key: options.key,
    version: options.version,
    read,
    readEnvelope: decodeForRead,
    write,
    update,
    reset,
    subscribe,
    destroy,
  };
}

const journeyMigrations: Record<number, StorageMigration> = {
  // v1 is the first persisted schema.  This migration accepts a partially
  // shaped object from an early demo build and fills missing domains safely.
  1: (value) => {
    const source = isRecord(value) ? value : {};
    const defaults = createEmptyJourneyState();
    return {
      ...defaults,
      ...source,
      settings: { ...defaults.settings, ...(isRecord(source.settings) ? source.settings : {}) },
      session: { ...defaults.session, ...(isRecord(source.session) ? source.session : {}) },
    };
  },
  2: (value) => {
    const source = isRecord(value) ? value : {};
    const migratedAt = new Date().toISOString();
    const withCreatedAt = (items: unknown) => Array.isArray(items)
      ? items.map((item) => isRecord(item) ? { ...item, createdAt: typeof item.createdAt === "string" ? item.createdAt : migratedAt } : item)
      : [];
    return {
      ...source,
      activity: withCreatedAt(source.activity),
      notifications: withCreatedAt(source.notifications),
      messages: withCreatedAt(source.messages),
    };
  },
  3: (value) => {
    const source = isRecord(value) ? value : {};
    return {
      ...source,
      seenFeedbackIds: Array.isArray(source.seenFeedbackIds)
        ? source.seenFeedbackIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  },
};

export function createJourneyStorage(options: Partial<VersionedStorageOptions<JourneyPersistedState>> = {}) {
  return createVersionedStorage<JourneyPersistedState>({
    key: JOURNEY_STORAGE_KEY,
    version: JOURNEY_STORAGE_VERSION,
    defaults: createEmptyJourneyState,
    migrations: journeyMigrations,
    validate: isJourneyPersistedState,
    ...options,
  });
}

/** A shared lazy adapter for providers that do not need a custom key. */
export const journeyStorage = createJourneyStorage();

export function readJourneyState(): JourneyPersistedState {
  return journeyStorage.read();
}

export function writeJourneyState(state: JourneyPersistedState): void {
  journeyStorage.write(state);
}

export function updateJourneyState(
  updater: (current: JourneyPersistedState) => JourneyPersistedState,
): JourneyPersistedState {
  return journeyStorage.update(updater);
}
