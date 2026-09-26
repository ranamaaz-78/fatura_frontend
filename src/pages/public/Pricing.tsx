import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { getPublicPlans } from '../../services/plans'
import { PlanCard } from './PricingCards'

function Pricing() {
  const query = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const plans = query.data ?? []

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:py-24">
      <div className="text-center">
        <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#004ac6]">
          {t('public.pricingEyebrow', 'Pricing')}
        </span>
        <h1 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
          {t('public.pricingTitle', 'Simple pricing')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[#434655] sm:text-lg">
          {t('public.pricingBody', 'No setup fee and no long contract. Our team activates your account after a short call, and you pay period to period.')}
        </p>
      </div>

      {query.isPending ? (
        <div className="mt-14 grid justify-center gap-8 sm:grid-cols-[repeat(auto-fit,minmax(320px,420px))]">
          <Skeleton className="h-[520px] w-full rounded-[28px]" />
        </div>
      ) : plans.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#6b7086]">
          {t('public.plansUnavailable', 'Pricing is temporarily unavailable.')}{' '}
          <Link to="/apply" className="font-semibold text-[#004ac6]">
            {t('public.applyCta', 'Apply for access')}
          </Link>
        </p>
      ) : (
        <div className="mt-14 grid justify-center gap-8 sm:grid-cols-[repeat(auto-fit,minmax(320px,420px))]">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Pricing
