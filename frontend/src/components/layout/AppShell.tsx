"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  ChartNoAxesCombined,
  CircleCheck,
  ClipboardList,
  Database,
  Flame,
  Focus,
  Info,
  LayoutDashboard,
  PanelRightClose,
  ListTodo,
  LogOut,
  Medal,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  TriangleAlert,
  Trophy,
  PanelRightOpen,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Badge, IconButton, LoadingState, StatusDot, ToastViewport, Tooltip, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import { useTheme } from "@/state/ThemeContext";
import type { NotificationKind } from "@/types/models";

import { AIAssistantWidget } from '@/components/features/AIAssistant';

let sidebarCollapsedMemory = false;

function AssistantBrandIcon({ className }: { size?: number; className?: string }) {
  return <BrandLogo decorative className={cn("assistant-nav-logo", className)} />;
}

const mainNavigation = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/tasks", label: "المهام", icon: ListTodo },
  { href: "/focus", label: "التركيز", icon: Focus },
  { href: "/competition", label: "الترتيب", icon: Trophy },
  { href: "/honors", label: "لوحة الشرف", icon: Medal },
  { href: "/streaks", label: "السلسلة", icon: Flame },
  { href: "/analytics", label: "تحليلي", icon: ChartNoAxesCombined },
  { href: "/reports", label: "التقارير", icon: BarChart3 },
  { href: "/history", label: "السجل", icon: ClipboardList },
  { href: "/ai", label: "المساعد", icon: AssistantBrandIcon },
];

