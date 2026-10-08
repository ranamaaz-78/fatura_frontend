import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatPlanPrice } from '../../lib/format'
import type { Plan } from '../../types/module01'

/** Whole-number percentage off, or 0 when the plan has no higher "was" price. */
export function discountPercent(plan: Pick<Plan, 'price' | 'original_price'>): number {
  if (!plan.original_price || plan.original_price <= plan.price) return 0
  return Math.round((1 - plan.price / plan.original_price) * 100)
}

/** The struck-through old price, rendered only when the plan has a discount. */
export function OriginalPrice({ plan, className }: { plan: Pick<Plan, 'price' | 'original_price' | 'currency'>; className?: string }) {
  if (!discountPercent(plan)) return null
  return (
    <s className={cn('font-semibold opacity-60', className)} aria-label={t('plans.was_price', 'Was {price}', { price: formatPlanPrice(plan.original_price ?? 0, plan.currency) })}>
      {formatPlanPrice(plan.original_price ?? 0, plan.currency)}
    </s>
  )
}

/** "Save 33%" pill. */
export function SaveBadge({ plan, className }: { plan: Pick<Plan, 'price' | 'original_price'>; className?: string }) {
  const percent = discountPercent(plan)
  if (!percent) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] leading-none font-bold whitespace-nowrap text-emerald-600', className)}>
      {t('plans.save_percent', 'Save {percent}%', { percent })}
    </span>
  )
}
