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
    <section className="mx-auto max-w-[1280px] px-6 py-16 sm:px-8 sm:py-24">
      <h1 className="text-4xl font-bold tracking-tight text-[#0b1c30] sm:text-5xl">
        {t('public.pricingTitle', 'Simple pricing')}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-[#434655]">
        {t('public.pricingBody', 'One plan per business. Change it any time by talking to us.')}
      </p>

      {query.isPending ? (
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : plans.length === 0 ? (
        <p className="mt-10 text-sm text-[#6b7086]">
          {t('public.plansUnavailable', 'Pricing is temporarily unavailable.')}{' '}
          <Link to="/apply" className="font-semibold text-[#004ac6]">
            {t('public.applyCta', 'Apply for access')}
          </Link>
        </p>
      ) : (
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Pricing
