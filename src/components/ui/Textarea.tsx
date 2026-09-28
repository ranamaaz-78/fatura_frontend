import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  /** Denser control for form-heavy modals. */
  compact?: boolean
}

export function Textarea({
  id,
  label,
  hint,
  error,
  required,
  compact = false,
  className,
  ...props
}: TextareaProps) {
  const fallbackId = useId()
  const textareaId = id ?? props.name ?? fallbackId
  const hintId = hint ? `${textareaId}-hint` : undefined
  const errorId = error ? `${textareaId}-error` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={textareaId}
          className={cn(
            'block font-semibold text-ink',
            compact ? 'text-[11px] mb-1' : 'text-xs mb-1.5',
          )}
        >
          {label}
          {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        className={cn(
          'w-full bg-card border border-line rounded-xl text-ink',
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm',
          'placeholder:text-ink-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
          'disabled:bg-page disabled:text-ink-muted transition',
          error && 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500',
          className,
        )}
        {...props}
      />
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
