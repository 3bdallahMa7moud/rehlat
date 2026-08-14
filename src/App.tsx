import { Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProvider } from './app/AppProvider'
import { lazyRoutes } from './app/routes'
import { useApp } from './app/useApp'

const {
  ActivityPage,
  AdminPage,
  AppShell,
  CommunityPage,
  InsightsPage,
  LoginPage,
  ProgressPage,
  ReportsPage,
  StreaksPage,
  TodayPage,
} = lazyRoutes

function RequireAuth() {
  const { currentParticipant } = useApp()
  return currentParticipant ? <Outlet /> : <Navigate to="/login" replace />
}

function RequireAdmin() {
  const { currentParticipant } = useApp()
  if (!currentParticipant) return <Navigate to="/login" replace />
  return currentParticipant.role === 'admin' ? <Outlet /> : <Navigate to="/app/today" replace />
}

function HomeRedirect() {
  const { currentParticipant } = useApp()
  return <Navigate to={currentParticipant ? '/app/today' : '/login'} replace />
}

function RouteFallback() {
  return (
    <main className="main-panel" aria-busy="true">
      <div className="page">
        <div className="panel p-5">
          <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
          <div className="mt-4 h-8 w-72 max-w-full rounded bg-[var(--surface-2)]" />
          <div className="mt-6 grid gap-3">
            <div className="h-20 rounded bg-[var(--surface-2)]" />
            <div className="h-20 rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Navigate to="/app/today" replace />} />
                <Route path="today" element={<TodayPage />} />
                <Route path="streaks" element={<StreaksPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route element={<RequireAdmin />}>
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}
