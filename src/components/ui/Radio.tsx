import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
}

export function Radio({ id, label, className, ...props }: RadioProps) {
  const radioId = id ?? `${props.name}-${String(props.value)}`

  return (
    <label htmlFor={radioId} className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        id={radioId}
        type="radio"
        className={cn('w-4 h-4 accent-blue-600', className)}
        {...props}
      />
      {label}
    </label>
  )
}
