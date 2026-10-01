import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import logoOnDark from '../../assets/brand/logo-on-dark.png'
import logoOnLight from '../../assets/brand/logo-on-light.png'
import markImage from '../../assets/brand/mark.png'

export type LogoProps = {
  /** Which background the logo sits on: the white-text version is for dark ones. */
  on?: 'dark' | 'light'
  /** Just the YK symbol, for tight spaces. */
  mark?: boolean
  /** Tailwind height class; the width follows the artwork. */
  className?: string
}

export function Logo({ on = 'light', mark = false, className = 'h-10' }: LogoProps) {
  const src = mark ? markImage : on === 'dark' ? logoOnDark : logoOnLight

  return (
    <img
      src={src}
      alt={t('app.name', 'YK Digital Solutions')}
      width={mark ? 192 : 520}
      height={mark ? 160 : 128}
      draggable={false}
      decoding="async"
      className={cn('block w-auto max-w-none select-none', className)}
    />
  )
}
