import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarX2,
  CheckCircle2,
  CreditCard,
  Inbox,
  Timer,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { t, tp } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCurrency, formatDate, formatMonth } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import { getAdminDashboard } from '../../services/admin/dashboard'
import type { AdminDashboard as DashboardData, AttentionRow } from '../../types/module01'

function greetingFor(hour: number): string {
  if (hour < 12) return t('dashboard.good_morning', 'Good morning')
  if (hour < 18) return t('dashboard.good_afternoon', 'Good afternoon')
  return t('dashboard.good_evening', 'Good evening')
}

function money(value: number, currency: string, decimals = 0): string {
  return formatCurrency(value, currency, undefined, decimals)
}

function Kpi({
  title,
  value,
  icon: Icon,
  tone,
  note,
  delta,
  to,
}: {
  title: string
  value: ReactNode
  icon: LucideIcon
  tone: string
  note: ReactNode
  delta?: { pct: number } | null
  to: string
}) {
  return (
    <Link
      to={to}
      className="group bg-card relative block rounded-2xl border border-line/80 p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">{title}</span>
        <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', tone)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[28px] leading-none font-bold tracking-tight text-ink">{value}</span>
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              delta.pct >= 0
                ? 'bg-emerald-50 text-emerald-700 app-dark:bg-emerald-500/15 app-dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 app-dark:bg-rose-500/15 app-dark:text-rose-300',
            )}
          >
            {delta.pct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta.pct)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{note}</p>
    </Link>
  )
}

