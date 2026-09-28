import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, primaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-2xl bg-page p-4 mb-4">
        <Icon className="w-8 h-8 text-ink-muted" />
      </div>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <p className="text-xs text-ink-muted mt-1 max-w-sm">{description}</p>
      {primaryAction ? <div className="mt-5">{primaryAction}</div> : null}
    </div>
  )
}
