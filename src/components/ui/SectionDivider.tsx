import { cn } from '../../lib/cn'

export type SectionDividerProps = {
  label?: string
  className?: string
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  if (!label) {
    return <div className={cn('border-t border-slate-100', className)} />
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 border-t border-slate-100" />
      <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">{label}</span>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  )
}
