"use client";

import { useMemo, useState } from "react";
import { Bell, Check, CircleCheck, Info, MessageCircle, Moon, Palette, Send, SlidersHorizontal, Sparkles, Sun, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import { Badge, Button, EmptyState, IconButton, PageHeader, Tabs, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import { useTheme } from "@/state/ThemeContext";
import type { AppNotification } from "@/types/models";

type NotificationFilter = "all" | "unread" | "important";

function NotificationGlyph({ kind }: { kind: AppNotification["kind"] }) {
  if (kind === "success") return <CircleCheck size={21} />;
  if (kind === "warning") return <TriangleAlert size={21} />;
  if (kind === "ai") return <Sparkles size={21} />;
  return <Info size={21} />;
}

export function NotificationsView() {
  const { dismissNotification, markNotificationsRead, notifications } = useDemo();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const unread = notifications.filter((notification) => !notification.read).length;
  const shown = useMemo(() => notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter === "important") return notification.persistent || notification.kind === "warning";
    return true;
  }), [filter, notifications]);

  return <>
    <PageHeader eyebrow="مركز المتابعة" title="الإشعارات" description="تنبيهات مهمة تبقى واضحة، وتحديثات خفيفة لا تقاطع يومك." actions={<Button variant="outline" disabled={!unread} onClick={markNotificationsRead}><Check size={17} />تحديد الكل كمقروء</Button>} />
    <section className="notification-summary" aria-label="ملخص الإشعارات">
      <div><span className="summary-icon summary-primary"><Bell size={20} /></span><strong>{notifications.length}</strong><small>كل الإشعارات</small></div>
      <div><span className="summary-icon summary-teal"><Info size={20} /></span><strong>{unread}</strong><small>غير مقروءة</small></div>
      <div><span className="summary-icon summary-warning"><TriangleAlert size={20} /></span><strong>{notifications.filter((item) => item.persistent).length}</strong><small>تحتاج انتباهًا</small></div>
      <div><span className="summary-icon summary-success"><CircleCheck size={20} /></span><strong>{notifications.filter((item) => item.kind === "success").length}</strong><small>إنجازات</small></div>
    </section>
    <div className="utility-toolbar"><Tabs value={filter} onValueChange={setFilter} tabs={[{ value: "all", label: "الكل" }, { value: "unread", label: "غير المقروء" }, { value: "important", label: "المهم" }]} /></div>
    {shown.length ? <section className="notification-center" aria-live="polite">{shown.map((notification) => <article className={cn("notification-row", !notification.read && "notification-unread", notification.persistent && "notification-persistent")} key={notification.id}>
      <span className={cn("notification-glyph", `notification-${notification.kind}`)}><NotificationGlyph kind={notification.kind} /></span>
      <div><div className="notification-row-heading"><strong>{notification.title}</strong>{notification.persistent && <Badge tone="warning">مهم</Badge>}</div><p>{notification.body}</p><small>{notification.time}</small></div>
      <IconButton label={`إغلاق إشعار ${notification.title}`} onClick={() => dismissNotification(notification.id)}><X size={18} /></IconButton>
    </article>)}</section> : <EmptyState title="لا توجد إشعارات ضمن هذا العرض." description="ستظهر هنا التحديثات الجديدة والتنبيهات المهمة." />}
  </>;
}

export function MessagesView() {
  const { encouragements, pushToast } = useDemo();
  const [selectedId, setSelectedId] = useState(encouragements[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const selected = encouragements.find((message) => message.id === selectedId) ?? encouragements[0];
  const sendReply = () => {
    if (!reply.trim()) return;
    pushToast({ tone: "success", title: "أُرسل الرد التجريبي", body: "سيصل فعليًا بعد ربط نظام الرسائل." });
    setReply("");
  };

  return <>
    <PageHeader eyebrow="تشجيع متبادل" title="الرسائل" description="مساحة هادئة لرسائل الدعم، أجمل وأوضح من إشعار عابر." />
    <section className="messages-shell">
      <div className="message-inbox" aria-label="قائمة الرسائل">
        <div className="message-inbox-heading"><div><strong>الوارد</strong><span>{encouragements.length} رسائل</span></div><MessageCircle size={20} /></div>
        {encouragements.map((message) => <button type="button" className={cn("message-preview", selected?.id === message.id && "message-preview-active")} key={message.id} onClick={() => setSelectedId(message.id)}>
          <UserAvatar initials={message.initials} color={message.avatarColor} size="md" />
          <span><strong>{message.sender}</strong><small>{message.message}</small></span>
          <time>{message.time}</time>
        </button>)}
      </div>
      {selected ? <article className="message-detail">
        <header><UserAvatar initials={selected.initials} color={selected.avatarColor} size="lg" /><div><span>رسالة تشجيع من</span><h2>{selected.sender}</h2><time>{selected.time}</time></div><span className="message-spark"><Sparkles size={22} /></span></header>
        <blockquote>{selected.message}</blockquote>
        <div className="message-reply"><label htmlFor="encouragement-reply">رد قصير</label><div><textarea id="encouragement-reply" className="input" rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="اكتب ردًا لطيفًا..." /><Button onClick={sendReply} disabled={!reply.trim()}><Send size={17} />إرسال تجريبي</Button></div></div>
      </article> : <EmptyState title="لا توجد رسائل حتى الآن." />}
    </section>
  </>;
}

export function SettingsView() {
  const { activeParticipant, soundEnabled, toggleSound } = useDemo();
  const { theme, toggleTheme } = useTheme();
  const [fullMotion, setFullMotion] = useState(true);
  const toggleMotion = () => {
    const next = !fullMotion;
    setFullMotion(next);
    document.documentElement.classList.toggle("reduce-motion", !next);
  };

  return <>
    <PageHeader eyebrow="تفضيلاتك" title="الإعدادات" description="تحكم في مظهر التجربة وصوتها وحركتها من مكان واحد." />
    <section className="settings-profile"><UserAvatar initials={activeParticipant.initials} color={activeParticipant.avatarColor} size="xl" /><div><span>الحساب التجريبي</span><h2>{activeParticipant.name}</h2><p>هذه التفضيلات تخص الواجهة فقط في المرحلة الحالية.</p></div></section>
    <section className="settings-list">
      <article><span className="setting-symbol setting-primary"><Palette size={22} /></span><div><strong>المظهر</strong><p>ألوان متوازنة مشتقة من هوية الشعار.</p></div><button type="button" className="setting-control" onClick={toggleTheme}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}</span></button></article>
      <article><span className="setting-symbol setting-teal">{soundEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}</span><div><strong>أصوات التفاعل</strong><p>مؤثرات اختيارية للأحداث المهمة فقط.</p></div><button type="button" role="switch" aria-checked={soundEnabled} className={cn("toggle-control", soundEnabled && "toggle-control-active")} onClick={toggleSound}><span /></button></article>
      <article><span className="setting-symbol setting-warning"><SlidersHorizontal size={22} /></span><div><strong>الحركة الكاملة</strong><p>انتقالات قوية عند فتح الصفحات وإتمام الإنجازات.</p></div><button type="button" role="switch" aria-checked={fullMotion} className={cn("toggle-control", fullMotion && "toggle-control-active")} onClick={toggleMotion}><span /></button></article>
    </section>
  </>;
}
