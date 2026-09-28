import { cn } from '../../lib/cn'

export type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
}

export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-brand-600' : 'bg-line',
        )}
        style={{ transitionDuration: '150ms' }}
      >
        <span
          className={cn(
            'pointer-events-none mt-0.5 ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-xs',
            'transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
          style={{ transitionDuration: '150ms' }}
        />
      </button>
      {label ? <span className="text-sm text-ink">{label}</span> : null}
    </label>
  )
}