const utilityNavigation = [
  { href: "/notifications", label: "الإشعارات", icon: Bell },
  { href: "/messages", label: "الرسائل", icon: MessageCircle },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

const adminNavigation = [
  { href: "/admin", label: "لوحة الإدارة", icon: LayoutDashboard },
  { href: "/admin/participants", label: "المشاركون", icon: Users },
  { href: "/admin/tasks", label: "إدارة المهام", icon: ListTodo },
  { href: "/admin/reports", label: "تقارير المشرف", icon: BarChart3 },
  { href: "/admin/activity", label: "النشاط", icon: Activity },
  { href: "/admin/data", label: "إدارة البيانات", icon: Database },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" || href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function NavLink({ href, label, icon: Icon, pathname }: { href: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; pathname: string }) {
  return <Link href={href} className={cn("shell-nav-link", isActive(pathname, href) && "shell-nav-active")}><Icon size={19} /><span>{label}</span></Link>;
}

function NoticeGlyph({ kind }: { kind: NotificationKind }) {
  if (kind === "success") return <CircleCheck size={16} />;
  if (kind === "warning") return <TriangleAlert size={16} />;
  if (kind === "ai") return <Sparkles size={16} />;
  if (kind === "encouragement") return <MessageCircle size={16} />;
  return <Info size={16} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { activeParticipant, notifications, markNotificationsRead, dismissNotification, soundEnabled, toggleSound, toasts, dismissToast, sessionReady, isAuthenticated, logout } = useDemo();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => sidebarCollapsedMemory);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;
  const isAdmin = activeParticipant.role === "admin";
  const isAdminRoute = pathname.startsWith("/admin");
  useEffect(() => {
    const storedValue = window.localStorage.getItem("joc-sidebar-collapsed");
    if (storedValue === null) return;
    const storedCollapsed = storedValue === "true";
    if (storedCollapsed === sidebarCollapsedMemory) return;
    const frame = window.requestAnimationFrame(() => {
      sidebarCollapsedMemory = storedCollapsed;
      setSidebarCollapsed(storedCollapsed);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleSidebar = () => {
    const nextValue = !sidebarCollapsed;
    sidebarCollapsedMemory = nextValue;
    window.localStorage.setItem("joc-sidebar-collapsed", String(nextValue));
    setSidebarCollapsed(nextValue);
  };

  useEffect(() => {
    if (!sessionReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (isAdminRoute && !isAdmin) router.replace("/forbidden");
  }, [isAdmin, isAdminRoute, isAuthenticated, router, sessionReady]);

  if (!sessionReady || !isAuthenticated || (isAdminRoute && !isAdmin)) {
    return <main className="route-guard-state"><LoadingState label="جارٍ التحقق من الجلسة..." /></main>;
  }

  return <div className={cn("app-shell", sidebarCollapsed && "sidebar-collapsed")}>
    <aside className="desktop-sidebar">
      <div className="sidebar-brand-row">
      <Link href="/dashboard" className="brand-lockup" aria-label="رحلة التغيير - الرئيسية">
        <BrandLogo decorative priority />
        <span><strong>رحلة التغيير</strong><small>JOURNEY OF CHANGE</small></span>
      </Link>
        <button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? "فتح السايد بار" : "قفل السايد بار"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "فتح السايد بار" : "قفل السايد بار"} onClick={toggleSidebar}>
          {sidebarCollapsed ? <PanelRightOpen size={17} /> : <PanelRightClose size={17} />}
        </button>
      </div>
      <nav className="shell-nav" aria-label="التنقل الرئيسي">{mainNavigation.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}</nav>
      {isAdmin && <><div className="sidebar-divider" /><p className="sidebar-label">الإدارة</p><nav className="shell-nav shell-nav-admin" aria-label="تنقل الإدارة">{adminNavigation.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}</nav></>}
      <div className="sidebar-bottom">
        <div className="sidebar-quick-links" aria-label="روابط سريعة">{utilityNavigation.map((item) => <Tooltip content={item.label} key={item.href}><Link href={item.href} aria-label={item.label} className={cn("sidebar-icon-link", isActive(pathname, item.href) && "sidebar-icon-active")}><item.icon size={18} /></Link></Tooltip>)}</div>
        {isAdmin && <Link href="/admin" className="admin-entry"><ShieldCheck size={18} /><span>مساحة المشرف</span></Link>}
        <Link href="/settings" className="account-entry"><UserAvatar initials={activeParticipant.initials} color={activeParticipant.avatarColor} size="sm" /><span><strong>{activeParticipant.name}</strong><small>{isAdmin ? "مشرف" : "مشارك"}</small></span></Link>
        <button type="button" className="admin-entry logout-entry" onClick={() => { logout(); router.replace("/login"); }}><LogOut size={18} /><span>تسجيل الخروج</span></button>
      </div>
    </aside>

    <div className="shell-content">
      <header className="topbar">
        <Link href="/dashboard" className="mobile-brand" aria-label="رحلة التغيير - الرئيسية"><BrandLogo decorative priority /><strong>رحلة التغيير</strong></Link>
        <div className="topbar-spacer" />
        <div className="topbar-actions">
          <Tooltip content={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}><IconButton label={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"} onClick={toggleTheme}>{theme === "light" ? <Moon size={19} /> : <Sun size={19} />}</IconButton></Tooltip>
          <Tooltip content={soundEnabled ? "كتم الأصوات" : "تفعيل الأصوات"}><IconButton label={soundEnabled ? "كتم الأصوات" : "تفعيل الأصوات"} onClick={toggleSound}>{soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</IconButton></Tooltip>
          <div className="notification-anchor">
            <IconButton label="الإشعارات" aria-expanded={notificationsOpen} onClick={() => { setNotificationsOpen((value) => !value); markNotificationsRead(); }}><Bell size={19} />{unread > 0 && <span className="notification-count">{unread}</span>}</IconButton>
            {notificationsOpen && <div className="notification-popover">
              <div><strong>الإشعارات</strong><Badge tone="teal">{notifications.length} إشعارات</Badge></div>
              {notifications.length ? notifications.slice(0, 3).map((notification) => <article key={notification.id}>
                <span className={cn("notice-icon", `notice-${notification.kind}`)}><NoticeGlyph kind={notification.kind} /></span>
                <div><strong>{notification.title}</strong><p>{notification.body}</p><small>{notification.time}</small></div>
                <IconButton label="إغلاق الإشعار" onClick={() => dismissNotification(notification.id)}><X size={16} /></IconButton>
              </article>) : <p className="notification-popover-empty">لا توجد إشعارات جديدة.</p>}
              <Link href="/notifications" className="notification-popover-link" onClick={() => setNotificationsOpen(false)}>عرض مركز الإشعارات</Link>
            </div>}
          </div>
          <Link href="/settings" className="topbar-user" aria-label="فتح إعدادات الحساب"><StatusDot status={activeParticipant.presence} /><UserAvatar initials={activeParticipant.initials} color={activeParticipant.avatarColor} size="sm" /></Link>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>

    <nav className="mobile-bottom-nav" aria-label="التنقل المحمول">
      <NavLink href="/dashboard" label="الرئيسية" icon={LayoutDashboard} pathname={pathname} />
      <NavLink href="/tasks" label="المهام" icon={ListTodo} pathname={pathname} />
      <NavLink href="/focus" label="التركيز" icon={Focus} pathname={pathname} />
      <NavLink href="/competition" label="الترتيب" icon={Trophy} pathname={pathname} />
      <button type="button" aria-expanded={moreOpen} className={cn("shell-nav-link", moreOpen && "shell-nav-active")} onClick={() => setMoreOpen(true)}><MoreHorizontal size={20} /><span>المزيد</span></button>
    </nav>

    {moreOpen && <div className="more-overlay" onMouseDown={() => setMoreOpen(false)}><section className="more-sheet" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sheet-handle" />
      <div className="more-sheet-header"><strong>المزيد</strong><IconButton label="إغلاق القائمة" onClick={() => setMoreOpen(false)}><X size={20} /></IconButton></div>
      <div className="more-links">{[...mainNavigation.slice(4), ...utilityNavigation, ...(isAdmin ? adminNavigation : [])].map((item) => <Link href={item.href} key={item.href} onClick={() => setMoreOpen(false)}><item.icon size={19} /><span>{item.label}</span></Link>)}</div>
      {isAdmin && <Link href="/admin" className="more-admin-link" onClick={() => setMoreOpen(false)}><ShieldCheck size={18} /> إدارة المجموعة</Link>}
      <button type="button" className="more-admin-link more-logout-link" onClick={() => { setMoreOpen(false); logout(); router.replace("/login"); }}><LogOut size={18} /> تسجيل الخروج</button>
    </section></div>}

    <AIAssistantWidget />
    <ToastViewport items={toasts} onDismiss={dismissToast} />
  </div>;
}
