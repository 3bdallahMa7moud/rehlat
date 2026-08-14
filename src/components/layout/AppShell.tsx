import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Languages,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Shield,
  Sun,
  Trophy,
  Users,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../../app/useApp'
import { Brand } from '../Brand'
import { Avatar, Button, IconButton, Menu, Modal } from '../ui'
import { text } from '../../utils/text'
import { cx } from '../../utils/cx'

type NavItem = {
  to: string
  labelAr: string
  labelEn: string
  icon: ReactNode
  adminOnly?: boolean
  mobilePrimary?: boolean
}

const navItems: NavItem[] = [
  { to: '/app/today', labelAr: 'اليوم', labelEn: 'Today', icon: <CalendarCheck size={18} />, mobilePrimary: true },
  { to: '/app/streaks', labelAr: 'الستريك', labelEn: 'Streaks', icon: <Trophy size={18} /> },
  { to: '/app/progress', labelAr: 'التقدم', labelEn: 'Progress', icon: <BarChart3 size={18} />, mobilePrimary: true },
  { to: '/app/community', labelAr: 'المجموعة', labelEn: 'Community', icon: <Users size={18} />, mobilePrimary: true },
  { to: '/app/insights', labelAr: 'التحليل', labelEn: 'Insights', icon: <ChartNoAxesCombined size={18} /> },
  { to: '/app/reports', labelAr: 'التقارير', labelEn: 'Reports', icon: <ClipboardList size={18} /> },
  { to: '/app/activity', labelAr: 'سجل الأحداث', labelEn: 'Activity', icon: <Activity size={18} /> },
  { to: '/app/admin', labelAr: 'الإدارة', labelEn: 'Admin', icon: <Shield size={18} />, adminOnly: true },
]

function navLabel(item: NavItem, language: 'ar' | 'en') {
  return language === 'ar' ? item.labelAr : item.labelEn
}