/** Six months of revenue as bars; the current month is the solid one. */
function RevenueChart({ data }: { data: DashboardData['revenue'] }) {
  const max = Math.max(...data.trend.map((point) => point.amount), 1)
  const total = data.trend.reduce((sum, point) => sum + point.amount, 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tracking-tight text-ink">{money(total, data.currency)}</p>
          <p className="text-xs text-ink-muted">{t('admin.last6Months', 'collected in the last 6 months')}</p>
        </div>
        <p className="text-xs text-ink-muted">
          {t('admin.allTime', 'All time')}: <span className="font-semibold text-ink">{money(data.all_time, data.currency)}</span>
        </p>
      </div>

      <div className="mt-6 flex h-44 items-end gap-3 sm:gap-5">
        {data.trend.map((point, index) => {
          const current = index === data.trend.length - 1
          const height = Math.max((point.amount / max) * 100, point.amount > 0 ? 6 : 2)
          return (
            <div key={point.month} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[11px] font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                {money(point.amount, data.currency)}
              </span>
              <div
                title={`${formatMonth(point.month, 'long')}: ${money(point.amount, data.currency)}`}
                className={cn(
                  'w-full max-w-[56px] rounded-t-lg transition-all',
                  current
                    ? 'bg-gradient-to-t from-[#004ac6] to-[#4f7cf0]'
                    : 'bg-[#dbe4ff] group-hover:bg-[#b9c9fb] app-dark:bg-white/15 app-dark:group-hover:bg-white/25',
                )}
                style={{ height: `${height}%` }}
              />
              <span className={cn('text-[11px] font-medium', current ? 'text-ink' : 'text-ink-muted')}>{formatMonth(point.month)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Conversion ring, a 14-day strip and the status split. */
function PipelineCard({ data }: { data: DashboardData }) {
  const { conversion, application_trend: trend, applications } = data
  const rate = conversion.total > 0 ? Math.round((conversion.converted / conversion.total) * 100) : 0
  const max = Math.max(...trend.map((day) => day.count), 1)
  const split = [
    { key: 'new', label: t('status.NEW', 'New'), value: applications.new, color: 'bg-blue-500' },
    { key: 'contacted', label: t('status.CONTACTED', 'Contacted'), value: applications.contacted, color: 'bg-amber-500' },
    { key: 'approved', label: t('status.APPROVED', 'Approved'), value: applications.approved, color: 'bg-emerald-500' },
    { key: 'rejected', label: t('status.REJECTED', 'Rejected'), value: applications.rejected, color: 'bg-rose-400' },
  ]
  const sum = Math.max(split.reduce((total, item) => total + item.value, 0), 1)
  const radius = 34
  const circumference = 2 * Math.PI * radius

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 84 84" className="h-[84px] w-[84px] shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" r={radius} fill="none" strokeWidth="9" className="stroke-line" />
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            className="stroke-[#004ac6] transition-all duration-700"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - rate / 100)}
          />
        </svg>
        <div>
          <p className="text-3xl font-bold tracking-tight text-ink">{rate}%</p>
          <p className="text-xs text-ink-muted">
            {conversion.converted} {t('admin.of', 'of')} {conversion.total} {t('admin.becameCompanies', 'applications became companies')}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
          {t('admin.last14Days', 'Applications, last 14 days')}
        </p>
        <div className="flex h-14 items-end gap-1">
          {trend.map((day) => (
            <div
              key={day.date}
              title={`${formatDate(day.date)}: ${day.count}`}
              className={cn('flex-1 rounded-sm', day.count > 0 ? 'bg-[#004ac6]' : 'bg-line')}
              style={{ height: `${day.count > 0 ? Math.max((day.count / max) * 100, 18) : 8}%` }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
          {split.map((item) => (
            <div key={item.key} className={item.color} style={{ width: `${(item.value / sum) * 100}%` }} title={`${item.label}: ${item.value}`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {split.map((item) => (
            <Link
              key={item.key}
              to="/admin/applications"
              className="flex items-center justify-between gap-2 text-xs text-ink-muted hover:text-ink"
            >
              <span className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', item.color)} />
                {item.label}
              </span>
              <span className="font-semibold text-ink">{item.value}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttentionList({ rows, tone, empty }: { rows: AttentionRow[]; tone: 'amber' | 'rose'; empty: string }) {
  if (rows.length === 0) return <p className="px-1 py-3 text-xs text-ink-muted">{empty}</p>

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={`${row.company_id}-${row.ends_at}`} className="flex items-center justify-between gap-3 py-3">
          <Link to={`/admin/companies/${row.company_id}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={row.company_name ?? '?'} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink hover:text-brand-600">{row.company_name}</span>
              <span className="block truncate text-xs text-ink-muted">
                {row.plan_name} · {tone === 'amber' ? 'ends' : 'ended'} {row.ends_at ? formatDate(row.ends_at) : '—'}
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                tone === 'amber'
                  ? 'bg-amber-50 text-amber-700 app-dark:bg-amber-500/15 app-dark:text-amber-300'
                  : 'bg-rose-50 text-rose-700 app-dark:bg-rose-500/15 app-dark:text-rose-300',
              )}
            >
              {tone === 'amber' ? (row.days_left <= 0 ? t('dashboard.today', 'Today') : t('dashboard.days_short_left', '{n} d left', { n: row.days_left })) : t('admin.expired', 'Expired')}
            </span>
            <Link to={`/admin/companies/${row.company_id}`}>
              <Button size="sm" variant={tone === 'rose' ? 'primary' : 'secondary'}>
                {t('admin.renewShort', 'Renew')}
              </Button>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[148px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[124px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: getAdminDashboard })

  if (query.isPending) return <DashboardSkeleton />

  if (query.isError) {
    return (
      <>
        <PageHeader title={t('nav.dashboard', 'Dashboard')} />
        <Card>
          <EmptyState
            icon={Inbox}
            title={t('common.error', 'Something went wrong')}
            description={getErrorMessage(query.error)}
            primaryAction={<Button onClick={() => query.refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </Card>
      </>
    )
  }

  const data = query.data
  const currency = data.revenue.currency
  const attention = data.needs_attention.expiring.length + data.needs_attention.expired.length
  const monthly = data.plan_mix.reduce((sum, plan) => sum + plan.monthly, 0)
  const revenueDelta =
    data.revenue.last_month > 0
      ? { pct: Math.round(((data.revenue.this_month - data.revenue.last_month) / data.revenue.last_month) * 100) }
      : null
  const planTotal = Math.max(data.plan_mix.reduce((sum, plan) => sum + plan.count, 0), 1)
  const firstName = session?.user.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-xs sm:p-8"
        style={{
          backgroundColor: '#0b1c30',
          backgroundImage:
            'radial-gradient(520px 260px at 90% -10%, rgba(37,99,235,0.55), rgba(11,28,48,0) 70%), radial-gradient(380px 220px at 0% 120%, rgba(78,222,163,0.22), rgba(11,28,48,0) 70%)',
        }}
      >
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[560px]">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#4edea3] uppercase">{t('nav.dashboard', 'Dashboard')}</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[30px]">
              {greetingFor(new Date().getHours())}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#cbd5e1]">
              {data.applications.new > 0 ? (
                <>
                  <strong className="text-white">{data.applications.new}</strong>{' '}
                  {tp('dashboard.new_waiting', 'new application is waiting for a reply|new applications are waiting for a reply', data.applications.new)}
                </>
              ) : (
                t('dashboard.no_new_waiting', 'No new applications waiting')
              )}
              {attention > 0 ? (
                <>
                  {' · '}
                  <strong className="text-white">{attention}</strong>{' '}
                  {tp('dashboard.needs_attention_count', 'subscription needs attention.|subscriptions need attention.', attention)}
                </>
              ) : (
                t('dashboard.all_in_standing', ' · every subscription is in good standing.')
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admin/applications">
                <Button icon={<Inbox className="h-4 w-4" />}>{t('admin.viewInbox', 'Open inbox')}</Button>
              </Link>
              <Link to="/admin/companies">
                <Button variant="secondary" icon={<Building2 className="h-4 w-4" />}>
                  {t('nav.companies', 'Companies')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: t('dashboard.monthly_recurring', 'Monthly recurring'), value: money(monthly, currency) },
              { label: t('nav.companies', 'Companies'), value: String(data.companies.total) },
              { label: t('dashboard.conversion', 'Conversion'), value: `${data.conversion.total > 0 ? Math.round((data.conversion.converted / data.conversion.total) * 100) : 0}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/12 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="text-xl font-bold tracking-tight sm:text-2xl">{item.value}</p>
                <p className="mt-0.5 text-[11px] text-[#cbd5e1]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title={t('admin.newApplications', 'New applications')}
          value={data.applications.new}
          icon={Inbox}
          tone="bg-blue-50 text-blue-600 app-dark:bg-blue-500/15 app-dark:text-blue-300"
          note={`${data.applications.this_week} ${t('admin.thisWeek', 'this week')}`}
          to="/admin/applications"
        />
        <Kpi
          title={t('admin.activeCompanies', 'Active companies')}
          value={data.companies.active}
          icon={Building2}
          tone="bg-indigo-50 text-indigo-600 app-dark:bg-indigo-500/15 app-dark:text-indigo-300"
          note={t('dashboard.suspended_count', '{count} suspended', { count: data.companies.suspended })}
          to="/admin/companies"
        />
        <Kpi
          title={t('admin.activeSubscriptions', 'Active subscriptions')}
          value={data.subscriptions.active}
          icon={CreditCard}
          tone="bg-emerald-50 text-emerald-600 app-dark:bg-emerald-500/15 app-dark:text-emerald-300"
          note={`${data.subscriptions.expiring_soon} ${t('admin.expiringSoon', 'expiring within 7 days')}`}
          to="/admin/companies"
        />
        <Kpi
          title={t('admin.revenueThisMonth', 'Revenue this month')}
          value={money(data.revenue.this_month, currency, 0)}
          icon={Wallet}
          tone="bg-amber-50 text-amber-600 app-dark:bg-amber-500/15 app-dark:text-amber-300"
          note={revenueDelta
              ? t('dashboard.vs_last_month', 'vs {amount} last month', { amount: money(data.revenue.last_month, currency) })
              : t('dashboard.no_payments_last_month', 'No payments last month')}
          delta={revenueDelta}
          to="/admin/companies"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('admin.revenue', 'Revenue')} subtitle={t('admin.revenueSub', 'Paid subscriptions by month')} className="lg:col-span-2">
          <RevenueChart data={data.revenue} />
        </Card>
        <Card title={t('admin.pipeline', 'Applications')} subtitle={t('admin.pipelineSub', 'From inbox to live account')}>
          <PipelineCard data={data} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={t('admin.needsAttention', 'Needs attention')}
          subtitle={t('admin.needsAttentionSub', 'Subscriptions ending soon or already over')}
          className="lg:col-span-2"
          actions={
            <Link to="/admin/companies" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              {t('nav.companies', 'Companies')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {attention === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t('admin.allGood', 'All subscriptions are in good standing')}
              description={t('admin.allGoodHelp', 'Nothing ends in the next 7 days and nothing has lapsed.')}
            />
          ) : (
            <div className="space-y-5">
              {data.needs_attention.expired.length > 0 ? (
                <div>
                  <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-rose-600 uppercase">
                    <CalendarX2 className="h-3.5 w-3.5" /> {t('admin.expired', 'Expired')} ({data.needs_attention.expired.length})
                  </p>
                  <AttentionList rows={data.needs_attention.expired} tone="rose" empty="" />
                </div>
              ) : null}
              {data.needs_attention.expiring.length > 0 ? (
                <div>
                  <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-amber-600 uppercase">
                    <Timer className="h-3.5 w-3.5" /> {t('admin.expiringSoonShort', 'Ending within 7 days')} ({data.needs_attention.expiring.length})
                  </p>
                  <AttentionList rows={data.needs_attention.expiring} tone="amber" empty="" />
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card title={t('admin.planMix', 'Plans in use')} subtitle={t('admin.planMixSub', 'Running subscriptions by plan')}>
          {data.plan_mix.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('admin.noSubscription', 'No subscription yet.')}</p>
          ) : (
            <ul className="space-y-4">
              {data.plan_mix.map((plan) => (
                <li key={plan.name}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-ink">{plan.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {plan.count} {plan.count === 1 ? 'company' : 'companies'}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#004ac6] to-[#4f7cf0]"
                      style={{ width: `${(plan.count / planTotal) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={t('admin.latestApplications', 'Latest applications')}
          className="lg:col-span-2"
          actions={
            <Link to="/admin/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
              {t('admin.viewInbox', 'Open inbox')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.latest_applications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t('common.empty', 'Nothing here yet')}
              description={t('admin.noApplicationsYet', 'Applications from the public site will appear here.')}
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.latest_applications.map((application) => (
                <li key={application.id}>
                  <Link to="/admin/applications" className="-mx-2 flex items-center justify-between gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-page">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={application.company_name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{application.company_name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {application.contact_name} · {application.email}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-[11px] text-ink-muted sm:inline">{formatDate(application.created_at)}</span>
                      <Badge status={application.status.toUpperCase()} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('admin.recentPayments', 'Recent payments')} subtitle={t('admin.recentPaymentsSub', 'Latest money in')}>
          {data.latest_payments.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('admin.noPayments', 'No payments recorded yet.')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.latest_payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link to={`/admin/companies/${payment.company_id}`} className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink hover:text-brand-600">{payment.company_name ?? '—'}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                      {payment.method ? ` · ${payment.method}` : ''}
                    </span>
                  </Link>
                  <span className="shrink-0 text-sm font-bold text-emerald-600">+{money(payment.amount, payment.currency, 2)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
