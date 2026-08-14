import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Check, ChevronDown, MoreVertical } from 'lucide-react'
import type { Language } from '../types'
import { initials, text } from '../utils/text'
import { cx } from '../utils/cx'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'default', size = 'md', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cx('btn', variant !== 'default' && variant, size === 'sm' && 'sm', className)} {...props} />
}

export function IconButton({ label, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('icon-btn', className)} {...props}>
      {children}
    </button>
  )
}

export function Badge({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'gold'; children: ReactNode; className?: string }) {
  return <span className={cx('badge', tone !== 'neutral' && tone, className)}>{children}</span>
}

export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-13 w-13 text-base' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-lg font-bold text-white shadow-sm', dimensions)}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon ? <div className="text-[var(--accent)]">{icon}</div> : null}
      <div>
        <h3 className="text-base font-bold text-[var(--ink)]">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--ink-2)]">{body}</p>
      </div>
      {action}
    </div>
  )
}

export function KpiBand({
  items,
  columns,
  className,
  flush = false,
}: {
  items: Array<{ label: string; value: ReactNode; unit?: ReactNode; detail?: ReactNode; tone?: 'neutral' | 'good' | 'gold' | 'warn' | 'bad' }>
  columns?: number
  className?: string
  flush?: boolean
}) {
  return (
    <div className={cx('kpi-band', flush && 'flush', className)} style={{ gridTemplateColumns: `repeat(${columns ?? items.length}, minmax(0, 1fr))` }}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={cx('kpi-item', item.tone && item.tone !== 'neutral' && `tone-${item.tone}`)}>
          <div className="kpi-value-row">
            <div className="kpi-value">{item.value}</div>
            {item.unit ? <span className="kpi-unit">{item.unit}</span> : null}
          </div>
          <div className="kpi-label">{item.label}</div>
          {item.detail ? <div className="kpi-detail">{item.detail}</div> : null}
        </div>
      ))}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="top-header">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-[1.65rem] font-bold leading-tight text-[var(--ink)] md:text-[1.9rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-[var(--ink-2)] md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: ReactNode; detail?: ReactNode; tone?: 'neutral' | 'good' | 'gold' | 'warn' | 'bad' }) {
  return (
    <div className={cx('metric', tone !== 'neutral' && `tone-${tone}`)}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {detail ? <div className="metric-detail">{detail}</div> : null}
    </div>
  )
}

export function ProgressBar({ value, good, label }: { value: number; good?: boolean; label?: string }) {
  return (
    <div aria-label={label} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="progress-track">
      <i className={good ? 'good' : ''} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function OtpPinInput({
  value,
  onChange,
  length = 4,
  error = false,
  autoFocus = false,
  disabled = false,
  label = 'PIN',
  id = 'otp-pin',
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  autoFocus?: boolean
  disabled?: boolean
  label?: string
  id?: string
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [autoFocus])

  const handleDigitChange = (index: number, digit: string) => {
    const cleanDigit = digit.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = cleanDigit
    const newPin = newDigits.join('').slice(0, length)
    onChange(newPin)

    if (cleanDigit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      }
    } else if (e.key === 'ArrowLeft') {
      if (index > 0) inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight') {
      if (index < length - 1) inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pastedData) {
      onChange(pastedData)
      const focusIndex = Math.min(pastedData.length, length - 1)
      inputsRef.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="field">
      <span className="text-center text-xs font-semibold text-[var(--ink-2)]">{label}</span>
      <div className={cx('otp-group', error && 'otp-shake')} role="group" aria-label={label} id={id}>
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            value={digits[index]}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={cx(
              'otp-box',
              digits[index] && 'filled',
              error && 'error',
            )}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error}
          />
        ))}
      </div>
    </div>
  )
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  valueSuffix = '',
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>
  label?: string
  valueSuffix?: string
}) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tooltip">
      {label ? <div className="chart-tooltip-label">{label}</div> : null}
      <div className="chart-tooltip-items">
        {payload.map((item, i) => (
          <div key={i} className="chart-tooltip-item">
            <span className="chart-tooltip-key" style={{ color: item.color || 'var(--ink-2)' }}>
              {item.name || item.dataKey}:
            </span>
            <span className="chart-tooltip-val num">
              {item.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  labelledBy,
}: {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  labelledBy?: string
}) {
  const generated = useId()
  const titleId = labelledBy ?? generated
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])')
      target?.focus()
    }, 0)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previousFocusRef.current?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? `${titleId}-desc` : undefined}>
        <div className="border-b border-[var(--line)] p-5">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          {description ? <p id={`${titleId}-desc`} className="mt-1 text-sm text-[var(--ink-2)]">{description}</p> : null}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Menu({
  label,
  language,
  children,
}: {
  label: string
  language: Language
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <div className="menu" ref={menuRef}>
      <IconButton label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <MoreVertical size={18} />
      </IconButton>
      {open ? (
        <div id={id} className="menu-list" role="menu">
          {children(() => setOpen(false))}
          <button type="button" role="menuitem" className="text-[var(--ink-2)]" onClick={() => setOpen(false)}>
            <Check size={15} />
            {text(language, 'إغلاق', 'Close')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="field min-w-44">
      <span>{label}</span>
      <span className="relative">
        <select className="input appearance-none pe-9" value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:right-3 rtl:left-3" size={17} aria-hidden="true" />
      </span>
    </label>
  )
}
