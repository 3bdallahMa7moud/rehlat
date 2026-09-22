import type {
  ActivityEvent,
  AppNotification,
  EncouragementMessage,
  PresenceStatus,
  Task,
} from "@/types/models";
import type {
  DailyTaskRecord,
  FocusTimerSnapshot,
  JourneyPersistedState,
  PresenceRecord,
  ProgressSnapshot,
  StreakSnapshot,
} from "@/lib/storage";

/**
 * Events shared by the local adapter and a future WebSocket/SSE adapter.
 * Keeping the payload map centralized prevents each view from inventing a
 * different event shape.
 */
export interface RealtimePayloadMap {
  "state.changed": {
    state?: Partial<JourneyPersistedState>;
    changedDomains: string[];
    revision?: number;
  };
  "task.updated": {
    record: DailyTaskRecord;
    task?: Task;
  };
  "progress.updated": {
    snapshot: ProgressSnapshot;
  };
  "streak.updated": {
    snapshot: StreakSnapshot;
  };
  "notification.created": {
    notification: AppNotification;
    recipientId?: string;
  };
  "message.created": {
    message: EncouragementMessage;
    recipientId?: string;
  };
  "activity.created": {
    event: ActivityEvent;
  };
  "presence.updated": {
    presence: PresenceRecord;
  };
  "session.updated": {
    participantId: string | null;
  };
  "focus.updated": {
    timer: FocusTimerSnapshot;
  };
  ping: {
    sentAt: string;
  };
}

export type RealtimeEventType = keyof RealtimePayloadMap;

export interface RealtimeEvent<K extends RealtimeEventType = RealtimeEventType> {
  id: string;
  type: K;
  payload: RealtimePayloadMap[K];
  origin: string;
  channel: string;
  sentAt: string;
}

export type AnyRealtimeEvent = {
  [K in RealtimeEventType]: RealtimeEvent<K>;
}[RealtimeEventType];

export type RealtimeStatus = "disconnected" | "connecting" | "connected" | "unavailable";

export interface RealtimeAdapter {
  readonly channelName: string;
  connect(): void;
  disconnect(): void;
  getStatus(): RealtimeStatus;
  onStatusChange(listener: (status: RealtimeStatus) => void): () => void;
  publish<K extends RealtimeEventType>(type: K, payload: RealtimePayloadMap[K]): RealtimeEvent<K>;
  subscribe<K extends RealtimeEventType>(type: K, listener: (event: RealtimeEvent<K>) => void): () => void;
  subscribeAll(listener: (event: AnyRealtimeEvent) => void): () => void;
}

export interface LocalRealtimeAdapterOptions {
  channelName?: string;
  /** Override the generated tab ID in tests or an embedding shell. */
  originId?: string;
}

