"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { activityEvents, achievements, aiSuggestions, encouragements, initialAiMessages, initialTasks, notifications as initialNotifications, participants as initialParticipants, rankingEntries, recentParticipantIds, reports, streak, titles } from "@/mocks";
import type { AIConversationState, Achievement, ActivityEvent, AppNotification, DayStatus, EncouragementMessage, Participant, RankingEntry, Report, Streak, Task, TaskStatus, Title } from "@/types/models";

type CompletionOutcome = "completed" | "partial" | "not_completed" | "closed";
type ToastTone = "success" | "warning" | "info" | "error";

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface FocusState {
  duration: number;
  secondsLeft: number;
  isRunning: boolean;
}

interface DemoContextValue {
  participants: Participant[];
  activeParticipant: Participant;
  selectedParticipantId: string;
  setSelectedParticipantId: (id: string) => void;
  dayStatus: DayStatus;
  tasks: Task[];
  activity: ActivityEvent[];
  rankings: RankingEntry[];
  reports: Record<Report["period"], Report>;
  streakData: Streak;
  achievements: Achievement[];
  titles: Title[];
  encouragements: EncouragementMessage[];
  aiSuggestions: string[];
  recentParticipantIds: string[];
  notifications: AppNotification[];
  ai: AIConversationState;
  focus: FocusState;
  soundEnabled: boolean;
  progress: { percent: number; completed: number; partial: number; remaining: number; total: number; actualMinutes: number };
  startDay: () => void;
  endDay: () => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  completeTask: (taskId: string, outcome: CompletionOutcome) => void;
  updateTaskProgress: (taskId: string, current: number) => void;
  chooseFocusDuration: (minutes: number) => void;
  startFocus: () => void;
  pauseFocus: () => void;
  finishFocus: () => void;
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
  toggleSound: () => void;
  editParticipantName: (id: string, name: string) => void;
  deleteParticipant: (id: string) => void;
  resetParticipantPin: (id: string) => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);
const soundListeners = new Set<() => void>();
let cachedSound: boolean | undefined;

function getSoundSnapshot() {
  if (cachedSound !== undefined) return cachedSound;
  cachedSound = window.localStorage.getItem("joc-sound") !== "false";
  return cachedSound;
}

