"use client";

import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleCheck, Info, LoaderCircle, SearchX, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PresenceStatus } from "@/types/models";

export function Button({ className, variant = "primary", size = "md", loading, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success"; size?: "sm" | "md" | "lg" | "icon"; loading?: boolean }) {
  return <button className={cn("button", `button-${variant}`, `button-${size}`, className)} disabled={disabled || loading} {...props}>{loading && <LoaderCircle className="animate-spin" size={18} />}{children}</button>;
}

export function IconButton({ label, className, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label: string; children: ReactNode }) {
  return <button aria-label={label} title={label} className={cn("icon-button", className)} {...props}>{children}</button>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }>(({ className, label, hint, error, id, ...props }, ref) => (
  <label className="field" htmlFor={id}>
    {label && <span className="field-label">{label}</span>}
    <input ref={ref} id={id} className={cn("input", error && "input-error", className)} {...props} />
    {(error || hint) && <span className={cn("field-hint", error && "field-error")}>{error ?? hint}</span>}
  </label>
));
Input.displayName = "Input";

export function Card({ children, className, padding = "md", ...props }: { children: ReactNode; className?: string; padding?: "none" | "sm" | "md" | "lg" } & HTMLAttributes<HTMLElement>) {
  return <section className={cn("app-card", `card-padding-${padding}`, className)} {...props}>{children}</section>;
}

const badgeLabels = { not_started: "لم تبدأ", running: "قيد التنفيذ", paused: "متوقفة مؤقتًا", completed: "مكتملة", partial: "إنجاز جزئي", not_completed: "لم تُنجز", closed: "أُغلقت بدون إنجاز", not_started_day: "لم يبدأ", started: "بدأ اليوم", in_progress: "جارٍ الإنجاز", almost_complete: "شبه مكتمل", complete: "مكتمل" };
export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "primary" | "teal" | "success" | "warning" | "danger"; children: ReactNode; className?: string }) { return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>; }
export function StatusBadge({ status }: { status: keyof typeof badgeLabels }) { const tone = status === "completed" || status === "complete" ? "success" : status === "paused" || status === "almost_complete" ? "warning" : status === "running" || status === "in_progress" || status === "started" ? "primary" : status === "not_completed" ? "neutral" : "neutral"; return <Badge tone={tone}>{badgeLabels[status]}</Badge>; }

export function UserAvatar({ initials, color = "navy", size = "md", online }: { initials: string; color?: "navy" | "teal" | "mint" | "amber"; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  return <span className={cn("avatar", `avatar-${color}`, `avatar-${size}`)} aria-label={initials}>{initials}{online && <span className="avatar-online" />}</span>;
}

export function StatusDot({ status, label }: { status: PresenceStatus; label?: string }) { return <span className="inline-flex items-center gap-2"><span className={cn("status-dot", `status-${status}`)} aria-hidden="true" />{label && <span>{label}</span>}</span>; }

export function Tooltip({ content, children }: { content: string; children: ReactNode }) { return <span className="tooltip-wrap" data-tooltip={content}>{children}</span>; }

export function ProgressBar({ value, tone = "primary", className }: { value: number; tone?: "primary" | "teal" | "success" | "warning"; className?: string }) { const percent = Math.max(0, Math.min(100, Math.round(value))); return <div className={cn("progress-track", className)} role="progressbar" aria-label={`التقدم ${percent}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}%`}><span className={cn("progress-fill", `progress-${tone}`)} style={{ width: `${percent}%` }} /></div>; }

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <div className="section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>; }
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) { return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>; }

