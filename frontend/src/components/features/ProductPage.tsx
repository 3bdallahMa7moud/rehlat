"use client";

import { AdminActivityView, AdminAnalyticsView, AdminDataView, AdminParticipantDetailsView, AdminParticipantsView, AdminTasksView } from "@/components/features/AdminViews";
import { AiView, AnalyticsView, CompetitionView, DashboardView, FocusView, HistoryView, HonorsView, ReportsView, StreaksView, TaskActivityView, TasksView } from "@/components/features/ParticipantViews";
import { MessagesView, NotificationsView, SettingsView } from "@/components/features/UtilityViews";
import type { TaskType } from "@/types/models";

export type ProductPageId = "dashboard" | "tasks" | "focus" | "streaks" | "competition" | "honors" | "analytics" | "history" | "reports" | "ai" | "notifications" | "messages" | "settings" | "admin-participants" | "admin-participant-detail" | "admin-tasks" | "admin-analytics" | "admin-activity" | "admin-data";

export function ProductPage({ page, taskType, participantId }: { page: ProductPageId; taskType?: TaskType; participantId?: string }) {
  if (taskType) return <TaskActivityView type={taskType} />;
  if (page === "dashboard") return <DashboardView />;
  if (page === "tasks") return <TasksView />;
  if (page === "focus") return <FocusView />;
  if (page === "streaks") return <StreaksView />;
  if (page === "competition") return <CompetitionView />;
  if (page === "honors") return <HonorsView />;
  if (page === "analytics") return <AnalyticsView />;
  if (page === "history") return <HistoryView />;
  if (page === "reports") return <ReportsView />;
  if (page === "ai") return <AiView />;
  if (page === "notifications") return <NotificationsView />;
  if (page === "messages") return <MessagesView />;
  if (page === "settings") return <SettingsView />;
  if (page === "admin-participants") return <AdminParticipantsView />;
  if (page === "admin-participant-detail") return <AdminParticipantDetailsView participantId={participantId ?? ""} />;
  if (page === "admin-tasks") return <AdminTasksView />;
  if (page === "admin-analytics") return <AdminAnalyticsView />;
  if (page === "admin-activity") return <AdminActivityView />;
  return <AdminDataView />;
}
