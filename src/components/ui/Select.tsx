import { useId, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
  /** Denser control for form-heavy modals. */
  compact?: boolean
}

export function Select({
  id,
  label,
  hint,
  error,
  required,
  compact = false,
  className,
  children,
  ...props
}: SelectProps) {
  const fallbackId = useId()
  const selectId = id ?? props.name ?? fallbackId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className={cn(
            'block font-semibold text-slate-700',
            compact ? 'text-[11px] mb-1' : 'text-xs mb-1.5',
          )}
        >
          {label}
          {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
        </label>
      ) : null}
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        className={cn(
          'w-full bg-white border border-slate-200 rounded-xl',
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
          'placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
          'disabled:bg-slate-50 disabled:text-slate-400 transition',
          error && 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-[11px] text-rose-600 mt-1">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11px] text-slate-500 mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