function PageFallback() {
  return (
    <div className="panel p-5" aria-busy="true">
      <div className="h-4 w-32 rounded bg-[var(--surface-2)]" />
      <div className="mt-4 h-8 w-72 max-w-full rounded bg-[var(--surface-2)]" />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="h-28 rounded bg-[var(--surface-2)]" />
        <div className="h-28 rounded bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

export function AppShell() {
  const { state, currentParticipant, setLanguage, setTheme, signOut } = useApp()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  if (!currentParticipant) return null
  const language = state.language
  const availableNav = navItems.filter((item) => !item.adminOnly || currentParticipant.role === 'admin')
  const mobileMain = availableNav.filter((item) => item.mobilePrimary)
  const mobileMore = availableNav.filter((item) => !item.mobilePrimary)

  const toggleLanguage = () => setLanguage(language === 'ar' ? 'en' : 'ar')
  const toggleTheme = () => setTheme(state.theme === 'light' ? 'dark' : 'light')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand language={language} />
        <nav className="mt-6 grid gap-1" aria-label={text(language, 'التنقل الرئيسي', 'Main navigation')}>
          {availableNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('nav-link', isActive && 'active')}>
              {item.icon}
              <span>{navLabel(item, language)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 border-t border-[var(--line)] pt-4">
          <div className="panel-soft flex items-center gap-3 p-3">
            <Avatar name={currentParticipant.name} color={currentParticipant.avatar} />
            <div className="min-w-0">
              <div className="truncate font-bold text-sm">{language === 'ar' ? currentParticipant.name : currentParticipant.nameEn}</div>
              <div className="mt-0.5 text-xs font-medium text-[var(--ink-3)]">
                {currentParticipant.role === 'admin' ? text(language, 'مشرف', 'Admin') : text(language, 'مشارك', 'Participant')}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2" aria-label={text(language, 'أدوات الحساب', 'Account utilities')}>
            <IconButton label={text(language, 'تبديل اللغة', 'Switch language')} onClick={toggleLanguage}>
              <Languages size={17} />
            </IconButton>
            <IconButton label={text(language, 'تبديل الوضع', 'Switch theme')} onClick={toggleTheme}>
              {state.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </IconButton>
            <IconButton label={text(language, 'تسجيل الخروج', 'Sign out')} onClick={() => { signOut(); navigate('/login') }}>
              <LogOut size={17} />
            </IconButton>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="page page-wide">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <Brand language={language} compact />
            <div className="flex items-center gap-1">
              <IconButton label={text(language, 'تبديل اللغة', 'Switch language')} onClick={toggleLanguage}>
                <Languages size={18} />
              </IconButton>
              <IconButton label={text(language, 'تبديل الوضع', 'Switch theme')} onClick={toggleTheme}>
                {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </IconButton>
            </div>
          </div>
          <div className="shell-utilitybar mb-4 hidden items-center justify-end gap-3 border-b border-[var(--line)] pb-3.5 lg:flex">
            <div className="flex min-w-0 items-center gap-3 text-sm">
              <Avatar name={currentParticipant.name} color={currentParticipant.avatar} size="sm" />
              <div className="min-w-0">
                <div className="truncate font-bold text-sm">{language === 'ar' ? currentParticipant.name : currentParticipant.nameEn}</div>
                <div className="text-xs font-medium text-[var(--ink-3)]">
                  {currentParticipant.role === 'admin' ? text(language, 'مشرف', 'Admin') : text(language, 'مشارك', 'Participant')}
                </div>
              </div>
            </div>
            <Menu label={text(language, 'قائمة الأدوات', 'Utility menu')} language={language}>
              {(close) => (
                <>
                  <button type="button" role="menuitem" onClick={() => { toggleLanguage(); close() }}>
                    <Languages size={15} />
                    {text(language, 'تبديل اللغة', 'Switch language')}
                  </button>
                  <button type="button" role="menuitem" onClick={() => { toggleTheme(); close() }}>
                    {state.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                    {text(language, 'تبديل الوضع', 'Switch theme')}
                  </button>
                  <button type="button" role="menuitem" onClick={() => { signOut(); close(); navigate('/login') }}>
                    <LogOut size={15} />
                    {text(language, 'تسجيل الخروج', 'Sign out')}
                  </button>
                </>
              )}
            </Menu>
          </div>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <nav className="mobile-nav" aria-label={text(language, 'تنقل الجوال', 'Mobile navigation')}>
        {mobileMain.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cx(isActive && 'active')}>
            {item.icon}
            <span>{navLabel(item, language)}</span>
          </NavLink>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} aria-label={text(language, 'المزيد من الصفحات', 'More pages')}>
          <MenuIcon size={18} />
          <span>{text(language, 'المزيد', 'More')}</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={text(language, 'المزيد', 'More')}>
        <div className="grid gap-2">
          {mobileMore.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              className="justify-start min-h-[44px]"
              onClick={() => {
                setMoreOpen(false)
                navigate(item.to)
              }}
            >
              {item.icon}
              {navLabel(item, language)}
            </Button>
          ))}
          <div className="my-2 border-t border-[var(--line)]" />
          <Button variant="ghost" className="justify-start min-h-[44px]" onClick={() => { toggleLanguage(); setMoreOpen(false) }}>
            <Languages size={17} />
            {text(language, 'تبديل اللغة', 'Switch language')}
          </Button>
          <Button variant="ghost" className="justify-start min-h-[44px]" onClick={() => { toggleTheme(); setMoreOpen(false) }}>
            {state.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            {text(language, 'تبديل الوضع', 'Switch theme')}
          </Button>
          <Button variant="danger" className="justify-start min-h-[44px]" onClick={() => { signOut(); setMoreOpen(false); navigate('/login') }}>
            <LogOut size={17} />
            {text(language, 'تسجيل الخروج', 'Sign out')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

