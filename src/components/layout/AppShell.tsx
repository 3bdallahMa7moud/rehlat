import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
import type { ReactNode } from 'react'
import { useApp } from '../../app/useApp'
import { Brand } from '../Brand'
import { Avatar, Badge, Button, IconButton, Menu, Modal } from '../ui'
import { text } from '../../utils/text'
import { useState } from 'react'
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
  { to: '/app/today', labelAr: 'اليوم', labelEn: 'Today', icon: <CalendarCheck size={19} />, mobilePrimary: true },
  { to: '/app/streaks', labelAr: 'الستريك', labelEn: 'Streaks', icon: <Trophy size={19} /> },
  { to: '/app/progress', labelAr: 'التقدم', labelEn: 'Progress', icon: <BarChart3 size={19} />, mobilePrimary: true },
  { to: '/app/community', labelAr: 'المجموعة', labelEn: 'Community', icon: <Users size={19} />, mobilePrimary: true },
  { to: '/app/insights', labelAr: 'التحليل', labelEn: 'Insights', icon: <ChartNoAxesCombined size={19} /> },
  { to: '/app/reports', labelAr: 'التقارير', labelEn: 'Reports', icon: <ClipboardList size={19} /> },
  { to: '/app/activity', labelAr: 'سجل الأحداث', labelEn: 'Activity', icon: <Activity size={19} /> },
  { to: '/app/admin', labelAr: 'الإدارة', labelEn: 'Admin', icon: <Shield size={19} />, adminOnly: true },
]

function navLabel(item: NavItem, language: 'ar' | 'en') {
  return language === 'ar' ? item.labelAr : item.labelEn
}

function usePageTitle() {
  const { state } = useApp()
  const location = useLocation()
  const item = navItems.find((nav) => location.pathname.startsWith(nav.to))
  return item ? navLabel(item, state.language) : text(state.language, 'رحلة التغيير', 'Journey of Change')
}

export function AppShell() {
  const { state, currentParticipant, setLanguage, setTheme, signOut } = useApp()
  const navigate = useNavigate()
  const title = usePageTitle()
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
        <nav className="mt-8 grid gap-1" aria-label={text(language, 'التنقل الرئيسي', 'Main navigation')}>
          {availableNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('nav-link', isActive && 'active')}>
              {item.icon}
              <span>{navLabel(item, language)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-3 border-t border-[var(--line)] pt-5">
          <div className="flex items-center gap-3">
            <Avatar name={currentParticipant.name} color={currentParticipant.avatar} />
            <div className="min-w-0">
              <div className="truncate font-black">{language === 'ar' ? currentParticipant.name : currentParticipant.nameEn}</div>
              <div className="mt-1 flex gap-1">
                <Badge tone={currentParticipant.role === 'admin' ? 'gold' : 'neutral'}>
                  {currentParticipant.role === 'admin' ? text(language, 'مشرف', 'Admin') : text(language, 'مشارك', 'Participant')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <IconButton label={text(language, 'تبديل اللغة', 'Switch language')} onClick={toggleLanguage}>
              <Languages size={18} />
            </IconButton>
            <IconButton label={text(language, 'تبديل الوضع', 'Switch theme')} onClick={toggleTheme}>
              {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
            <IconButton label={text(language, 'تسجيل الخروج', 'Sign out')} onClick={() => { signOut(); navigate('/login') }}>
              <LogOut size={18} />
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
          <div className="mb-4 hidden items-center justify-between border-b border-[var(--line)] pb-4 lg:flex">
            <div>
              <p className="eyebrow">{text(language, 'المساحة الحالية', 'Current workspace')}</p>
              <p className="mt-1 text-lg font-black">{title}</p>
            </div>
            <Menu label={text(language, 'قائمة المستخدم', 'User menu')} language={language}>
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
          <Outlet />
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
          <MenuIcon size={19} />
          <span>{text(language, 'المزيد', 'More')}</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={text(language, 'المزيد', 'More')}>
        <div className="grid gap-2">
          {mobileMore.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              className="justify-start"
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
          <Button variant="ghost" className="justify-start" onClick={() => { toggleLanguage(); setMoreOpen(false) }}>
            <Languages size={18} />
            {text(language, 'تبديل اللغة', 'Switch language')}
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => { toggleTheme(); setMoreOpen(false) }}>
            {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {text(language, 'تبديل الوضع', 'Switch theme')}
          </Button>
          <Button variant="danger" className="justify-start" onClick={() => { signOut(); setMoreOpen(false); navigate('/login') }}>
            <LogOut size={18} />
            {text(language, 'تسجيل الخروج', 'Sign out')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
