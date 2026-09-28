import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  destructive?: boolean
  tooltipAlign?: 'center' | 'end'
  tooltipSide?: 'top' | 'bottom'
  children: ReactNode
}

export function IconButton({
  label,
  destructive = false,
  tooltipAlign = 'center',
  tooltipSide = 'top',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <Tooltip content={label} align={tooltipAlign} side={tooltipSide}>
      <button
        type={type}
        aria-label={label}
        className={cn(
          'p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1',
          'active:bg-slate-100 min-w-11 min-h-11 inline-flex items-center justify-center',
          destructive && 'hover:text-rose-600',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  )
}
