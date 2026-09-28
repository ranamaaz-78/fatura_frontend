import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StatCardProps = {
  title: string
  value: ReactNode
  icon: ReactNode
  iconColor?: string
  change?: string
  isPositive?: boolean
  subtext?: string
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = 'bg-brand-50 text-brand-600',
  change,
  isPositive = true,
  subtext,
}: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-line/80 p-5 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted tracking-wide uppercase">{title}</span>
        <div className={cn('p-2.5 rounded-lg', iconColor)}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-ink">{value}</div>
        {change ? (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              isPositive
                ? 'bg-emerald-50 text-emerald-700 app-dark:bg-emerald-500/15 app-dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 app-dark:bg-rose-500/15 app-dark:text-rose-300',
            )}
          >
            {change}
          </span>
        ) : null}
      </div>
      {subtext ? <p className="mt-1 text-xs text-ink-muted">{subtext}</p> : null}
    </div>
  )
}
