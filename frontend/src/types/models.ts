export type UserRole = "participant" | "admin";
export type PresenceStatus = "active" | "paused" | "idle" | "offline";
export type DayStatus = "not_started" | "started" | "in_progress" | "almost_complete" | "complete";
export type TaskStatus = "not_started" | "running" | "paused" | "completed" | "partial" | "not_completed" | "closed";
export type TaskCategory =
  | "faith"
  | "culture"
  | "sport"
  | "growth"
  | "skill"
  | "life"
  | "family"
  | "health"
  | "character";
export type TaskType = "quran" | "prayer" | "adhkar" | "reading" | "sport" | "water" | "sleep" | "general";
export type NotificationKind = "success" | "warning" | "info" | "encouragement" | "ai";

export interface Participant {
  id: string;
  name: string;
  initials: string;
  avatarColor: "violet" | "teal" | "mint" | "amber";
  role: UserRole;
  presence: PresenceStatus;
  currentStatus: string;
  currentTask?: string;
  progress: number;
  streak: number;
  score: number;
  pin: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  type: TaskType;
  group?: "morning" | "evening";
  goalLabel: string;
  target: number;
  current: number;
  unit: string;
  durationMinutes?: number;
  actualMinutes: number;
  status: TaskStatus;
  supportingText?: string;
  scheduledTime?: string;
}

export interface DailyProgress {
  percent: number;
  completed: number;
  partial: number;
  remaining: number;
  total: number;
  actualMinutes: number;
}

export interface StreakDay {
  date: string;
  status: "successful" | "unsuccessful" | "today" | "future";
}

export interface Streak {
  current: number;
  best: number;
  successfulDays: number;
  history: StreakDay[];
}

export interface ActivityEvent {
  id: string;
  participantId: string;
  participantName: string;
  initials: string;
  avatarColor: Participant["avatarColor"];
  action: string;
  task: string;
  time: string;
  kind: "started" | "completed" | "paused" | "joined";
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  persistent?: boolean;
  read?: boolean;
}

export interface RankingEntry {
  participantId: string;
  rank: number;
  name: string;
  initials: string;
  avatarColor: Participant["avatarColor"];
  score: number;
  progress: number;
  streak: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  symbol: "emerald" | "continuity" | "quran" | "focus";
  participantName: string;
  initials: string;
  avatarColor: Participant["avatarColor"];
}

export interface Title {
  id: string;
  name: string;
  description: string;
  symbol: "emerald" | "continuity" | "quran" | "focus";
}

export interface ReportPoint {
  label: string;
  progress: number;
  minutes: number;
}

export interface Report {
  period: "daily" | "weekly" | "monthly";
  completionRate: number;
  totalMinutes: number;
  successfulDays: number;
  averageProgress: number;
  mostTimeConsumingTask: string;
  rankingSummary: string;
  points: ReportPoint[];
}

export interface EncouragementMessage {
  id: string;
  sender: string;
  initials: string;
  avatarColor: Participant["avatarColor"];
  message: string;
  time: string;
}

export interface AIMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  state?: "loading" | "error";
}

export interface AIConversationState {
  messages: AIMessage[];
  isOpen: boolean;
  isTyping: boolean;
  error?: string;
}
