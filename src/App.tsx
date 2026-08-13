import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProvider } from './app/AppProvider'
import { useApp } from './app/useApp'
import { AppShell } from './components/layout/AppShell'
import { ActivityPage } from './pages/ActivityPage'
import { AdminPage } from './pages/AdminPage'
import { CommunityPage } from './pages/CommunityPage'
import { InsightsPage } from './pages/InsightsPage'
import { LoginPage } from './pages/LoginPage'
import { ProgressPage } from './pages/ProgressPage'
import { ReportsPage } from './pages/ReportsPage'
import { StreaksPage } from './pages/StreaksPage'
import { TodayPage } from './pages/TodayPage'

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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AppProvider>
  )
}
