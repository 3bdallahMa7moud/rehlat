"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Copy, History as HistoryIcon, Lightbulb, LockKeyhole, Maximize2, Menu, Plus, RotateCcw, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import { useDemo } from "@/state/DemoContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/cn";
import styles from "./AIAssistant.module.css";

type AssistantConversationProps = {
  expanded?: boolean;
  onClose?: () => void;
  onToggleHistory?: () => void;
};

function AssistantIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={styles.identity}>
      <span className={cn(styles.avatar, compact && styles.avatarCompact)}>
        <BrandLogo decorative className={styles.brandLogo} />
        <i className={styles.onlineDot} aria-hidden="true" />
      </span>
      <div>
        <strong>رحلة التغيير</strong>
        <span className={styles.availability}><i aria-hidden="true" /> معك في خطوتك التالية</span>
      </div>
    </div>
  );
}

export function AssistantConversation({ expanded = false, onClose, onToggleHistory }: AssistantConversationProps) {
  const { ai, aiSuggestions, sendAiMessage, clearAiError, clearAiConversation } = useDemo();
  const [value, setValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerHintId = useId();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ai.messages, ai.isTyping]);

  useEffect(() => {
    if (!resetArmed) return;
    const timeout = window.setTimeout(() => setResetArmed(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [resetArmed]);

  useEffect(() => {
    if (!expanded) textareaRef.current?.focus();
  }, [expanded]);

  const resizeComposer = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, expanded ? 128 : 92)}px`;
  };

  const send = (message = value) => {
    const trimmed = message.trim();
    if (!trimmed || ai.isTyping) return;
    sendAiMessage(trimmed);
    setValue("");
    window.requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const resetConversation = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    clearAiConversation();
    setResetArmed(false);
    textareaRef.current?.focus();
  };

  const editLastMessage = () => {
    const lastUserMessage = [...ai.messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) setValue(lastUserMessage.content);
    clearAiError();
    window.requestAnimationFrame(() => {
      resizeComposer();
      textareaRef.current?.focus();
    });
  };

  const visibleSuggestions = expanded ? aiSuggestions.slice(0, 3) : aiSuggestions.slice(0, 2);

  return (
    <section className={cn(styles.conversation, expanded ? styles.conversationExpanded : styles.conversationCompact)} aria-label="المحادثة مع مساعد رحلة التغيير">
      <header className={styles.conversationHeader}>
        <div className={styles.headerLead}>
          {expanded && onToggleHistory && (
            <button type="button" className={cn(styles.iconAction, styles.historyToggle)} onClick={onToggleHistory} aria-label="فتح سجل المحادثات">
              <Menu size={19} />
            </button>
          )}
          <AssistantIdentity compact={!expanded} />
        </div>
        <div className={styles.headerActions}>
          {!expanded && (
            <Link href="/ai" className={styles.iconAction} aria-label="فتح صفحة المساعد كاملة" title="فتح بالحجم الكامل">
              <Maximize2 size={17} />
            </Link>
          )}
          {ai.messages.length > 0 && (
            <button
              type="button"
              className={cn(styles.resetButton, resetArmed && styles.resetButtonArmed)}
              onClick={resetConversation}
              aria-label={resetArmed ? "اضغط مرة أخرى لتأكيد مسح المحادثة" : "بدء محادثة جديدة"}
            >
              <RotateCcw size={15} />
              <span>{resetArmed ? "تأكيد المسح" : "محادثة جديدة"}</span>
            </button>
          )}
          {onClose && (
            <button type="button" className={styles.iconAction} onClick={onClose} aria-label="إغلاق المساعد" title="إغلاق">
              <X size={19} />
            </button>
          )}
        </div>
      </header>

      <div className={styles.messages} role="log" aria-live="polite" aria-relevant="additions">
        {!ai.messages.length && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}><Sparkles size={24} /></span>
            <strong>بماذا تحب أن نبدأ؟</strong>
            <p>احكِ لي ما يشغلك، وسنحوّله معًا إلى خطوة صغيرة وواضحة.</p>
          </div>
        )}

        {ai.messages.map((message) => (
          <article
            key={message.id}
            className={cn(styles.message, message.role === "user" ? styles.userMessage : styles.assistantMessage)}
            aria-label={message.role === "assistant" ? "رد المساعد" : "رسالتك"}
          >
            {message.role === "assistant" && (
              <span className={styles.messageAvatar}><BrandLogo decorative className={styles.brandLogo} /></span>
            )}
            <div className={styles.messageBody}>
              <div className={styles.bubble}><p>{message.content}</p></div>
              <div className={styles.messageMeta}>
                <time>{message.createdAt}</time>
                {message.role === "assistant" && (
                  <button type="button" onClick={() => copyMessage(message.id, message.content)} aria-label="نسخ الرد">
                    {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === message.id ? "تم النسخ" : "نسخ"}</span>
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}

        {ai.isTyping && (
          <div className={cn(styles.message, styles.assistantMessage)} aria-label="المساعد يكتب">
            <span className={styles.messageAvatar}><BrandLogo decorative className={styles.brandLogo} /></span>
            <div className={cn(styles.bubble, styles.typingBubble)}>
              <span className={styles.typingDots} aria-hidden="true"><i /><i /><i /></span>
              <span>يرتّب لك أفضل خطوة…</span>
            </div>
          </div>
        )}

        {ai.error && (
          <div className={styles.errorState} role="alert">
            <div><span>!</span><p><strong>لم يكتمل الرد</strong>{ai.error}</p></div>
            <button type="button" onClick={editLastMessage}>مراجعة الرسالة</button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.composerArea}>
        <div className={styles.suggestions} aria-label="اقتراحات جاهزة">
          <span><Lightbulb size={14} /> جرّب أن تسأل</span>
          <div>
            {visibleSuggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => send(suggestion)} disabled={ai.isTyping}>
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); send(); }}>
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            maxLength={500}
            onChange={(event) => { setValue(event.target.value); resizeComposer(); }}
            onKeyDown={handleKeyDown}
            placeholder="اكتب ما تفكّر فيه…"
            aria-label="رسالة إلى مساعد رحلة التغيير"
            aria-describedby={composerHintId}
          />
          <button type="submit" className={styles.sendButton} disabled={!value.trim() || ai.isTyping} aria-label="إرسال الرسالة">
            <Send size={19} />
          </button>
        </form>
        <div className={styles.composerFooter} id={composerHintId}>
          <span><LockKeyhole size={12} /> محادثتك خاصة بهذه الجلسة</span>
          <span className={styles.keyboardHint}><kbd>Enter</kbd> للإرسال · <kbd>Shift + Enter</kbd> لسطر جديد</span>
        </div>
      </div>
    </section>
  );
}

export function AIAssistantWidget() {
  const { ai, openAi, closeAi } = useDemo();
  const pathname = usePathname();

  useEffect(() => {
    if (!ai.isOpen) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeAi();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [ai.isOpen, closeAi]);

  if (pathname === "/ai") return null;

  return (
    <>
      <button type="button" className={styles.fab} aria-label="فتح مساعد رحلة التغيير" title="مساعد رحلة التغيير" onClick={openAi} aria-expanded={ai.isOpen}>
        <span className={styles.fabLogo}><BrandLogo decorative className={styles.brandLogo} /></span>
        <span className={styles.fabCopy}><strong>مساعدك</strong><small>جاهز لخطوتك التالية</small></span>
        <Sparkles size={15} className={styles.fabSparkle} aria-hidden="true" />
      </button>
      {ai.isOpen && (
        <div className={styles.widgetBackdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) closeAi(); }}>
          <div className={styles.widget} role="dialog" aria-modal="true" aria-label="مساعد رحلة التغيير">
            <AssistantConversation onClose={closeAi} />
          </div>
        </div>
      )}
    </>
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(date);
}

function ChatHistory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ai, aiConversations, activeAiConversationId, startAiConversation, selectAiConversation, deleteAiConversation } = useDemo();
  const [query, setQuery] = useState("");
  const filteredConversations = aiConversations.filter((conversation) => conversation.title.includes(query.trim()));

  const createConversation = () => {
    startAiConversation();
    onClose();
  };

  const chooseConversation = (conversationId: string) => {
    selectAiConversation(conversationId);
    onClose();
  };

  return (
    <>
      <button type="button" className={cn(styles.historyBackdrop, open && styles.historyBackdropOpen)} onClick={onClose} aria-label="إغلاق سجل المحادثات" />
      <aside className={cn(styles.historyPanel, open && styles.historyPanelOpen)} aria-label="سجل المحادثات">
        <div className={styles.historyHeader}>
          <div><h1>المحادثات</h1><span>{aiConversations.length} محفوظة</span></div>
          <button type="button" className={styles.historyClose} onClick={onClose} aria-label="إغلاق سجل المحادثات"><X size={18} /></button>
        </div>

        <button type="button" className={styles.newChatButton} onClick={createConversation} disabled={ai.isTyping}>
          <Plus size={17} />
          <span>محادثة جديدة</span>
        </button>

        <label className={styles.historySearch}>
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">ابحث في المحادثات</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المحادثات" />
        </label>

        <nav className={styles.historyList} aria-label="المحادثات السابقة">
          {filteredConversations.map((conversation) => (
            <div className={cn(styles.historyItem, conversation.id === activeAiConversationId && styles.historyItemActive)} key={conversation.id}>
              <button type="button" className={styles.historyItemMain} onClick={() => chooseConversation(conversation.id)} disabled={ai.isTyping}>
                <span className={styles.historyItemIcon}><HistoryIcon size={15} /></span>
                <span><strong>{conversation.title}</strong><small>{formatConversationTime(conversation.updatedAt)}</small></span>
              </button>
              <button type="button" className={styles.historyDelete} onClick={() => deleteAiConversation(conversation.id)} disabled={ai.isTyping} aria-label={`حذف ${conversation.title}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!filteredConversations.length && <p className={styles.historyEmpty}>لا توجد محادثة بهذا الاسم.</p>}
        </nav>

        <p className={styles.historyPrivacy}><LockKeyhole size={13} /> تُحفظ محادثاتك على هذا الجهاز فقط</p>
      </aside>
    </>
  );
}

export function AIAssistantHero() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <main className={styles.page}>
      <div className={styles.workspace}>
        <ChatHistory open={historyOpen} onClose={() => setHistoryOpen(false)} />
        <AssistantConversation expanded onToggleHistory={() => setHistoryOpen(true)} />
      </div>
    </main>
  );
}
