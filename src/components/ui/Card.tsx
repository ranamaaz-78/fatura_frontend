import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CardProps = {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, subtitle, actions, children, className }: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions)

  if (!hasHeader) {
    return (
      <div className={cn('bg-card rounded-2xl border border-line/80 shadow-xs p-6', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-line/80 shadow-xs', className)}>
      <div className="px-6 py-4 border-b border-line flex items-center justify-between">
        <div>
          {title ? <h3 className="text-sm font-bold text-ink">{title}</h3> : null}
          {subtitle ? <p className="text-[11px] text-ink-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
