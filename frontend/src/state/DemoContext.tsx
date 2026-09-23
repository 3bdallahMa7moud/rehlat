"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { activityEvents, achievements, aiSuggestions, encouragements, initialAiMessages, initialTasks, notifications as initialNotifications, participants as initialParticipants, recentParticipantIds, streak, titles } from "@/mocks";
import type { AIConversation, AIConversationState, Achievement, ActivityEvent, AppNotification, DayStatus, EncouragementMessage, Participant, RankingEntry, Report, Streak, Task, TaskCategory, TaskStatus, TaskType, Title } from "@/types/models";
import { journeyStorage, type DailyTaskRecord, type FocusSession, type FocusTimerSnapshot, type JourneyPersistedState } from "@/lib/storage";
import { createLocalPresenceAdapter, localRealtime, type PresenceRecord, type RealtimeStatus } from "@/lib/realtime";
import { calculateProgress } from "@/lib/progress";
import { getAchievementFeedback, getUnseenAchievementFeedback } from "@/lib/achievement-feedback";
import { celebrate } from "@/lib/celebrate";
import { getDayCompletionFeedback, getTaskDetailOutcomeFeedback, getTaskOutcomeFeedback, toToastTone } from "@/lib/feedback";
import { calculateReports } from "@/lib/reports";
import { calculateStreakFromProgress } from "@/lib/streak";
import { getTaskEarnedPoints } from "@/lib/points";
import { getTaskDetailElapsedSeconds, getTaskElapsedSeconds, normalizeTask } from "@/lib/task-details";
import { calculateTaskStreaks, getGeneralStreakTitle, type StreakTitle, type TaskStreakEntry } from "@/lib/task-streaks";
import { getProjectDateKey, getProjectTimestamp } from "@/lib/date-time";
import { playJourneySound } from "@/lib/sound";
import { createLocalId } from "@/data/local-id";
import { verifyLocalPin } from "@/features/auth/local-auth";
import { createActivityEvent } from "@/domain/activity/activity-factory";
import { createNotification } from "@/domain/notifications/notification-factory";
import { addParticipant as addParticipantToList, changeParticipantRole, deleteParticipant as deleteParticipantFromList, renameParticipant, setParticipantPin as setParticipantPinInList } from "@/domain/participants/participant-domain";
import { cancelFocusTimer, chooseFocusDuration as chooseFocusTimerDuration, createFocusTimer, finishFocusTimer, getFocusElapsedSeconds, pauseFocusTimer, resumeFocusTimer, startFocusTimer } from "@/domain/focus/focus-domain";
import { completeAllTasks, completeTaskOutcome, deriveDayStatus, transitionTaskDetail, transitionTaskStatus, updateMeasuredTaskProgress } from "@/domain/tasks/task-domain";
import { mockAIAdapter } from "@/data/ai/mock-ai-adapter";
import { readLocalAiHistory, writeLocalAiHistory } from "@/data/ai/local-ai-history";
import { getLocalSessionParticipantId, setLocalSessionParticipantId, subscribeToLocalSession } from "@/data/session/local-session";

type CompletionOutcome = "completed" | "partial" | "not_completed" | "closed";
type ToastTone = "success" | "warning" | "info" | "error";

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
  icon?: "achievement" | "milestone" | "title";
}

interface FocusState {
  duration: number;
  secondsLeft: number;
  isRunning: boolean;
  status: FocusTimerSnapshot["status"];
  elapsedSeconds: number;
}