const REALTIME_TYPES: ReadonlySet<string> = new Set([
  "state.changed",
  "task.updated",
  "progress.updated",
  "streak.updated",
  "notification.created",
  "message.created",
  "activity.created",
  "presence.updated",
  "session.updated",
  "focus.updated",
  "ping",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

function createId(prefix: string): string {
  const uuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function isRealtimeEvent(value: unknown): value is AnyRealtimeEvent {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AnyRealtimeEvent>;
  return typeof candidate.id === "string"
    && typeof candidate.type === "string"
    && REALTIME_TYPES.has(candidate.type)
    && typeof candidate.origin === "string"
    && typeof candidate.channel === "string"
    && typeof candidate.sentAt === "string"
    && typeof candidate.payload === "object"
    && candidate.payload !== null;
}

/**
 * BroadcastChannel first, localStorage events as a fallback.  The adapter
 * always dispatches locally as well, so a provider does not have to wait for a
 * browser round trip before its own UI updates.
 */
export class LocalRealtimeAdapter implements RealtimeAdapter {
  readonly channelName: string;

  private readonly originId: string;
  private readonly eventStorageKey: string;
  private readonly listeners = new Map<RealtimeEventType, Set<(event: AnyRealtimeEvent) => void>>();
  private readonly allListeners = new Set<(event: AnyRealtimeEvent) => void>();
  private readonly statusListeners = new Set<(status: RealtimeStatus) => void>();
  private readonly seenEventIds = new Set<string>();
  private channel: BroadcastChannel | null = null;
  private status: RealtimeStatus = "disconnected";
  private connected = false;
  private sequence = 0;

  constructor(options: LocalRealtimeAdapterOptions = {}) {
    this.channelName = options.channelName ?? "journey-of-change:realtime";
    this.originId = options.originId ?? createId("tab");
    this.eventStorageKey = `${this.channelName}:event`;
  }

  connect() {
    if (this.connected) return;

    if (!isBrowser()) {
      this.setStatus("unavailable");
      return;
    }

    this.setStatus("connecting");
    try {
      if (typeof BroadcastChannel !== "undefined") {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.addEventListener("message", this.onChannelMessage);
      }
    } catch {
      this.channel = null;
    }

    // Listen even when BroadcastChannel exists so a tab using the fallback can
    // still interoperate with another tab (for example in a private window).
    window.addEventListener("storage", this.onStorageMessage);
    this.connected = true;
    this.setStatus("connected");
  }

  disconnect() {
    if (!this.connected && this.status !== "unavailable") return;
    if (isBrowser()) window.removeEventListener("storage", this.onStorageMessage);
    this.channel?.removeEventListener("message", this.onChannelMessage);
    this.channel?.close();
    this.channel = null;
    this.connected = false;
    this.setStatus("disconnected");
  }

  getStatus() {
    return this.status;
  }

  onStatusChange(listener: (status: RealtimeStatus) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  publish<K extends RealtimeEventType>(type: K, payload: RealtimePayloadMap[K]): RealtimeEvent<K> {
    if (!this.connected && this.status !== "unavailable") this.connect();

    const event: RealtimeEvent<K> = {
      id: `${this.originId}:${Date.now().toString(36)}:${(this.sequence += 1).toString(36)}`,
      type,
      payload,
      origin: this.originId,
      channel: this.channelName,
      sentAt: new Date().toISOString(),
    };

    this.dispatch(event as AnyRealtimeEvent);

    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Local dispatch already happened; a failed cross-tab post is safe.
      }
    } else if (isBrowser()) {
      try {
        window.localStorage.setItem(this.eventStorageKey, JSON.stringify(event));
        window.localStorage.removeItem(this.eventStorageKey);
      } catch {
        // Private mode or quota limits only disable cross-tab delivery.
      }
    }

    return event;
  }

  subscribe<K extends RealtimeEventType>(type: K, listener: (event: RealtimeEvent<K>) => void) {
    this.connect();
    const listeners = this.listeners.get(type) ?? new Set<(event: AnyRealtimeEvent) => void>();
    const wrapped = (event: AnyRealtimeEvent) => listener(event as RealtimeEvent<K>);
    listeners.add(wrapped);
    this.listeners.set(type, listeners);
    return () => listeners.delete(wrapped);
  }

  subscribeAll(listener: (event: AnyRealtimeEvent) => void) {
    this.connect();
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  }

  destroy() {
    this.disconnect();
    this.listeners.clear();
    this.allListeners.clear();
    this.statusListeners.clear();
    this.seenEventIds.clear();
  }

  private readonly onChannelMessage = (message: MessageEvent<unknown>) => {
    this.accept(message.data);
  };

  private readonly onStorageMessage = (event: StorageEvent) => {
    if (event.key !== this.eventStorageKey || !event.newValue) return;
    try {
      this.accept(JSON.parse(event.newValue) as unknown);
    } catch {
      // Ignore malformed events from older/corrupt tabs.
    }
  };

  private accept(value: unknown) {
    if (!isRealtimeEvent(value)) return;
    if (value.channel !== this.channelName || this.seenEventIds.has(value.id)) return;
    this.dispatch(value);
  }

  private dispatch(event: AnyRealtimeEvent) {
    this.seenEventIds.add(event.id);
    // Keep the de-duplication set bounded during a long-lived tab session.
    if (this.seenEventIds.size > 500) {
      const oldest = this.seenEventIds.values().next().value as string | undefined;
      if (oldest) this.seenEventIds.delete(oldest);
    }

    this.listeners.get(event.type)?.forEach((listener) => listener(event));
    this.allListeners.forEach((listener) => listener(event));
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export function createLocalRealtimeAdapter(options: LocalRealtimeAdapterOptions = {}): LocalRealtimeAdapter {
  return new LocalRealtimeAdapter(options);
}

/** Shared adapter for the default local/demo channel. */
export const localRealtime = createLocalRealtimeAdapter();

export interface PresenceIdentity {
  userId: string;
  name: string;
}

export interface PresenceAdapter {
  connect(identity: PresenceIdentity): void;
  disconnect(): void;
  update(status: PresenceStatus, details?: Pick<PresenceRecord, "currentTaskId" | "currentTaskTitle">): void;
  getSnapshot(): PresenceRecord[];
  subscribe(listener: (presence: PresenceRecord[]) => void): () => void;
  destroy(): void;
}

export interface LocalPresenceAdapterOptions {
  realtime?: RealtimeAdapter;
  heartbeatMs?: number;
  ttlMs?: number;
}

/**
 * Small local presence layer used by the "المتصلون الآن" view.  It is honest
 * about scope: BroadcastChannel/storage events synchronize tabs in one
 * browser profile; a backend presence service is still needed across devices.
 */
export class LocalPresenceAdapter implements PresenceAdapter {
  private readonly realtime: RealtimeAdapter;
  private readonly heartbeatMs: number;
  private readonly ttlMs: number;
  private readonly records = new Map<string, PresenceRecord>();
  private readonly listeners = new Set<(presence: PresenceRecord[]) => void>();
  private unsubscribeRealtime: (() => void) | null = null;
  private heartbeat: number | null = null;
  private identity: PresenceIdentity | null = null;

  constructor(options: LocalPresenceAdapterOptions = {}) {
    this.realtime = options.realtime ?? localRealtime;
    this.heartbeatMs = Math.max(5_000, options.heartbeatMs ?? 15_000);
    this.ttlMs = Math.max(this.heartbeatMs * 2, options.ttlMs ?? 45_000);
  }

  connect(identity: PresenceIdentity) {
    this.disconnect(false);
    this.identity = identity;
    this.unsubscribeRealtime = this.realtime.subscribe("presence.updated", (event) => {
      this.records.set(event.payload.presence.userId, event.payload.presence);
      this.pruneExpired();
      this.notify();
    });
    this.realtime.connect();
    this.update("active");
    if (typeof window !== "undefined") {
      this.heartbeat = window.setInterval(() => this.update("active"), this.heartbeatMs);
    }
  }

  disconnect(publishOffline = true) {
    if (publishOffline && this.identity) this.update("offline");
    if (this.heartbeat !== null && typeof window !== "undefined") window.clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;
    this.identity = null;
  }

  update(status: PresenceStatus, details: Pick<PresenceRecord, "currentTaskId" | "currentTaskTitle"> = {}) {
    if (!this.identity) return;
    const currentTime = Date.now();
    const presence: PresenceRecord = {
      userId: this.identity.userId,
      name: this.identity.name,
      status,
      ...details,
      lastSeenAt: new Date(currentTime).toISOString(),
      expiresAt: new Date(currentTime + this.ttlMs).toISOString(),
    };
    this.records.set(presence.userId, presence);
    this.notify();
    this.realtime.publish("presence.updated", { presence });
  }

  getSnapshot() {
    this.pruneExpired();
    return Array.from(this.records.values()).sort((left, right) => left.name.localeCompare(right.name, "ar"));
  }

  subscribe(listener: (presence: PresenceRecord[]) => void) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.disconnect();
    this.records.clear();
    this.listeners.clear();
  }

  private pruneExpired() {
    const timestamp = Date.now();
    this.records.forEach((record, userId) => {
      if (record.status !== "offline" && new Date(record.expiresAt).getTime() < timestamp) {
        this.records.set(userId, { ...record, status: "offline" });
      }
    });
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export function createLocalPresenceAdapter(options: LocalPresenceAdapterOptions = {}): LocalPresenceAdapter {
  return new LocalPresenceAdapter(options);
}

export type { PresenceRecord };
