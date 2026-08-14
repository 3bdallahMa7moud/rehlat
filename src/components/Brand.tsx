import type { Language } from '../types'
import { cx } from '../utils/cx'
import { text } from '../utils/text'

const brandMarkSrc = '/branding/journey-of-change-mark.png'

type BrandVariant = 'sidebar' | 'login' | 'icon'

type BrandProps = {
  language: Language
  compact?: boolean
  variant?: BrandVariant
  className?: string
}

export function Brand({ language, compact = false, variant = 'sidebar', className }: BrandProps) {
  const label = text(language, 'رحلة التغيير', 'Journey of Change')
  const subtitle = text(language, 'لوحة المتابعة الجماعية', 'Shared progress dashboard')
  const iconOnly = variant === 'icon'

  return (
    <div className={cx('brand-lockup', `brand-${variant}`, iconOnly && 'brand-icon-only', className)}>
      <img className="brand-mark" src={brandMarkSrc} alt={iconOnly ? label : ''} aria-hidden={iconOnly ? undefined : true} />
      {!iconOnly ? (
        <div className="brand-copy">
          <div className="brand-title truncate">{label}</div>
          {!compact ? <div className="brand-subtitle truncate">{subtitle}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
