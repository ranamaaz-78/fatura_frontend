import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
}

export function Checkbox({ id, label, className, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name

  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        id={checkboxId}
        type="checkbox"
        className={cn('w-4 h-4 rounded accent-blue-600', className)}
        {...props}
      />
      {label}
    </label>
  )
}