interface DemoContextValue {
  participants: Participant[];
  activeParticipant: Participant;
  selectedParticipantId: string;
  setSelectedParticipantId: (id: string) => void;
  sessionReady: boolean;
  isAuthenticated: boolean;
  loginParticipant: (participantId: string, pin: string) => boolean;
  quickLogin: (participantId: string) => boolean;
  logout: () => void;
  dayStatus: DayStatus;
  tasks: Task[];
  activity: ActivityEvent[];
  rankings: RankingEntry[];
  reports: Record<Report["period"], Report>;
  historyDays: Array<{ date: string; label: string; progress: number; minutes: number; status: string; streak: number }>;
  streakData: Streak;
  generalStreakTitle: StreakTitle;
  taskStreaks: TaskStreakEntry[];
  achievements: Achievement[];
  titles: Title[];
  encouragements: EncouragementMessage[];
  aiSuggestions: string[];
  recentParticipantIds: string[];
  notifications: AppNotification[];
  ai: AIConversationState;
  aiConversations: AIConversation[];
  activeAiConversationId: string;
  focus: FocusState;
  soundEnabled: boolean;
  quranAyahsPerPage: number;
  progress: { percent: number; completed: number; partial: number; remaining: number; total: number; actualMinutes: number };
  startDay: () => void;
  endDay: () => void;
  finishAllTasks: () => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  completeTask: (taskId: string, outcome: CompletionOutcome) => void;
  startTaskDetail: (taskId: string, detailId: string) => void;
  pauseTaskDetail: (taskId: string, detailId: string) => void;
  completeTaskDetail: (taskId: string, detailId: string, outcome: "completed" | "partial" | "not_completed") => void;
  updateTaskProgress: (taskId: string, current: number) => void;
  updateTaskDetails: (taskId: string, details: NonNullable<Task["details"]>) => void;
  chooseFocusDuration: (minutes: number) => void;
  startFocus: () => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  finishFocus: () => void;
  cancelFocus: () => void;
  dismissNotification: (id: string) => void;
  markNotificationsRead: () => void;
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  openAi: () => void;
  closeAi: () => void;
  sendAiMessage: (message: string) => void;
  triggerAiError: () => void;
  clearAiError: () => void;
  clearAiConversation: () => void;
  startAiConversation: () => void;
  selectAiConversation: (conversationId: string) => void;
  deleteAiConversation: (conversationId: string) => void;
  toggleSound: () => void;
  setQuranAyahsPerPage: (value: number) => void;
  addParticipant: (name: string, pin?: string) => void;
  editParticipantName: (id: string, name: string) => void;
  setParticipantRole: (id: string, role: Participant["role"]) => void;
  deleteParticipant: (id: string) => void;
  resetParticipantPin: (id: string) => void;
  setParticipantPin: (id: string, pin: string) => boolean;
  changeOwnPin: (currentPin: string, nextPin: string) => { ok: boolean; error?: string };
  saveTaskDefinition: (taskId: string | null, input: TaskDefinitionInput) => void;
  deleteTask: (taskId: string) => void;
  sendEncouragement: (recipientId: string, message: string) => boolean;
  clearData: (scope: "day" | "week" | "month" | "history" | "participant" | "all", participantId?: string) => void;
  getParticipantTasks: (participantId: string) => Task[];
  restoreClearedData: () => boolean;
  canRestoreClearedData: boolean;
  presence: PresenceRecord[];
  realtimeStatus: RealtimeStatus;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export interface TaskDefinitionInput {
  title: string;
  category: TaskCategory;
  type: TaskType;
  target: number;
  unit: string;
  fullPoints: number;
  partialPoints?: number;
}


function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDate(date = new Date()) { return getProjectDateKey(date); }
function nowIso() { return getProjectTimestamp(); }
function defaultFocus(userId: string, date: string) { return createFocusTimer(userId, date, nowIso()); }
const focusElapsed = getFocusElapsedSeconds;

function newAiConversation(messages = initialAiMessages): AIConversation {
  return {
    id: createLocalId("chat"),
    title: messages.find((message) => message.role === "user")?.content.slice(0, 42) || "محادثة جديدة",
    updatedAt: nowIso(),
    messages: [...messages],
  };
}


function recordsFor(state: JourneyPersistedState, userId: string, date: string) {
  return state.dailyTaskRecords.filter((record) => record.userId === userId && record.localDate === date);
}

function blankTaskState(task: Task): Task {
  return { ...task, current: 0, actualMinutes: 0, status: "not_started" };
}

function applyRecords(definitions: Task[], records: DailyTaskRecord[]) {
  const byTask = new Map(records.map((record) => [record.taskId, record]));
  return definitions.map((task) => {
    const record = byTask.get(task.id);
    return record ? { ...task, current: record.current, actualMinutes: record.actualMinutes, status: record.status, details: record.details ?? task.details, awardedPoints: record.awardedPoints ?? 0, detailItems: record.detailItems ?? task.detailItems } : blankTaskState(task);
  });
}


function emptyJourneySnapshot(): JourneyPersistedState {
  return {
    participants: initialParticipants,
    tasks: initialTasks.map(normalizeTask),
    dailyTaskRecords: [],
    focusTimers: [],
    focusSessions: [],
    progress: [],
    streaks: [],
    dayStatuses: [],
    notifications: initialNotifications,
    seenFeedbackIds: [],
    messages: encouragements,
    activity: activityEvents,
    settings: { soundEnabled: true, quranAyahsPerPage: 5, theme: "light" },
    session: { participantId: null },
    presence: [],
  };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [selectedParticipantId, setSelectedParticipantId] = useState("razi");
  const sessionParticipantId = useSyncExternalStore(subscribeToLocalSession, getLocalSessionParticipantId, () => undefined);
  const sessionReady = sessionParticipantId !== undefined;
  const [hydrated, setHydrated] = useState(false);
  const [dayStatus, setDayStatus] = useState<DayStatus>("in_progress");
  const [taskDefinitions, setTaskDefinitions] = useState<Task[]>(() => initialTasks.map(normalizeTask));
  const [tasks, setTasks] = useState(() => initialTasks.map(normalizeTask));
  const [tasksOwnerId, setTasksOwnerId] = useState("razi");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [seenFeedbackIds, setSeenFeedbackIds] = useState<string[]>([]);
  const [activity, setActivity] = useState(activityEvents);
  const [encouragementMessages, setEncouragementMessages] = useState(encouragements);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quranAyahsPerPage, setQuranAyahsPerPageState] = useState(5);
  const [focusTimer, setFocusTimer] = useState<FocusTimerSnapshot>(() => defaultFocus("razi", localDate()));
  const [focusTick, setFocusTick] = useState(0);
  const [progressHistory, setProgressHistory] = useState<JourneyPersistedState["progress"]>([]);
  const [dailyTaskRecords, setDailyTaskRecords] = useState<JourneyPersistedState["dailyTaskRecords"]>([]);
  const [streakData, setStreakData] = useState<Streak>(streak);
  const [clearBackup, setClearBackup] = useState<JourneyPersistedState | null>(null);
  const [presence, setPresence] = useState<PresenceRecord[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
  const [ai, setAi] = useState<AIConversationState>({ messages: initialAiMessages, isOpen: false, isTyping: false });
  const [aiConversations, setAiConversations] = useState<AIConversation[]>(() => [{
    id: "chat-welcome",
    title: "بداية جديدة",
    updatedAt: "2026-01-01T00:00:00.000Z",
    messages: [...initialAiMessages],
  }]);
  const [activeAiConversationId, setActiveAiConversationId] = useState("chat-welcome");
  const [aiHistoryReady, setAiHistoryReady] = useState(false);
  const presenceAdapterRef = useRef<ReturnType<typeof createLocalPresenceAdapter> | null>(null);
  const stateSnapshotRef = useRef<JourneyPersistedState>(emptyJourneySnapshot());
  const pushToastRef = useRef<((toast: Omit<ToastItem, "id">) => void) | null>(null);
  const lastPublishedRevisionRef = useRef<number | null>(null);
  const remoteDomainsRef = useRef(new Set<string>());
  const aiHistoryOwnerRef = useRef<string | null>(null);

  const activeParticipantId = sessionParticipantId ?? selectedParticipantId;
  const activeParticipant = participants.find((participant) => participant.id === activeParticipantId) ?? participants[0];
  const today = localDate();

  useEffect(() => {
    aiHistoryOwnerRef.current = null;
    setAiHistoryReady(false);
    const saved = readLocalAiHistory(activeParticipantId);
    const fallback = newAiConversation(initialAiMessages);
    const conversations = saved?.conversations?.length ? saved.conversations : [fallback];
    const activeId = conversations.some((conversation) => conversation.id === saved?.activeId)
      ? saved!.activeId
      : conversations[0].id;
    const activeConversation = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];
    setAiConversations(conversations);
    setActiveAiConversationId(activeId);
    setAi((current) => ({ ...current, messages: activeConversation.messages, isTyping: false, error: undefined }));
    const readyTimer = window.setTimeout(() => {
      aiHistoryOwnerRef.current = activeParticipantId;
      setAiHistoryReady(true);
    }, 0);
    return () => window.clearTimeout(readyTimer);
  }, [activeParticipantId]);

  useEffect(() => {
    if (!aiHistoryReady || aiHistoryOwnerRef.current !== activeParticipantId) return;
    setAiConversations((current) => {
      const existing = current.find((conversation) => conversation.id === activeAiConversationId);
      if (!existing) return current;
      const firstUserMessage = ai.messages.find((message) => message.role === "user");
      const updated: AIConversation = {
        ...existing,
        title: firstUserMessage?.content.slice(0, 42) || existing.title,
        updatedAt: nowIso(),
        messages: ai.messages,
      };
      return [updated, ...current.filter((conversation) => conversation.id !== activeAiConversationId)];
    });
  }, [activeAiConversationId, activeParticipantId, ai.messages, aiHistoryReady]);

  useEffect(() => {
    if (!aiHistoryReady || aiHistoryOwnerRef.current !== activeParticipantId) return;
    writeLocalAiHistory(activeParticipantId, { conversations: aiConversations, activeId: activeAiConversationId });
  }, [activeAiConversationId, activeParticipantId, aiConversations, aiHistoryReady]);

