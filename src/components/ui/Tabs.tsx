import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TabItem = {
  id: string
  label: string
}

export type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
  actions?: ReactNode
}

export function Tabs({ items, value, onChange, variant = 'underline', actions }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className="flex items-center gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1',
              value === item.id ? 'bg-brand-50 text-brand-600' : 'text-ink-muted hover:bg-page',
            )}
          >
            {item.label}
          </button>
        ))}
        {actions}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 border-b border-line">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1',
            value === item.id
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          {item.label}
        </button>
      ))}
      {actions}
    </div>
  )
}
