import { cn } from '../../lib/cn'

export type SectionDividerProps = {
  label?: string
  className?: string
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  if (!label) {
    return <div className={cn('border-t border-line', className)} />
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 border-t border-line" />
      <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</span>
      <div className="flex-1 border-t border-line" />
    </div>
  )
}