  useEffect(() => {
    const envelope = journeyStorage.readEnvelope();
    const source = envelope?.data ?? emptyJourneySnapshot();
    stateSnapshotRef.current = source;
    const participantId = source.session.participantId ?? selectedParticipantId;
    const definitions = source.tasks.map(normalizeTask);
    const initialForUser = envelope ? applyRecords(definitions, recordsFor(source, participantId, today)) : definitions.map((task) => ({ ...task }));
    setParticipants(source.participants);
    setSelectedParticipantId(participantId);
    setTaskDefinitions(definitions);
    setTasks(initialForUser);
    setTasksOwnerId(participantId);
    setDayStatus(source.dayStatuses.find((item) => item.userId === participantId && item.localDate === today)?.status ?? deriveDayStatus(initialForUser));
    setNotifications(source.notifications);
    setSeenFeedbackIds(source.seenFeedbackIds);
    setActivity(source.activity);
    setEncouragementMessages(source.messages);
    setSoundEnabled(source.settings.soundEnabled);
    setQuranAyahsPerPageState(Math.max(1, Math.min(20, source.settings.quranAyahsPerPage ?? 5)));
    setFocusTimer(source.focusTimers.find((timer) => timer.userId === participantId && timer.localDate === today) ?? defaultFocus(participantId, today));
    setProgressHistory(source.progress);
    setDailyTaskRecords(source.dailyTaskRecords);
    const savedStreak = source.streaks.find((item) => item.userId === participantId);
    if (savedStreak) setStreakData({ current: savedStreak.current, best: savedStreak.best, successfulDays: savedStreak.successfulDays, history: savedStreak.history.filter((day) => day.status !== "partial") });
    if (source.session.participantId) setLocalSessionParticipantId(source.session.participantId);
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((updater: (current: JourneyPersistedState) => JourneyPersistedState, domain?: string) => {
    if (!hydrated) return;
    const next = journeyStorage.update((current) => {
      const merged = { ...emptyJourneySnapshot(), ...current };
      const updated = updater(merged);
      stateSnapshotRef.current = updated;
      return updated;
    });
    if (domain) {
      const revision = Date.now();
      lastPublishedRevisionRef.current = revision;
      try { localRealtime.publish("state.changed", { changedDomains: [domain], revision }); } catch { /* local-only fallback */ }
    }
    return next;
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (remoteDomainsRef.current.delete("participants")) return;
    persist((state) => ({ ...state, participants }), "participants");
  }, [participants, hydrated, persist]);

  useEffect(() => {
    if (!hydrated || tasksOwnerId !== activeParticipantId) return;
    if (remoteDomainsRef.current.delete("task.updated")) return;
    const records = tasks.map((task): DailyTaskRecord => ({ userId: activeParticipantId, taskId: task.id, localDate: today, status: task.status, current: Math.max(0, Math.min(task.target, task.current)), actualMinutes: Math.max(0, getTaskElapsedSeconds(task) / 60), details: task.details, awardedPoints: task.awardedPoints ?? 0, detailItems: task.detailItems, updatedAt: nowIso() }));
    setDailyTaskRecords((items) => [...items.filter((record) => !(record.userId === activeParticipantId && record.localDate === today)), ...records]);
    persist((state) => ({ ...state, tasks: taskDefinitions, dailyTaskRecords: [...state.dailyTaskRecords.filter((record) => !(record.userId === activeParticipantId && record.localDate === today)), ...records] }), "task.updated");
  }, [tasks, taskDefinitions, tasksOwnerId, activeParticipantId, today, hydrated, persist]);

  useEffect(() => { if (hydrated && !remoteDomainsRef.current.delete("notification.created")) persist((state) => ({ ...state, notifications }), "notification.created"); }, [notifications, hydrated, persist]);
  useEffect(() => { if (hydrated && !remoteDomainsRef.current.delete("activity.created")) persist((state) => ({ ...state, activity }), "activity.created"); }, [activity, hydrated, persist]);
  useEffect(() => { if (hydrated && !remoteDomainsRef.current.delete("message.created")) persist((state) => ({ ...state, messages: encouragementMessages }), "message.created"); }, [encouragementMessages, hydrated, persist]);
  useEffect(() => { if (hydrated && !remoteDomainsRef.current.delete("settings.changed")) persist((state) => ({ ...state, settings: { ...state.settings, soundEnabled, quranAyahsPerPage } }), "settings.changed"); }, [soundEnabled, quranAyahsPerPage, hydrated, persist]);
  useEffect(() => {
    if (!hydrated) return;
    const saved = journeyStorage.read();
    setTasks(applyRecords(taskDefinitions, recordsFor(saved, activeParticipantId, today)));
    setTasksOwnerId(activeParticipantId);
    const status = saved.dayStatuses.find((item) => item.userId === activeParticipantId && item.localDate === today)?.status;
    setDayStatus(status ?? "not_started");
    setFocusTimer(saved.focusTimers.find((timer) => timer.userId === activeParticipantId && timer.localDate === today) ?? defaultFocus(activeParticipantId, today));
  }, [activeParticipantId, today, taskDefinitions, hydrated]);

  useEffect(() => {
    localRealtime.connect();
    setRealtimeStatus(localRealtime.getStatus());
    const stopStatus = localRealtime.onStatusChange(setRealtimeStatus);
    const stopPresence = localRealtime.subscribe("presence.updated", (event) => setPresence((items) => [...items.filter((item) => item.userId !== event.payload.presence.userId), event.payload.presence]));
    const stopState = localRealtime.subscribe("state.changed", (event) => {
      if (!hydrated || event.payload.revision === lastPublishedRevisionRef.current) return;
      const next = journeyStorage.read();
      stateSnapshotRef.current = next;
      event.payload.changedDomains.forEach((domain) => {
        remoteDomainsRef.current.add(domain);
        window.setTimeout(() => remoteDomainsRef.current.delete(domain), 100);
      });
      if (event.payload.changedDomains.includes("participants")) setParticipants(next.participants);
      if (event.payload.changedDomains.includes("notification.created")) setNotifications(next.notifications);
      if (event.payload.changedDomains.includes("feedback.updated")) setSeenFeedbackIds(next.seenFeedbackIds);
      if (event.payload.changedDomains.includes("activity.created")) setActivity(next.activity);
      if (event.payload.changedDomains.includes("message.created")) setEncouragementMessages(next.messages);
      if (event.payload.changedDomains.includes("settings.changed")) { setSoundEnabled(next.settings.soundEnabled); setQuranAyahsPerPageState(Math.max(1, Math.min(20, next.settings.quranAyahsPerPage ?? 5))); }
      if (event.payload.changedDomains.includes("task.updated")) {
        setDailyTaskRecords(next.dailyTaskRecords);
        const nextDefinitions = next.tasks.map(normalizeTask);
        setTaskDefinitions(nextDefinitions);
        setTasks(applyRecords(nextDefinitions, recordsFor(next, activeParticipantId, today)));
      }
      if (event.payload.changedDomains.includes("progress.updated")) {
        setProgressHistory(next.progress);
        setDayStatus(next.dayStatuses.find((item) => item.userId === activeParticipantId && item.localDate === today)?.status ?? "not_started");
        const savedStreak = next.streaks.find((item) => item.userId === activeParticipantId);
        if (savedStreak) setStreakData({ current: savedStreak.current, best: savedStreak.best, successfulDays: savedStreak.successfulDays, history: savedStreak.history });
      }
      if (event.payload.changedDomains.includes("focus.updated")) setFocusTimer(next.focusTimers.find((timer) => timer.userId === activeParticipantId && timer.localDate === today) ?? defaultFocus(activeParticipantId, today));
    });
    return () => { stopStatus(); stopPresence(); stopState(); localRealtime.disconnect(); };
  }, [activeParticipantId, hydrated, today]);

  useEffect(() => {
    if (!hydrated || !activeParticipant) return;
    const adapter = presenceAdapterRef.current ?? createLocalPresenceAdapter({ realtime: localRealtime });
    presenceAdapterRef.current = adapter;
    adapter.connect({ userId: activeParticipant.id, name: activeParticipant.name });
    const stop = adapter.subscribe(setPresence);
    return () => { stop(); adapter.disconnect(); };
  }, [activeParticipant, hydrated]);

  useEffect(() => {
    if (focusTimer.status !== "running") return;
    const timer = window.setInterval(() => setFocusTick((value) => value + 1), 500);
    return () => window.clearInterval(timer);
  }, [focusTimer.status]);

  const elapsedFocusSeconds = focusElapsed(focusTimer);
  const focus: FocusState = {
    duration: Math.round(focusTimer.durationSeconds / 60),
    secondsLeft: Math.max(0, focusTimer.durationSeconds - elapsedFocusSeconds),
    isRunning: focusTimer.status === "running" && elapsedFocusSeconds < focusTimer.durationSeconds,
    status: focusTimer.status,
    elapsedSeconds: elapsedFocusSeconds + focusTick * 0,
  };

  useEffect(() => {
    if (!hydrated || focusTimer.status !== "running" || elapsedFocusSeconds < focusTimer.durationSeconds) return;
    setFocusTimer((timer) => ({ ...timer, elapsedSeconds: timer.durationSeconds, status: "completed", finishedAt: nowIso(), updatedAt: nowIso() }));
    pushToastRef.current?.({ tone: "success", title: "اكتملت جلسة التركيز", body: "أحسنت، خذ نفسًا قصيرًا قبل خطوتك التالية." });
  }, [hydrated, focusTimer.status, focusTimer.durationSeconds, elapsedFocusSeconds]);

  const progress = useMemo(() => calculateProgress(tasks), [tasks]);

  const currentRankings = useMemo(() => [...participants]
    .filter((participant) => participant.role === "participant")
    .sort((a, b) => b.score - a.score)
    .map((participant, index) => ({
      participantId: participant.id,
      rank: index + 1,
      name: participant.name,
      initials: participant.initials,
      avatarColor: participant.avatarColor,
      score: participant.score,
      progress: participant.progress,
      streak: participant.streak,
    })), [participants]);

  const progressDays = useMemo(() => {
    const byDate = new Map(progressHistory
      .filter((item) => item.userId === activeParticipantId)
      .map((item) => [item.localDate, { date: item.localDate, label: item.localDate, progress: item.percent, minutes: item.actualMinutes }]));
    byDate.set(today, { date: today, label: "اليوم", progress: progress.percent, minutes: progress.actualMinutes });
    return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
  }, [activeParticipantId, progress.actualMinutes, progress.percent, progressHistory, today]);

  const calculatedStreak = useMemo(() => calculateStreakFromProgress(progressDays.map((day) => ({
    date: day.date,
    progress: day.progress,
    status: day.date === today && dayStatus !== "complete" ? "today" as const : undefined,
  })), { today }), [dayStatus, progressDays, today]);

  const generalStreakTitle = getGeneralStreakTitle(calculatedStreak.current);

  const taskStreaks = useMemo(() => {
    const persisted = dailyTaskRecords
      .filter((record) => record.userId === activeParticipantId && record.localDate !== today)
      .map((record) => ({ taskId: record.taskId, localDate: record.localDate, status: record.status }));
    const current = tasks.map((task) => ({ taskId: task.id, localDate: today, status: task.status }));
    return calculateTaskStreaks(taskDefinitions, [...persisted, ...current], today);
  }, [activeParticipantId, dailyTaskRecords, taskDefinitions, tasks, today]);

  const historyDays = useMemo(() => progressDays.map((day, index) => {
    const parsed = new Date(`${day.date}T12:00:00`);
    const label = Number.isNaN(parsed.getTime()) ? day.date : new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long" }).format(parsed);
    const dayStreak = calculateStreakFromProgress(progressDays.slice(0, index + 1).map((item) => ({ date: item.date, progress: item.progress })), { today: day.date }).current;
    return {
      date: day.date,
      label,
      progress: day.progress,
      minutes: day.minutes,
      status: day.progress >= 100 ? "مكتمل" : day.progress >= 70 ? "شبه مكتمل" : day.progress > 0 ? "إنجاز جزئي" : "لم يبدأ",
      streak: dayStreak,
    };
  }).reverse(), [progressDays]);

  const currentReports = useMemo(() => calculateReports({
    tasks,
    progress,
    rankings: currentRankings,
    daily: { dailyResults: progressDays.slice(-1) },
    weekly: { dailyResults: progressDays.slice(-7) },
    monthly: { dailyResults: progressDays.slice(-30) },
  }), [currentRankings, progress, progressDays, tasks]);

  useEffect(() => {
    if (!hydrated || tasksOwnerId !== activeParticipantId) return;
    const nextStreak: Streak = { current: calculatedStreak.current, best: calculatedStreak.best, successfulDays: calculatedStreak.successfulDays, history: calculatedStreak.history };
    setStreakData(nextStreak);
    if (remoteDomainsRef.current.delete("progress.updated")) return;
    persist((state) => ({
      ...state,
      dayStatuses: [...state.dayStatuses.filter((item) => !(item.userId === activeParticipantId && item.localDate === today)), { userId: activeParticipantId, localDate: today, status: dayStatus, updatedAt: nowIso() }],
      progress: [...state.progress.filter((item) => !(item.userId === activeParticipantId && item.localDate === today)), { userId: activeParticipantId, localDate: today, percent: progress.percent, completed: progress.completed, partial: progress.partial, remaining: progress.remaining, total: progress.total, actualMinutes: progress.actualMinutes, updatedAt: nowIso() }],
      streaks: [...state.streaks.filter((item) => item.userId !== activeParticipantId), { userId: activeParticipantId, current: nextStreak.current, best: nextStreak.best, successfulDays: nextStreak.successfulDays, history: nextStreak.history, updatedAt: nowIso() }],
    }), "progress.updated");
  }, [activeParticipantId, calculatedStreak, dayStatus, hydrated, persist, progress, tasksOwnerId, today]);
  useEffect(() => {
    if (!hydrated || !activeParticipantId || tasksOwnerId !== activeParticipantId) return;
    setParticipants((items) => items.map((participant) => participant.id === activeParticipantId && participant.progress !== progress.percent
      ? { ...participant, progress: progress.percent }
      : participant));
  }, [progress.percent, tasksOwnerId, activeParticipantId, hydrated]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = createToastId();
    setToasts((items) => [...items, { ...toast, id }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);

  const announceDayCompletion = useCallback(() => {
    const feedback = getDayCompletionFeedback();
    pushToast({ tone: feedback.tone, title: feedback.title, body: feedback.body });
    playJourneySound(feedback.sound, soundEnabled);
    void celebrate(feedback.celebrate);
  }, [pushToast, soundEnabled]);

  const announceAchievementFeedback = useCallback((feedbackItems: ReturnType<typeof getAchievementFeedback>, delay = 0) => {
    const unseen = getUnseenAchievementFeedback(feedbackItems, seenFeedbackIds, activeParticipantId);
    if (!unseen.length) return;
    const ids = unseen.map((item) => `${activeParticipantId}:${item.id}`);
    setSeenFeedbackIds((items) => [...new Set([...items, ...ids])]);
    persist((state) => ({ ...state, seenFeedbackIds: [...new Set([...state.seenFeedbackIds, ...ids]) ] }), "feedback.updated");

    const priority = { title: 3, milestone: 2, achievement: 1 } as const;
    const item = [...unseen].sort((left, right) => priority[right.kind] - priority[left.kind])[0];
    window.setTimeout(() => {
      pushToast({ tone: "success", title: item.title, body: item.body, icon: item.kind });
      setNotifications((items) => [createNotification({ kind: "success", title: item.title, body: item.body, persistent: true, createdAt: nowIso(), read: false }), ...items].slice(0, 50));
    }, delay);
  }, [activeParticipantId, persist, pushToast, seenFeedbackIds]);

  const recordActivity = (kind: ActivityEvent["kind"], action: string, taskTitle = "") => {
    const participant = participants.find((item) => item.id === activeParticipantId);
    if (!participant) return;
    const event = createActivityEvent({ participant, kind, action, task: taskTitle, createdAt: nowIso() });
    setActivity((items) => [event, ...items].slice(0, 100));
    try { localRealtime.publish("activity.created", { event }); } catch { /* local-only fallback */ }
  };

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status || !["running", "paused"].includes(status)) return;
    const timestamp = nowIso();
    setTasks((items) => items.map((item) => item.id === taskId ? transitionTaskStatus(item, status, timestamp) : item));
    setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? {
      ...participant,
      presence: status === "running" ? "active" : "paused",
      currentStatus: status === "running" ? "يعمل الآن" : "متوقف مؤقتًا",
      currentTask: task.title,
    } : participant));
    recordActivity(status === "running" ? "started" : "paused", status === "running" ? "بدأ المهمة" : "أوقف المهمة مؤقتًا", task.title);
    presenceAdapterRef.current?.update(status === "running" ? "active" : "paused", { currentTaskId: taskId, currentTaskTitle: task.title });
    pushToast({ tone: "info", title: status === "running" ? (task.status === "paused" ? "استؤنفت المهمة" : "بدأت المهمة") : "أوقفت المهمة مؤقتًا", body: "حُفظت الحالة والوقت الحاليان." });
  };

