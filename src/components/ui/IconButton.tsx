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
          'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors hover:bg-elevated hover:text-ink',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1 focus:ring-offset-card',
          'active:bg-elevated',
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
