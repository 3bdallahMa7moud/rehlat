"use client";

import { AdminActivityView, AdminDashboardView, AdminDataView, AdminParticipantDetailsView, AdminParticipantsView } from "@/components/features/AdminViews";
import { AdminTaskManager } from "@/components/features/AdminTaskStudio";
import { AiView, AnalyticsView, CompetitionView, DashboardView, FocusView, HistoryView, HonorsView, StreaksView, TaskActivityView, TasksView } from "@/components/features/ParticipantViews";
import { MessagesView, NotificationsView, SettingsView } from "@/components/features/UtilityViews";
import { RealReportsView } from "@/components/features/RealReportsView";
import { RealAdminReportsView } from "@/components/features/RealAdminReportsView";

export type ProductPageId = "dashboard" | "tasks" | "focus" | "streaks" | "competition" | "honors" | "analytics" | "history" | "reports" | "ai" | "notifications" | "messages" | "settings" | "admin-dashboard" | "admin-participants" | "admin-participant-detail" | "admin-tasks" | "admin-reports" | "admin-activity" | "admin-data";

export function ProductPage({ page, taskId, participantId, reportView }: { page: ProductPageId; taskId?: string; participantId?: string; reportView?: "overview" | "participants" }) {
  if (taskId) return <TaskActivityView taskId={taskId} />;
  if (page === "dashboard") return <DashboardView />;
  if (page === "tasks") return <TasksView />;
  if (page === "focus") return <FocusView />;
  if (page === "streaks") return <StreaksView />;
  if (page === "competition") return <CompetitionView />;
  if (page === "honors") return <HonorsView />;
  if (page === "analytics") return <AnalyticsView />;
  if (page === "history") return <HistoryView />;
  if (page === "reports") return <RealReportsView />;
  if (page === "ai") return <AiView />;
  if (page === "notifications") return <NotificationsView />;
  if (page === "messages") return <MessagesView />;
  if (page === "settings") return <SettingsView />;
  if (page === "admin-dashboard") return <AdminDashboardView />;
  if (page === "admin-participants") return <AdminParticipantsView />;
  if (page === "admin-participant-detail") return <AdminParticipantDetailsView participantId={participantId ?? ""} />;
  if (page === "admin-tasks") return <AdminTaskManager />;
  if (page === "admin-reports") return <RealAdminReportsView key={reportView} initialView={reportView} />;
  if (page === "admin-activity") return <AdminActivityView />;
  return <AdminDataView />;
}
