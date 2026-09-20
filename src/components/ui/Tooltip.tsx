import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TooltipProps = {
  content: string
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block group-focus-within:block z-40">
        <span className="bg-slate-900 text-white text-[11px] rounded-lg px-2 py-1 whitespace-nowrap">
          {content}
        </span>
      </span>
    </span>
  )
}
