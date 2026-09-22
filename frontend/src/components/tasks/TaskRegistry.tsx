"use client";

import { BookOpen, Droplets, Dumbbell, Moon, Sparkles, Target } from "lucide-react";
import type { Task, TaskType } from "@/types/models";

/** Typed payloads kept separate so a future API can validate each tracker. */
export type QuranTaskData = { type: "quran"; surah?: string; startPage?: number; endPage?: number };
export type PrayerTaskData = { type: "prayer"; prayers?: Array<{ name: string; completed: boolean; recordedAt?: string }> };
export type AdhkarTaskData = { type: "adhkar"; session?: "morning" | "evening" | "tasbeeh"; repetitions?: number };
export type ReadingTaskData = { type: "reading"; book?: string; startPage?: number; currentPage?: number; targetPage?: number };
export type SportTaskData = { type: "sport"; activity?: string; targetMinutes?: number; actualMinutes?: number };
export type WaterTaskData = { type: "water"; targetMl?: number; loggedMl?: number; lastAddedMl?: number };
export type SleepTaskData = { type: "sleep"; sleptAt?: string; wokeAt?: string; targetHours?: number; quality?: number };
export type GeneralTaskData = { type: "general"; notes?: string };
export type TaskPayload = QuranTaskData | PrayerTaskData | AdhkarTaskData | ReadingTaskData | SportTaskData | WaterTaskData | SleepTaskData | GeneralTaskData;

export interface TaskRegistryEntry {
  type: TaskType;
  title: string;
  description: string;
  icon: typeof BookOpen;
  fields: string[];
}

export const taskRegistry: Record<TaskType, TaskRegistryEntry> = {
  quran: { type: "quran", title: "القرآن", description: "اقرأ السورة وتفسيرها داخل الموقع، وسجّل الآيات التي أتممتها.", icon: BookOpen, fields: ["السورة أو الجزء", "صفحة البداية", "صفحة النهاية"] },
  prayer: { type: "prayer", title: "الصلاة", description: "الصلوات الخمس والسنن الرواتب في مهمة واحدة.", icon: Target, fields: ["الفجر", "الظهر", "العصر", "المغرب", "العشاء", "السنن الرواتب"] },
  adhkar: { type: "adhkar", title: "الأذكار والتسبيح", description: "اقرأ أذكار الصباح أو المساء داخل الموقع وسجّل ما أتممته.", icon: Sparkles, fields: ["نوع الجلسة", "هدف التكرار"] },
  reading: { type: "reading", title: "القراءة", description: "الكتاب والصفحة الحالية والهدف في مكان واحد.", icon: BookOpen, fields: ["اسم الكتاب", "الصفحة الحالية", "الصفحة المستهدفة"] },
  sport: { type: "sport", title: "الرياضة", description: "مدة مستهدفة ومؤقت قابل للإيقاف والاستئناف.", icon: Dumbbell, fields: ["نوع النشاط", "المدة المستهدفة", "المدة الفعلية"] },
  water: { type: "water", title: "شرب الماء", description: "سجل الكمية بالملليلتر مع Undo لآخر إضافة.", icon: Droplets, fields: ["الهدف اليومي", "الكمية المسجلة", "آخر إضافة"] },
  sleep: { type: "sleep", title: "النوم", description: "وقت النوم والاستيقاظ وحساب عبور منتصف الليل.", icon: Moon, fields: ["وقت النوم", "وقت الاستيقاظ", "جودة النوم"] },
  general: { type: "general", title: "مهمة عامة", description: "متتبع مرن لأي عادة أو هدف.", icon: Target, fields: ["الهدف", "ملاحظات"] },
};

export function getTaskRegistryEntry(task: Task): TaskRegistryEntry {
  return taskRegistry[task.type] ?? taskRegistry.general;
}

/** Guard used at the boundary before specialized trackers consume API data. */
export function isTaskOfType<T extends TaskType>(task: Task, type: T): task is Task & { type: T } {
  return task.type === type;
}
