import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Mail, MessageCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Badge } from '../../components/ui/Badge'
import { t } from '../../i18n'
import { formatCurrency, formatDate } from '../../lib/format'
import { getAppSubscription } from '../../services/app'

function Subscription() {
  const query = useQuery({ queryKey: ['app', 'subscription'], queryFn: getAppSubscription })

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.subscription', 'Subscription')} />
        <SkeletonCard />
      </>
    )
  }

  const data = query.data
  const subscription = data?.subscription ?? null
  const support = data?.support
  const expired = !subscription || !subscription.is_usable
  const waDigits = support?.whatsapp?.replace(/\D+/g, '') ?? ''

  return (
    <>
      <PageHeader title={t('nav.subscription', 'Subscription')} subtitle={data?.company?.name ?? undefined} />

      {expired ? (
        <Card>
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                {t('expired.title', 'Your subscription has ended')}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                {t('expired.body', 'Your workspace is safe and your data is untouched. Renew to pick up where you left off.')}
              </p>
              {subscription ? (
                <p className="mt-3 font-mono text-xs text-slate-500">
                  {t('expired.endedOn', 'Ended on')} {formatDate(subscription.ends_at)}
                </p>
              ) : null}

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('expired.contact', 'Contact us to renew')}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                {waDigits ? (
                  <a
                    href={`https://wa.me/${waDigits}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    {support?.whatsapp}
                  </a>
                ) : null}
                {support?.email ? (
                  <a
                    href={`mailto:${support.email}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Mail className="h-4 w-4 text-blue-600" />
                    {support.email}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card
          title={subscription.plan_name}
          actions={<Badge status={subscription.status.toUpperCase()} />}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-sm text-slate-600">
              {formatCurrency(subscription.plan_price, subscription.plan_currency, 'en-US')} /{' '}
              {subscription.plan_interval}
            </p>
            <p className="text-sm text-slate-700">
              {t('admin.renewsOn', 'Renews on')} {formatDate(subscription.ends_at)} ·{' '}
              {subscription.days_left} {t('admin.daysLeft', 'days left')}
            </p>
          </div>
          {subscription.plan_features.length > 0 ? (
            <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
              {subscription.plan_features.map((feature) => (
                <li key={feature} className="text-sm text-slate-600">
                  · {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      )}
    </>
  )
}

export default Subscription
