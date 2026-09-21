import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Circle, CreditCard, Receipt, Users, Wallet } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard, SkeletonStatGrid } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCurrency, formatDate } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import { getAppDashboard } from '../../services/app'

function Dashboard() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: ['app', 'dashboard'], queryFn: getAppDashboard })

  const greeting = `${t('dashboard.greeting', 'Welcome back')}, ${session?.user.name ?? ''}`.trim()

  if (query.isPending) {
    return (
      <>
        <PageHeader title={greeting} subtitle={t('dashboard.subtitle', 'Workspace overview. Modules will land here one at a time.')} />
        <SkeletonStatGrid />
        <SkeletonCard />
      </>
    )
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title={greeting} />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={t('common.error', 'Something went wrong')}
            description={getErrorMessage(query.error)}
            primaryAction={<Button onClick={() => query.refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </Card>
      </>
    )
  }

  const data = query.data
  const currency = data.company.currency
  const subscription = data.subscription
  const termDays =
    subscription && subscription.plan_interval === 'year' ? 365 : 30
  const progress = subscription
    ? Math.max(0, Math.min(100, Math.round((subscription.days_left / termDays) * 100)))
    : 0

  return (
    <>
      <PageHeader
        title={greeting}
        subtitle={data.company.name ?? t('dashboard.subtitle', 'Workspace overview.')}
      />

      {subscription ? (
        <Card title={t('dashboard.subscriptionCard', 'Your subscription')}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-900">{subscription.plan_name}</p>
              <p className="font-mono text-xs text-slate-500">
                {formatCurrency(subscription.plan_price, subscription.plan_currency, 'en-US')} /{' '}
                {subscription.plan_interval}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-700">
                {t('admin.renewsOn', 'Renews on')} {formatDate(subscription.ends_at)}
              </p>
              <p className="font-mono text-xs text-slate-500">
                {subscription.days_left} {t('admin.daysLeft', 'days left')}
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-[width]',
                subscription.days_left <= 7 ? 'bg-amber-500' : 'bg-blue-600',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.outstanding', 'Outstanding')}
          value={formatCurrency(data.kpis.outstanding, currency, 'en-US')}
          icon={<Wallet className="h-4 w-4" />}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title={t('dashboard.paidThisMonth', 'Paid this month')}
          value={formatCurrency(data.kpis.paid_this_month, currency, 'en-US')}
          icon={<CreditCard className="h-4 w-4" />}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title={t('dashboard.overdue', 'Overdue')}
          value={formatCurrency(data.kpis.overdue, currency, 'en-US')}
          icon={<Receipt className="h-4 w-4" />}
          iconColor="bg-rose-50 text-rose-600"
        />
        <StatCard
          title={t('dashboard.clients', 'Clients')}
          value={data.kpis.clients}
          icon={<Users className="h-4 w-4" />}
          iconColor="bg-indigo-50 text-indigo-600"
        />
      </div>

      <Card
        title={t('dashboard.gettingStarted', 'Getting started')}
        subtitle={t('dashboard.gettingStartedBody', 'A few steps to make Fatura yours.')}
      >
        <ul className="space-y-3">
          {data.getting_started.map((step) => (
            <li key={step.key} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-300" />
              )}
              <span className={cn('text-sm', step.done ? 'text-slate-400 line-through' : 'text-slate-700')}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export default Dashboard
