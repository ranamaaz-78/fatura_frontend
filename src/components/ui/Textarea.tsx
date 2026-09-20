import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name
  const hintId = hint ? `${textareaId}-hint` : undefined
  const errorId = error ? `${textareaId}-error` : undefined

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 mb-1.5">
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
          'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl',
          'placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500',
          'disabled:bg-slate-50 disabled:text-slate-400 transition',
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
        <p id={hintId} className="text-[11px] text-slate-500 mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
