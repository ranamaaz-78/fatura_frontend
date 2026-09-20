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
              'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1',
              value === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100',
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
    <div className="flex items-center gap-1 border-b border-slate-200">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1',
            value === item.id
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          {item.label}
        </button>
      ))}
      {actions}
    </div>
  )
}
