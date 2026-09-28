import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { optionsFromChildren, SearchableSelect } from './SearchableSelect'

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
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
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  disabled,
  ...props
}: SelectProps) {
  const fallbackId = useId()
  const selectId = id ?? name ?? fallbackId
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const options = optionsFromChildren(children)

  return (
    <div className={cn(className ?? 'w-full')}>
      {label ? (
        <label
          htmlFor={selectId}
          className={cn(
            'mb-1.5 block font-semibold text-slate-700',
            compact ? 'mb-1 text-[11px]' : 'text-xs',
          )}
        >
          {label}
          {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}
      <SearchableSelect
        id={selectId}
        name={name}
        options={options}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        compact={compact}
        error={Boolean(error)}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={errorId ?? hintId}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-[11px] text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-[11px] text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
