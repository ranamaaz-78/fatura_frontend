import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/format'
import type { Plan } from '../../types/module01'

export function PlanCard({ plan, className }: { plan: Plan; className?: string }) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-white p-7 text-left',
        plan.is_featured
          ? 'border-[#004ac6] shadow-xl shadow-[#004ac6]/10 ring-1 ring-[#004ac6]/20'
          : 'border-slate-200',
        className,
      )}
    >
      {plan.is_featured ? (
        <span className="absolute -top-3 left-7 rounded-full bg-[#004ac6] px-3 py-1 text-[11px] font-semibold text-white">
          {t('public.pricingPopular', 'Most popular')}
        </span>
      ) : null}

      <h3 className="text-lg font-bold text-[#0b1c30]">{plan.name}</h3>
      {plan.description ? (
        <p className="mt-1.5 text-sm leading-relaxed text-[#434655]">{plan.description}</p>
      ) : null}

      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-[#0b1c30]">
          {formatCurrency(plan.price, plan.currency, 'en-US')}
        </span>
        <span className="text-sm text-[#6b7086]">/ {plan.interval}</span>
      </p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-[#434655]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        to={`/apply?plan=${plan.slug}`}
        className={cn(
          'mt-7 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors',
          plan.is_featured
            ? 'bg-[#004ac6] text-white hover:bg-[#2563eb]'
            : 'border border-[#c3c6d7] text-[#0b1c30] hover:bg-slate-50',
        )}
      >
        {t('public.applyCta', 'Apply for access')}
      </Link>
    </div>
  )
}
