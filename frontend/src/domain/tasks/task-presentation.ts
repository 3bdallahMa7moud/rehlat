import type { Task, TaskCategory, TaskStatus } from "@/types/models";

export type TaskListFilter = "all" | "morning" | "active";

export const taskCategoryNames: Record<TaskCategory, string> = {
  faith: "دين",
  culture: "ثقافة",
  sport: "رياضة",
  growth: "تطوير الذات",
  skill: "مهارة",
  life: "حياة",
  family: "أهل وبيت",
  health: "صحة",
  character: "أخلاق",
};

export const taskCategories = Object.keys(taskCategoryNames) as TaskCategory[];

export const taskCategoryTones: Record<TaskCategory, "primary" | "teal" | "warning" | "success"> = {
  faith: "primary",
  culture: "teal",
  sport: "warning",
  growth: "success",
  skill: "primary",
  life: "teal",
  family: "warning",
  health: "success",
  character: "primary",
};

export const activeTaskStatuses: TaskStatus[] = ["running", "paused", "partial"];

export function isActiveTask(task: Pick<Task, "status">) {
  return activeTaskStatuses.includes(task.status);
}

export function filterTasks(tasks: readonly Task[], filter: TaskListFilter, category: TaskCategory | "all") {
  return tasks.filter((task) => {
    const matchesList = filter === "all" || (filter === "morning" ? task.group === "morning" : isActiveTask(task));
    return matchesList && (category === "all" || task.category === category);
  });
}

export function getTaskPrimaryAction(status: TaskStatus) {
  const actions: Record<TaskStatus, string> = {
    not_started: "ابدأ المهمة",
    running: "متابعة المهمة",
    paused: "استئناف المهمة",
    partial: "أكمل المهمة",
    not_completed: "إعادة المحاولة",
    completed: "عرض التفاصيل",
    closed: "عرض التفاصيل",
  };
  return actions[status];
}

export function getTaskGuideCopy(status: TaskStatus) {
  const copy: Record<TaskStatus, { eyebrow: string; title: string; action: string }> = {
    not_started: { eyebrow: "خطوة البداية", title: "كيف تبدأ هذه المهمة؟", action: "ابدأ الآن" },
    running: { eyebrow: "المهمة جارية", title: "تابع من حيث توقفت", action: "العودة إلى المهمة" },
    paused: { eyebrow: "متوقفة مؤقتًا", title: "استأنف المهمة عندما تكون جاهزًا", action: "استئناف المهمة" },
    partial: { eyebrow: "إنجاز جزئي محفوظ", title: "أكمل المهمة بالقدر المناسب لك", action: "أكمل المهمة" },
    not_completed: { eyebrow: "الحالة محفوظة", title: "يمكنك المحاولة مجددًا", action: "إعادة المحاولة" },
    completed: { eyebrow: "مكتملة", title: "تم حفظ إنجازك", action: "عرض التقدم" },
    closed: { eyebrow: "أُغلقت بدون إنجاز", title: "الوقت والسجل محفوظان", action: "عرض التقدم" },
  };
  return copy[status];
}
