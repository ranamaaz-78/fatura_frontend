import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatPlanPrice, formatInterval } from '../../lib/format'
import type { Plan } from '../../types/module01'

type PlanCardProps = {
  plan: Plan
  /** `onDark` earns the deep drop shadow the pricing band is designed around. */
  tone?: 'onLight' | 'onDark'
  className?: string
}

export function PlanCard({ plan, tone = 'onLight', className }: PlanCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[28px] bg-white p-8 text-left sm:p-10',
        tone === 'onDark'
          ? 'shadow-[0_40px_80px_rgba(2,6,23,0.45)]'
          : 'border border-[#e5eeff] shadow-[0_18px_40px_rgba(2,6,23,0.08)]',
        className,
      )}
    >
      {plan.is_featured ? (
        <span className="absolute -top-3.5 left-8 rounded-full bg-[#4edea3] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.04em] text-[#0b1c30] sm:left-10">
          {t('public.pricingPopular', 'Most popular')}
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[22px] font-bold text-[#0b1c30]">{plan.name}</h3>
        <span className="rounded-lg bg-[#e5eeff] px-2.5 py-1 text-xs font-semibold text-[#004ac6] capitalize">
          {plan.interval === 'year' ? t('public.yearly', 'Yearly') : t('public.monthly', 'Monthly')}
        </span>
      </div>

      {plan.description ? <p className="mt-1.5 text-[15px] text-[#434655]">{plan.description}</p> : null}

      <div className="mt-7 flex items-baseline gap-1.5">
        <span className="text-[56px] leading-none font-extrabold tracking-[-0.04em] text-[#0b1c30] sm:text-[64px]">
          {formatPlanPrice(plan.price, plan.currency)}
        </span>
        <span className="text-[17px] font-medium text-[#434655]">/ {formatInterval(plan.interval)}</span>
      </div>
      <p className="mt-2 text-[13px] text-[#64748b]">
        {t('public.pricingBilling', 'Billed per period. No setup fee.')}
      </p>

      <div className="my-7 h-px bg-[#e5eeff]" />

      <ul className="flex flex-1 flex-col gap-3.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-[15px] text-[#0b1c30]">
            <Check className="h-[18px] w-[18px] shrink-0 text-[#007d55]" strokeWidth={2.4} />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        to={`/apply?plan=${plan.slug}`}
        className="mt-8 flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[#004ac6] text-base font-semibold text-white transition-colors hover:bg-[#2563eb]"
      >
        {t('public.applyForPlan', 'Apply for')} {plan.name}
        <ArrowRight className="h-[18px] w-[18px]" />
      </Link>
    </div>
  )
}
