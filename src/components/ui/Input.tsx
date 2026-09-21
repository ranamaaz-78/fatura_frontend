import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  suffix?: ReactNode
}

export function Input({
  id,
  label,
  hint,
  error,
  suffix,
  required,
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
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 mb-1.5">
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
            'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
            'disabled:bg-slate-50 disabled:text-slate-400 transition',
            suffix && 'pr-12',
            props.inputMode === 'decimal' && 'text-right font-mono',
            error && 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500',
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>
        ) : null}
      </div>
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
