import type { Language } from '../types'
import { text } from '../utils/text'

export function Brand({ language, compact = false }: { language: Language; compact?: boolean }) {
  return (
    <div className="brand-lockup flex min-w-0 items-center gap-3">
      <span className="brand-mark" aria-hidden="true" />
      <div className="min-w-0">
        <div className="truncate text-base font-black text-[var(--ink)]">
          {text(language, 'رحلة التغيير', 'Journey of Change')}
        </div>
        {!compact ? <div className="truncate text-xs font-bold text-[var(--ink-3)]">{text(language, 'لوحة المتابعة الجماعية', 'Shared progress dashboard')}</div> : null}
      </div>
    </div>
  )
}