function subscribeToSound(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "joc-sound") {
      cachedSound = undefined;
      listener();
    }
  };
  soundListeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    soundListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateSoundPreference(nextValue: boolean) {
  cachedSound = nextValue;
  window.localStorage.setItem("joc-sound", String(nextValue));
  soundListeners.forEach((listener) => listener());
}

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [selectedParticipantId, setSelectedParticipantId] = useState("razi");
  const [dayStatus, setDayStatus] = useState<DayStatus>("in_progress");
  const [tasks, setTasks] = useState(initialTasks);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const soundEnabled = useSyncExternalStore(subscribeToSound, getSoundSnapshot, () => true);
  const [focus, setFocus] = useState<FocusState>({ duration: 25, secondsLeft: 25 * 60, isRunning: false });
  const [ai, setAi] = useState<AIConversationState>({ messages: initialAiMessages, isOpen: false, isTyping: false });

  const activeParticipant = participants.find((participant) => participant.id === selectedParticipantId) ?? participants[0];

  const progress = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "completed").length;
    const partial = tasks.filter((task) => task.status === "partial").length;
    const remaining = tasks.filter((task) => ["not_started", "running", "paused"].includes(task.status)).length;
    const actualMinutes = tasks.reduce((total, task) => total + task.actualMinutes, 0);
    return {
      completed,
      partial,
      remaining,
      total: tasks.length,
      actualMinutes,
      percent: Math.round(((completed + partial * 0.55) / tasks.length) * 100),
    };
  }, [tasks]);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = createToastId();
    setToasts((items) => [...items, { ...toast, id }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4200);
  }, []);

  useEffect(() => {
    if (!focus.isRunning || focus.secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setFocus((current) => {
        if (current.secondsLeft <= 1) {
          window.clearInterval(timer);
          return { ...current, secondsLeft: 0, isRunning: false };
        }
        return { ...current, secondsLeft: current.secondsLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focus.isRunning, focus.secondsLeft]);

  const setTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks((items) => items.map((task) => task.id === taskId ? { ...task, status } : task));
    const message = status === "running" ? "بدأت المهمة" : status === "paused" ? "تم إيقاف المهمة مؤقتًا" : "تم استئناف المهمة";
    pushToast({ tone: "info", title: message, body: "ستتغير البيانات مباشرة في الوضع التجريبي." });
  };

  const completeTask = (taskId: string, outcome: CompletionOutcome) => {
    setTasks((items) => items.map((task) => {
      if (task.id !== taskId) return task;
      const target = outcome === "completed" ? task.target : outcome === "partial" ? Math.max(task.current, Math.ceil(task.target * 0.6)) : task.current;
      return {
        ...task,
        status: outcome,
        current: target,
        actualMinutes: outcome === "completed" ? Math.max(task.actualMinutes, task.durationMinutes ?? task.actualMinutes) : task.actualMinutes,
      };
    }));
    const copy: Record<CompletionOutcome, { title: string; body: string; tone: ToastTone }> = {
      completed: { title: "إنجاز جميل", body: "سُجلت المهمة مكتملة في يومك التجريبي.", tone: "success" },
      partial: { title: "تقدم محسوب", body: "سُجل الإنجاز الجزئي، وكل خطوة لها وزنها.", tone: "info" },
      not_completed: { title: "تم تسجيل الحالة", body: "غدًا فرصة جديدة من دون جلد للذات.", tone: "warning" },
      closed: { title: "أُغلقت المهمة", body: "لن تدخل في إنجاز اليوم.", tone: "info" },
    };
    pushToast(copy[outcome]);
  };

  const sendAiMessage = (message: string) => {
    if (!message.trim()) return;
    const userMessage = { id: `user-${Date.now()}`, role: "user" as const, content: message.trim(), createdAt: "الآن" };
    setAi((current) => ({ ...current, messages: [...current.messages, userMessage], isTyping: true, error: undefined }));
    window.setTimeout(() => {
      const response = message.includes("رياض")
        ? "أفاا 😅 ما ودك تخلص الرياضة يا بطل؟ ابدأ بعشر دقائق فقط، وبعدها قرر تكمل."
        : "ما شاء الله عليك! 🔥 اليوم ما خليت شيء، نرتب الخطوة الصغيرة القادمة ونكمل بهدوء.";
      setAi((current) => ({ ...current, isTyping: false, messages: [...current.messages, { id: `ai-${Date.now()}`, role: "assistant", content: response, createdAt: "الآن" }] }));
    }, 900);
  };

  const value: DemoContextValue = {
    participants,
    activeParticipant,
    selectedParticipantId,
    setSelectedParticipantId,
    dayStatus,
    tasks,
    activity: activityEvents,
    rankings: rankingEntries,
    reports,
    streakData: streak,
    achievements,
    titles,
    encouragements,
    aiSuggestions,
    recentParticipantIds,
    notifications,
    ai,
    focus,
    soundEnabled,
    progress,
    startDay: () => { setDayStatus("started"); pushToast({ tone: "success", title: "بدأت رحلة اليوم", body: "اختر أول مهمة وابدأ بخطوة بسيطة." }); },
    endDay: () => { setDayStatus("not_started"); setFocus((current) => ({ ...current, isRunning: false })); pushToast({ tone: "success", title: "أُنهى اليوم", body: "يمكنك بدء رحلة تجريبية جديدة متى شئت." }); },
    setTaskStatus,
    completeTask,
    updateTaskProgress: (taskId, current) => setTasks((items) => items.map((task) => task.id === taskId ? { ...task, current: Math.min(current, task.target) } : task)),
    chooseFocusDuration: (duration) => setFocus({ duration, secondsLeft: duration * 60, isRunning: false }),
    startFocus: () => setFocus((current) => ({ ...current, isRunning: true })),
    pauseFocus: () => setFocus((current) => ({ ...current, isRunning: false })),
    finishFocus: () => { setFocus((current) => ({ ...current, isRunning: false, secondsLeft: 0 })); pushToast({ tone: "success", title: "أحسنت التركيز", body: "تم إنهاء الجلسة التجريبية." }); },
    dismissNotification: (id) => setNotifications((items) => items.filter((item) => item.id !== id)),
    markNotificationsRead: () => setNotifications((items) => items.map((item) => ({ ...item, read: true }))),
    pushToast,
    toasts,
    dismissToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
    openAi: () => setAi((current) => ({ ...current, isOpen: true })),
    closeAi: () => setAi((current) => ({ ...current, isOpen: false })),
    sendAiMessage,
    triggerAiError: () => setAi((current) => ({ ...current, isTyping: false, error: "تعذر تجهيز الرد التجريبي. حاول مرة أخرى." })),
    clearAiError: () => setAi((current) => ({ ...current, error: undefined })),
    clearAiConversation: () => setAi((current) => ({ ...current, messages: [], isTyping: false, error: undefined })),
    toggleSound: () => updateSoundPreference(!soundEnabled),
    editParticipantName: (id, name) => { setParticipants((items) => items.map((participant) => participant.id === id ? { ...participant, name, initials: name.slice(0, 2) } : participant)); pushToast({ tone: "success", title: "تم حفظ الاسم", body: "تغير الاسم داخل بيانات العرض التجريبية." }); },
    deleteParticipant: (id) => { setParticipants((items) => items.filter((participant) => participant.id !== id)); pushToast({ tone: "warning", title: "حُذف المشارك", body: "هذا تغيير تجريبي وسيعود عند تحديث الصفحة." }); },
    resetParticipantPin: (id) => { const participant = participants.find((item) => item.id === id); pushToast({ tone: "info", title: "تمت إعادة تعيين PIN", body: participant ? `رمز ${participant.name} التجريبي أصبح 0000.` : "تم تحديث الرمز التجريبي." }); },
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used within DemoProvider");
  return context;
}
