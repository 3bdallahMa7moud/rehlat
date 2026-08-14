import { lazy } from 'react'

const loadAppShell = () => import('../components/layout/AppShell').then(({ AppShell }) => ({ default: AppShell }))
const loadActivityPage = () => import('../pages/ActivityPage').then(({ ActivityPage }) => ({ default: ActivityPage }))
const loadAdminPage = () => import('../pages/AdminPage').then(({ AdminPage }) => ({ default: AdminPage }))
const loadCommunityPage = () => import('../pages/CommunityPage').then(({ CommunityPage }) => ({ default: CommunityPage }))
const loadInsightsPage = () => import('../pages/InsightsPage').then(({ InsightsPage }) => ({ default: InsightsPage }))
const loadLoginPage = () => import('../pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage }))
const loadProgressPage = () => import('../pages/ProgressPage').then(({ ProgressPage }) => ({ default: ProgressPage }))
const loadReportsPage = () => import('../pages/ReportsPage').then(({ ReportsPage }) => ({ default: ReportsPage }))
const loadStreaksPage = () => import('../pages/StreaksPage').then(({ StreaksPage }) => ({ default: StreaksPage }))
const loadTodayPage = () => import('../pages/TodayPage').then(({ TodayPage }) => ({ default: TodayPage }))

export const lazyRoutes = {
  AppShell: lazy(loadAppShell),
  ActivityPage: lazy(loadActivityPage),
  AdminPage: lazy(loadAdminPage),
  CommunityPage: lazy(loadCommunityPage),
  InsightsPage: lazy(loadInsightsPage),
  LoginPage: lazy(loadLoginPage),
  ProgressPage: lazy(loadProgressPage),
  ReportsPage: lazy(loadReportsPage),
  StreaksPage: lazy(loadStreaksPage),
  TodayPage: lazy(loadTodayPage),
}

const preloaders: Record<string, () => Promise<unknown>> = {
  '/login': loadLoginPage,
  '/app/today': loadTodayPage,
  '/app/streaks': loadStreaksPage,
  '/app/progress': loadProgressPage,
  '/app/community': loadCommunityPage,
  '/app/insights': loadInsightsPage,
  '/app/reports': loadReportsPage,
  '/app/activity': loadActivityPage,
  '/app/admin': loadAdminPage,
}

export function preloadRoute(to: string) {
  void preloaders[to]?.()
}