export function Dialog({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: string; children?: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + "px";
    window.addEventListener("keydown", onKey);
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div ref={panelRef} className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
          <IconButton label="إغلاق" onClick={onClose}><X size={20} /></IconButton>
        </div>
        {children && <div className="dialog-content">{children}</div>}
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Tabs<T extends string>({ value, onValueChange, tabs }: { value: T; onValueChange: (value: T) => void; tabs: { value: T; label: string }[] }) { return <div className="tabs" role="tablist">{tabs.map((tab) => <button type="button" role="tab" aria-selected={value === tab.value} className={cn("tab", value === tab.value && "tab-active")} key={tab.value} onClick={() => onValueChange(tab.value)}>{tab.label}</button>)}</div>; }

export function Dropdown({ label, value, onChange, options, className }: { label?: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; className?: string }) { return <label className={cn("select-wrap", className)}>{label && <span className="sr-only">{label}</span>}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={17} aria-hidden="true" /></label>; }

export function Skeleton({ className }: { className?: string }) { return <span className={cn("skeleton", className)} />; }
export function LoadingState({ label = "جارٍ التحميل" }: { label?: string }) { return <div className="state-box"><LoaderCircle className="animate-spin text-[var(--primary)]" size={24} /><p>{label}</p></div>; }
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <div className="state-box"><SearchX className="text-[var(--muted)]" size={30} /><strong>{title}</strong>{description && <p>{description}</p>}{action}</div>; }
export function ErrorState({ title = "تعذر تحميل البيانات.", onRetry }: { title?: string; onRetry?: () => void }) { return <div className="state-box state-error"><TriangleAlert className="text-[var(--danger)]" size={30} /><strong>{title}</strong>{onRetry && <Button size="sm" variant="outline" onClick={onRetry}>إعادة المحاولة</Button>}</div>; }

export function NotificationIcon({ tone }: { tone: "success" | "warning" | "info" | "error" }) { if (tone === "success") return <CircleCheck size={20} />; if (tone === "warning" || tone === "error") return <TriangleAlert size={20} />; return <Info size={20} />; }
export function ToastViewport({ items, onDismiss }: { items: { id: string; title: string; body?: string; tone: "success" | "warning" | "info" | "error" }[]; onDismiss: (id: string) => void }) { return <div className="toast-viewport" aria-live="polite">{items.map((toast) => <div className={cn("toast", `toast-${toast.tone}`)} key={toast.id}><NotificationIcon tone={toast.tone} /><div><strong>{toast.title}</strong>{toast.body && <p>{toast.body}</p>}</div><IconButton label="إغلاق الإشعار" onClick={() => onDismiss(toast.id)}><X size={17} /></IconButton></div>)}</div>; }

export function PinInput({ value, onChange, onSubmit, error, loading, success, masked = true }: { value: string; onChange: (value: string) => void; onSubmit?: (code?: string) => void; error?: string; loading?: boolean; success?: boolean; masked?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: 4 }, (_, index) => value[index] ?? "");
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  const update = (index: number, input: string) => {
    const digits = input.replace(/\D/g, "");
    if (!digits) {
      const next = chars.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }
    const nextChar = digits.length > 1 ? digits.slice(-1) : digits[0];
    const next = chars.slice();
    next[index] = nextChar;
    if (digits.length > 1 && input.length > 1) {
      digits.slice(0, 4).split("").forEach((d, offset) => {
        if (index + offset < 4) next[index + offset] = d;
      });
    }
    const joined = next.join("");
    onChange(joined);
    const target = Math.min(index + 1, 3);
    refs.current[target]?.focus();
    if (joined.length === 4) window.setTimeout(() => onSubmit?.(joined), 40);
  };
  return (
    <div className="pin-root">
      <div className="pin-inputs" dir="ltr">
        {chars.map((char, index) => (
          <input
            key={index}
            ref={(element) => { refs.current[index] = element; }}
            aria-label={`الرقم ${index + 1}`}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            value={char}
            type={masked ? "password" : "text"}
            onChange={(event) => update(index, event.target.value)}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
              if (pasted) {
                onChange(pasted);
                refs.current[Math.min(pasted.length, 3)]?.focus();
                if (pasted.length === 4) window.setTimeout(() => onSubmit?.(pasted), 40);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace") {
                if (!chars[index] && index > 0) {
                  event.preventDefault();
                  const next = chars.slice();
                  next[index - 1] = "";
                  onChange(next.join(""));
                  refs.current[index - 1]?.focus();
                }
              } else if (event.key === "ArrowLeft" && index > 0) {
                refs.current[index - 1]?.focus();
              } else if (event.key === "ArrowRight" && index < 3) {
                refs.current[index + 1]?.focus();
              } else if (event.key === "Enter" && value.length === 4) {
                event.preventDefault();
                onSubmit?.(value);
              }
            }}
            className={cn("pin-cell", error && "pin-error", success && "pin-success")}
            maxLength={2}
            disabled={loading}
          />
        ))}
      </div>
      {error && <p className="field-error text-center">{error}</p>}
      {success && <p className="pin-success-copy"><Check size={16} /> تم التحقق بنجاح</p>}
    </div>
  );
}
