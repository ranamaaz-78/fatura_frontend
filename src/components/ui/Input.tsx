import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  suffix?: ReactNode
  /** Denser control for form-heavy modals. `size` is taken by the DOM attribute. */
  compact?: boolean
}

export function Input({
  id,
  label,
  hint,
  error,
  suffix,
  required,
  compact = false,
  className,
  ...props
}: InputProps) {
  const fallbackId = useId()
  const inputId = id ?? props.name ?? fallbackId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className={cn(
            'block font-semibold text-ink',
            compact ? 'text-[11px] mb-1' : 'text-xs mb-1.5',
          )}
        >
          {label}
          {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId ?? hintId}
          className={cn(
            'w-full bg-card border border-line rounded-xl text-ink',
            compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
            'placeholder:text-ink-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
            'disabled:bg-page disabled:text-ink-muted transition',
            suffix && 'pr-12',
            props.inputMode === 'decimal' && 'text-right font-mono',
            error && 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{suffix}</span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-[11px] text-rose-600 mt-1">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-[11px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
