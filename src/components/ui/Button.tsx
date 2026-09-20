import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white active:bg-blue-700',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 active:bg-slate-100',
  ghost: 'bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-none active:bg-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white active:bg-rose-700',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-xs',
  lg: 'px-5 py-2.5 text-sm',
} as const

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
        'shadow-xs transition-colors cursor-pointer disabled:opacity-50',
        'disabled:cursor-not-allowed focus:outline-none focus:ring-2',
        'focus:ring-blue-500/30 focus:ring-offset-1',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
      {loading ? null : iconRight}
    </button>
  )
}
