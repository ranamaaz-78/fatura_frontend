import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TooltipProps = {
  content: string
  children: ReactNode
  className?: string
  align?: 'center' | 'end'
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, className, align = 'center', side = 'top' }: TooltipProps) {
  return (
    <span className={cn('relative inline-flex group/tooltip', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute z-40 hidden group-hover/tooltip:block group-focus-within/tooltip:block',
          side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        )}
      >
        <span className="whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] text-white">{content}</span>
      </span>
    </span>
  )
}
