import { t } from '../../i18n'
import { getStatusStyle } from '../../lib/status'
import { cn } from '../../lib/cn'

export type BadgeProps = {
  status: string
  label?: string
  className?: string
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStatusStyle(status),
        className,
      )}
    >
      {label ?? t(`status.${status}`, status)}
    </span>
  )
}