  const startTaskDetail = (taskId: string, detailId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const detail = task?.detailItems?.find((item) => item.id === detailId);
    if (!task || !detail || ["completed", "not_completed"].includes(detail.status)) return;
    const nextTask = transitionTaskDetail(task, detailId, "start", nowIso());
    if (!nextTask) return;
    setTasks((items) => items.map((item) => item.id === taskId ? nextTask : item));
    recordActivity("started", "بدأ تفصيل المهمة", `${task.title} · ${detail.title}`);
  };

  const pauseTaskDetail = (taskId: string, detailId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const detail = task?.detailItems?.find((item) => item.id === detailId);
    if (!task || !detail || detail.status !== "running") return;
    const nextTask = transitionTaskDetail(task, detailId, "pause", nowIso());
    if (!nextTask) return;
    setTasks((items) => items.map((item) => item.id === taskId ? nextTask : item));
    recordActivity("paused", "أوقف تفصيل المهمة مؤقتًا", `${task.title} · ${detail.title}`);
  };

  const completeTaskDetail = (taskId: string, detailId: string, outcome: "completed" | "partial" | "not_completed") => {
    const task = tasks.find((item) => item.id === taskId);
    const detail = task?.detailItems?.find((item) => item.id === detailId);
    if (!task || !detail || ["completed", "not_completed"].includes(detail.status)) return;
    const elapsedSeconds = getTaskDetailElapsedSeconds(detail);
    if (task.type === "prayer" && outcome !== "not_completed" && elapsedSeconds < 1) {
      pushToast({ tone: "warning", title: "سجّل وقت الصلاة أولًا", body: "ابدأ مؤقت هذه الصلاة ثم أوقفه أو أكملها بعد تسجيل وقت." });
      return;
    }
    const nextTask = transitionTaskDetail(task, detailId, outcome, nowIso());
    if (!nextTask) return;
    const didCompleteParentTask = task.status !== "completed" && nextTask.status === "completed";
    const pointDelta = getTaskEarnedPoints(nextTask) - getTaskEarnedPoints(task);
    setTasks((items) => items.map((item) => item.id === taskId ? { ...nextTask, awardedPoints: getTaskEarnedPoints(nextTask) } : item));
    if (pointDelta !== 0) setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? { ...participant, score: Math.max(0, participant.score + pointDelta) } : participant));
    recordActivity("completed", outcome === "completed" ? "أكمل تفصيل المهمة" : "سجل نتيجة تفصيل المهمة", `${task.title} · ${detail.title}`);
    const feedback = didCompleteParentTask
      ? getTaskOutcomeFeedback("completed")
      : getTaskDetailOutcomeFeedback(outcome, detail.title);
    pushToast({ tone: toToastTone(feedback.tone), title: feedback.title, body: feedback.body });
    if (feedback.sound) playJourneySound(feedback.sound, soundEnabled);
    if (feedback.celebrate) void celebrate(feedback.celebrate);
  };
  const completeTask = (taskId: string, outcome: CompletionOutcome) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || ["completed", "not_completed", "closed"].includes(task.status)) return;
    if (task.type === "prayer" && task.detailItems?.length && !["not_completed", "closed"].includes(outcome)) {
      pushToast({ tone: "info", title: "سجّل الصلوات بشكل منفصل", body: "تُحسب مهمة الصلاة تلقائيًا من الصلوات التي سُجّل لها وقت." });
      return;
    }
    const nextTask = completeTaskOutcome(task, outcome);
    if (!nextTask) return;
    const awardedBefore = task.awardedPoints ?? 0;
    const earnedAfter = getTaskEarnedPoints(nextTask);
    const pointDelta = earnedAfter - awardedBefore;
    const nextTasks = tasks.map((item) => item.id === taskId ? { ...nextTask, awardedPoints: earnedAfter } : item);
    const nextDayStatus = deriveDayStatus(nextTasks);
    const didCompleteDay = dayStatus !== "complete" && nextDayStatus === "complete";
    const nextProgress = calculateProgress(nextTasks);
    const nextStreak = calculateStreakFromProgress(progressDays.map((day) => ({
      date: day.date,
      progress: day.date === today ? nextProgress.percent : day.progress,
      status: day.date === today && !didCompleteDay ? "today" as const : undefined,
    })), { today }).current;
    const hasCompletedTaskBefore = tasks.some((item) => item.status === "completed")
      || dailyTaskRecords.some((record) => record.status === "completed");
    setTasks(nextTasks);
    if (pointDelta !== 0) {
      setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? { ...participant, score: Math.max(0, participant.score + pointDelta) } : participant));
    }
    setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? {
      ...participant,
      presence: "idle",
      currentStatus: outcome === "completed" ? "أكمل مهمة" : "سجل حالة اليوم",
      currentTask: undefined,
    } : participant));
    recordActivity("completed", outcome === "completed" ? "أكمل المهمة" : "سجل نتيجة المهمة", task.title);
    presenceAdapterRef.current?.update("idle");
    const feedback = getTaskOutcomeFeedback(outcome);
    if (didCompleteDay) {
      setDayStatus("complete");
      announceDayCompletion();
    } else {
      pushToast({ tone: toToastTone(feedback.tone), title: feedback.title, body: feedback.body });
      if (feedback.sound) playJourneySound(feedback.sound, soundEnabled);
      if (feedback.celebrate) void celebrate(feedback.celebrate);
    }
    if (outcome === "completed" || didCompleteDay) {
      announceAchievementFeedback(getAchievementFeedback({
        hasCompletedTaskBefore,
        previousStreak: calculatedStreak.current,
        nextStreak,
      }), didCompleteDay ? 900 : 280);
    }
  };
  const startAiConversation = () => {
    if (ai.isTyping) return;
    const conversation = newAiConversation([]);
    setAiConversations((current) => [conversation, ...current]);
    setActiveAiConversationId(conversation.id);
    setAi((current) => ({ ...current, messages: [], isTyping: false, error: undefined }));
  };

  const selectAiConversation = (conversationId: string) => {
    if (ai.isTyping || conversationId === activeAiConversationId) return;
    const conversation = aiConversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    setActiveAiConversationId(conversationId);
    setAi((current) => ({ ...current, messages: conversation.messages, isTyping: false, error: undefined }));
  };

  const deleteAiConversation = (conversationId: string) => {
    if (ai.isTyping) return;
    const remaining = aiConversations.filter((conversation) => conversation.id !== conversationId);
    if (conversationId !== activeAiConversationId) {
      setAiConversations(remaining);
      return;
    }
    const nextConversation = remaining[0] ?? newAiConversation([]);
    setAiConversations(remaining.length ? remaining : [nextConversation]);
    setActiveAiConversationId(nextConversation.id);
    setAi((current) => ({ ...current, messages: nextConversation.messages, isTyping: false, error: undefined }));
  };

  const sendAiMessage = (message: string) => {
    if (!message.trim()) return;
    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, content: message.trim(), createdAt: nowIso() };
    setAi((current) => ({ ...current, messages: [...current.messages, userMessage], isTyping: true, error: undefined }));
    void mockAIAdapter.sendMessage({
      message: message.trim(),
      participant: activeParticipant,
      tasks,
      progress,
      streak: streakData.current,
    }).then(({ content }) => {
      setAi((current) => ({ ...current, isTyping: false, messages: [...current.messages, { id: `ai-${Date.now()}`, role: "assistant", content, createdAt: nowIso() }] }));
    }).catch(() => {
      setAi((current) => ({ ...current, isTyping: false, error: "تعذر تجهيز الرد. حاول مرة أخرى." }));
    });
  };

  const beginSession = (participantId: string) => {
    if (!participants.some((participant) => participant.id === participantId)) return false;
    setSelectedParticipantId(participantId);
    setLocalSessionParticipantId(participantId);
    persist((state) => ({ ...state, session: { participantId, signedInAt: nowIso() } }), "session.updated");
    try { localRealtime.publish("session.updated", { participantId }); } catch { /* local fallback */ }
    return true;
  };

  const loginParticipant = (participantId: string, pin: string) => {
    return verifyLocalPin(participants, participantId, pin) && beginSession(participantId);
  };

  const logout = () => {
    setLocalSessionParticipantId(null);
    persist((state) => ({ ...state, session: { participantId: null } }), "session.updated");
    presenceAdapterRef.current?.disconnect();
  };

  const saveTaskDefinition = (taskId: string | null, input: TaskDefinitionInput) => {
    if (!input.title.trim() || !Number.isFinite(input.target) || input.target <= 0 || !Number.isFinite(input.fullPoints) || input.fullPoints < 0) return;
    if (taskId) {
      const update = (task: Task) => task.id === taskId ? normalizeTask({ ...task, ...input, goalLabel: `${input.target} ${input.unit}` }) : task;
      setTaskDefinitions((items) => items.map(update));
      setTasks((items) => items.map(update));
    } else {
      const task: Task = normalizeTask({ id: createLocalId("task"), ...input, goalLabel: `${input.target} ${input.unit}`, current: 0, actualMinutes: 0, status: "not_started", supportingText: "مهمة جديدة أضيفت من لوحة الإدارة.", scheduledTime: "اليوم" });
      setTaskDefinitions((items) => [...items, task]);
      setTasks((items) => [...items, task]);
    }
    pushToast({
      tone: "success",
      title: taskId ? "تم تحديث المهمة" : "تم إنشاء المهمة",
      body: `${input.title} جاهزة الآن داخل قائمة المهام.`,
    });
  };

  const deleteTask = (taskId: string) => {
    setTaskDefinitions((items) => items.filter((item) => item.id !== taskId));
    setTasks((items) => items.filter((item) => item.id !== taskId));
    pushToast({ tone: "warning", title: "تم حذف المهمة", body: "أزيلت من قائمة اليوم مع الحفاظ على السجل السابق." });
  };

  const updateTaskProgress = (taskId: string, current: number) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (task.type === "prayer" && task.detailItems?.length) {
      pushToast({ tone: "info", title: "التقدم من تفاصيل الصلوات", body: "ابدأ وسجّل وقت كل صلاة من قائمة الصلوات." });
      return;
    }
    const nextTask = updateMeasuredTaskProgress(task, current);
    const awardedBefore = task.awardedPoints ?? 0;
    const earnedAfter = getTaskEarnedPoints(nextTask);
    const pointDelta = earnedAfter - awardedBefore;
    setTasks((items) => items.map((item) => item.id === taskId ? { ...nextTask, awardedPoints: earnedAfter } : item));
    if (pointDelta !== 0) {
      setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? { ...participant, score: Math.max(0, participant.score + pointDelta) } : participant));
    }
  };
  const finishAllTasks = () => {
    const completed = completeAllTasks(tasks);
    if (completed.tasks.every((task, index) => task === tasks[index])) return;
    const { tasks: completedTasks, scoreDelta } = completed;
    setTasks(completedTasks);
    if (scoreDelta) setParticipants((items) => items.map((participant) => participant.id === activeParticipantId ? { ...participant, score: Math.max(0, participant.score + scoreDelta), presence: "idle", currentTask: undefined, currentStatus: "أكمل مهام اليوم" } : participant));
    setDayStatus("complete");
    recordActivity("completed", "أكمل كل المهام المتبقية");
    if (dayStatus !== "complete") {
      announceDayCompletion();
      const hasCompletedTaskBefore = tasks.some((task) => task.status === "completed")
        || dailyTaskRecords.some((record) => record.status === "completed");
      const nextStreak = calculateStreakFromProgress(progressDays.map((day) => ({
        date: day.date,
        progress: day.date === today ? 100 : day.progress,
      })), { today }).current;
      announceAchievementFeedback(getAchievementFeedback({ hasCompletedTaskBefore, previousStreak: calculatedStreak.current, nextStreak }), 900);
    }
  };

  const chooseFocusDuration = (minutes: number) => {
    setFocusTimer((timer) => chooseFocusTimerDuration(timer, minutes, nowIso()));
  };
  const startFocus = () => {
    setFocusTimer((timer) => startFocusTimer(timer, nowIso()));
    presenceAdapterRef.current?.update("active", { currentTaskTitle: "جلسة تركيز" });
  };
  const pauseFocus = () => {
    if (focusTimer.status !== "running") return;
    setFocusTimer((timer) => pauseFocusTimer(timer, nowIso()));
    presenceAdapterRef.current?.update("paused", { currentTaskTitle: "جلسة تركيز" });
  };
  const resumeFocus = () => {
    if (focusTimer.status !== "paused") return;
    setFocusTimer((timer) => resumeFocusTimer(timer, nowIso()));
  };
  const finishFocus = () => {
    if (focusTimer.status === "idle" && focusTimer.elapsedSeconds === 0) return;
    const finished = finishFocusTimer(focusTimer, nowIso());
    setFocusTimer(finished);
    const session: FocusSession = { id: createLocalId("focus-session"), userId: activeParticipantId, localDate: today, durationSeconds: finished.durationSeconds, actualSeconds: finished.elapsedSeconds, startedAt: finished.startedAt ?? nowIso(), finishedAt: finished.finishedAt ?? nowIso() };
    persist((state) => ({ ...state, focusTimers: [...state.focusTimers.filter((timer) => timer.id !== finished.id), finished], focusSessions: [...state.focusSessions, session] }), "focus.updated");
    presenceAdapterRef.current?.update("idle");
    pushToast({ tone: "success", title: "أحسنت التركيز", body: `حُفظت جلسة مدتها ${Math.round(finished.elapsedSeconds / 60)} دقيقة.` });
  };
  const cancelFocus = () => {
    setFocusTimer((timer) => cancelFocusTimer(timer, nowIso()));
    presenceAdapterRef.current?.update("idle");
  };
  useEffect(() => {
    if (!hydrated || focusTimer.userId !== activeParticipantId) return;
    if (remoteDomainsRef.current.delete("focus.updated")) return;
    persist((state) => ({ ...state, focusTimers: [...state.focusTimers.filter((timer) => timer.id !== focusTimer.id), focusTimer] }), "focus.updated");
  }, [focusTimer, activeParticipantId, hydrated, persist]);

  const setParticipantRole = (id: string, role: Participant["role"]) => setParticipants((items) => changeParticipantRole(items, id, role));
  const setParticipantPin = (id: string, pin: string) => {
    if (!/^\d{4}$/.test(pin)) return false;
    setParticipants((items) => setParticipantPinInList(items, id, pin));
    return true;
  };
  const changeOwnPin = (currentPin: string, nextPin: string) => {
    if (!/^\d{4}$/.test(nextPin)) return { ok: false, error: "يجب أن يتكوّن PIN من 4 أرقام." };
    const current = participants.find((participant) => participant.id === activeParticipantId);
    if (!current || current.pin !== currentPin) return { ok: false, error: "رمز PIN الحالي غير صحيح." };
    setParticipantPin(activeParticipantId, nextPin);
    return { ok: true };
  };
  const sendEncouragement = (recipientId: string, message: string) => {
    const clean = message.trim();
    const recipient = participants.find((participant) => participant.id === recipientId);
    if (!recipient || !clean || recipientId === activeParticipantId) return false;
    const next: EncouragementMessage = { id: createLocalId("message"), sender: activeParticipant.name, senderId: activeParticipant.id, recipientId, initials: activeParticipant.initials, avatarColor: activeParticipant.avatarColor, message: clean, createdAt: nowIso() };
    setEncouragementMessages((items) => [next, ...items]);
    setNotifications((items) => [createNotification({ kind: "encouragement", title: "رسالة تشجيع جديدة", body: `${activeParticipant.name} أرسل لك رسالة.`, createdAt: nowIso(), persistent: true, read: false }), ...items]);
    try { localRealtime.publish("message.created", { message: next, recipientId }); } catch { /* local fallback */ }
    return true;
  };

  const startDay = () => {
    setDayStatus("started");
    recordActivity("joined", "بدأ يومه");
    pushToast({ tone: "success", title: "بدأت رحلة اليوم", body: "اختر أول مهمة وابدأ بخطوة بسيطة." });
  };

  const endDay = () => {
    const didCompleteDay = dayStatus !== "complete" && progress.percent >= 100;
    setDayStatus(didCompleteDay ? "complete" : "almost_complete");
    if (focusTimer.status === "running") pauseFocus();
    recordActivity("joined", "أنهى متابعة اليوم");
    if (didCompleteDay) {
      announceDayCompletion();
      const nextStreak = calculateStreakFromProgress(progressDays.map((day) => ({ date: day.date, progress: day.date === today ? progress.percent : day.progress })), { today }).current;
      announceAchievementFeedback(getAchievementFeedback({
        hasCompletedTaskBefore: tasks.some((task) => task.status === "completed") || dailyTaskRecords.some((record) => record.status === "completed"),
        previousStreak: calculatedStreak.current,
        nextStreak,
      }), 900);
      return;
    }
    pushToast({ tone: "info", title: "تم حفظ رحلة اليوم", body: "حُفظ التقدم ويمكنك العودة إلى السجل." });
  };

  const clearData = (scope: "day" | "week" | "month" | "history" | "participant" | "all", participantId = activeParticipantId) => {
    setClearBackup(journeyStorage.read());
    const targetId = participantId || activeParticipantId;
    const currentDate = new Date();
    const todayKey = localDate(currentDate);
    const start = new Date(currentDate);
    if (scope === "week") start.setDate(start.getDate() - 6);
    if (scope === "month") start.setDate(1);
    const startKey = localDate(start);
    const shouldRemoveDate = (date: string) => {
      if (scope === "participant") return true;
      if (scope === "history") return date <= todayKey;
      if (scope === "day") return date === todayKey;
      if (scope === "week" || scope === "month") return date >= startKey && date <= todayKey;
      return false;
    };
    const next = journeyStorage.update((state) => {
      if (scope === "all") {
        return {
          ...emptyJourneySnapshot(),
          participants: state.participants.length ? state.participants : initialParticipants,
          tasks: taskDefinitions,
          settings: state.settings,
          session: state.session,
        };
      }
      const belongsToTarget = (id: string) => id === targetId;
      return {
        ...state,
        dailyTaskRecords: state.dailyTaskRecords.filter((record) => !(belongsToTarget(record.userId) && shouldRemoveDate(record.localDate))),
        focusTimers: state.focusTimers.filter((timer) => !(belongsToTarget(timer.userId) && shouldRemoveDate(timer.localDate))),
        focusSessions: state.focusSessions.filter((session) => !(belongsToTarget(session.userId) && shouldRemoveDate(session.localDate))),
        progress: state.progress.filter((item) => !(belongsToTarget(item.userId) && shouldRemoveDate(item.localDate))),
        dayStatuses: state.dayStatuses.filter((item) => !(belongsToTarget(item.userId) && shouldRemoveDate(item.localDate))),
        streaks: state.streaks.filter((item) => item.userId !== targetId),
        activity: scope === "history" || scope === "participant" ? state.activity.filter((event) => event.participantId !== targetId) : state.activity,
        messages: scope === "history" || scope === "participant" ? state.messages.filter((message) => message.senderId !== targetId && message.recipientId !== targetId) : state.messages,
        notifications: scope === "history" || scope === "participant" ? [] : state.notifications,
      };
    });
    stateSnapshotRef.current = next;
    setProgressHistory(next.progress);
    setTasks(applyRecords(taskDefinitions, recordsFor(next, activeParticipantId, today)));
    setDayStatus(next.dayStatuses.find((item) => item.userId === activeParticipantId && item.localDate === today)?.status ?? "not_started");
    setFocusTimer(next.focusTimers.find((timer) => timer.userId === activeParticipantId && timer.localDate === today) ?? defaultFocus(activeParticipantId, today));
    setActivity(next.activity);
    setNotifications(next.notifications);
    setEncouragementMessages(next.messages);
    setStreakData(streak);
    pushToast({ tone: "warning", title: "تم مسح البيانات", body: scope === "all" ? "تم مسح السجلات مع الإبقاء على الحسابات والمهام." : "تم تطبيق النطاق المحدد على البيانات المحلية." });
  };

  const restoreClearedData = () => {
    if (!clearBackup) return false;
    journeyStorage.write(clearBackup);
    stateSnapshotRef.current = clearBackup;
    setParticipants(clearBackup.participants);
    setTaskDefinitions(clearBackup.tasks.map(normalizeTask));
    setTasks(applyRecords(clearBackup.tasks.map(normalizeTask), recordsFor(clearBackup, activeParticipantId, today)));
    setTasksOwnerId(activeParticipantId);
    setProgressHistory(clearBackup.progress);
    setDailyTaskRecords(clearBackup.dailyTaskRecords);
    setDayStatus(clearBackup.dayStatuses.find((item) => item.userId === activeParticipantId && item.localDate === today)?.status ?? "not_started");
    setFocusTimer(clearBackup.focusTimers.find((timer) => timer.userId === activeParticipantId && timer.localDate === today) ?? defaultFocus(activeParticipantId, today));
    setActivity(clearBackup.activity);
    setNotifications(clearBackup.notifications);
    setEncouragementMessages(clearBackup.messages);
    const savedStreak = clearBackup.streaks.find((item) => item.userId === activeParticipantId);
    setStreakData(savedStreak ? { current: savedStreak.current, best: savedStreak.best, successfulDays: savedStreak.successfulDays, history: savedStreak.history } : streak);
    setClearBackup(null);
    pushToast({ tone: "success", title: "تمت استعادة البيانات", body: "عادت آخر نسخة سبقت عملية المسح." });
    return true;
  };

  const value: DemoContextValue = {
    participants,
    activeParticipant,
    selectedParticipantId,
    setSelectedParticipantId,
    sessionReady,
    isAuthenticated: Boolean(sessionParticipantId),
    loginParticipant,
    quickLogin: beginSession,
    logout,
    dayStatus,
    tasks,
    activity,
    rankings: currentRankings,
    reports: currentReports,
    historyDays,
    streakData,
    generalStreakTitle,
    taskStreaks,
    achievements,
    titles,
    encouragements: encouragementMessages.filter((message) => !message.recipientId || message.recipientId === activeParticipantId || message.senderId === activeParticipantId),
    aiSuggestions,
    recentParticipantIds,
    notifications,
    presence,
    realtimeStatus,
    ai,
    aiConversations,
    activeAiConversationId,
    focus,
    soundEnabled,
    quranAyahsPerPage,
    progress,
    startDay,
    endDay,
    finishAllTasks,
    setTaskStatus,
    completeTask,
    startTaskDetail,
    pauseTaskDetail,
    completeTaskDetail,
    updateTaskProgress,
    updateTaskDetails: (taskId, details) => setTasks((items) => items.map((task) => task.id === taskId ? { ...task, details: { ...task.details, ...details } } : task)),
    chooseFocusDuration,
    startFocus,
    pauseFocus,
    resumeFocus,
    finishFocus,
    cancelFocus,
    dismissNotification: (id) => setNotifications((items) => items.filter((item) => item.id !== id)),
    markNotificationsRead: () => setNotifications((items) => items.map((item) => ({ ...item, read: true }))),
    pushToast,
    toasts,
    dismissToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
    openAi: () => setAi((current) => ({ ...current, isOpen: true })),
    closeAi: () => setAi((current) => ({ ...current, isOpen: false })),
    sendAiMessage,
    triggerAiError: () => setAi((current) => ({ ...current, isTyping: false, error: "تعذر تجهيز الرد. حاول مرة أخرى." })),
    clearAiError: () => setAi((current) => ({ ...current, error: undefined })),
    clearAiConversation: () => setAi((current) => ({ ...current, messages: [], isTyping: false, error: undefined })),
    startAiConversation,
    selectAiConversation,
    deleteAiConversation,
    toggleSound: () => setSoundEnabled((value) => !value),
    setQuranAyahsPerPage: (value) => setQuranAyahsPerPageState(Math.max(1, Math.min(20, Math.round(value) || 1))),
    addParticipant: (name, pin = "1234") => {
      const next = addParticipantToList(participants, name, pin);
      if (next.length === participants.length) return;
      setParticipants(next);
      pushToast({ tone: "success", title: "تمت إضافة المشارك", body: "يمكنه الآن تسجيل الدخول بالـPIN الذي حدده المشرف." });
    },
    editParticipantName: (id, name) => {
      const next = renameParticipant(participants, id, name);
      if (next === participants) return;
      setParticipants(next);
      pushToast({ tone: "success", title: "تم حفظ الاسم", body: "سيظهر الاسم الجديد في اللوحة والترتيب والنشاط." });
    },
    setParticipantRole,
    deleteParticipant: (id) => {
      setParticipants((items) => deleteParticipantFromList(items, id));
      if (sessionParticipantId === id) setLocalSessionParticipantId(null);
      pushToast({ tone: "warning", title: "حُذف المشارك", body: "أزيلت بياناته من قائمة المجموعة المحلية." });
    },
    resetParticipantPin: (id) => {
      setParticipants((items) => setParticipantPinInList(items, id, "0000"));
      pushToast({ tone: "success", title: "تمت إعادة تعيين PIN", body: "أصبح رمز الدخول المؤقت 0000 ويمكن تغييره من الإعدادات." });
    },
    setParticipantPin,
    changeOwnPin,
    saveTaskDefinition,
    deleteTask,
    sendEncouragement,
    clearData,
    getParticipantTasks: (participantId) => applyRecords(taskDefinitions, recordsFor(stateSnapshotRef.current, participantId, today)),
    restoreClearedData,
    canRestoreClearedData: Boolean(clearBackup),
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}
