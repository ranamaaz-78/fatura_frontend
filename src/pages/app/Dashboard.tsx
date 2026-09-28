import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  CreditCard,
  Percent,
  Plus,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getAppDashboard } from '../../services/app'
import type { DashboardDocument, DashboardStockRow } from '../../types/module01'
import type { SaleType } from '../../types/sales'
import { rulesFor, typeLabel } from './documentTypes'

const CHART = ['var(--app-primary)', 'var(--app-secondary)', '#b45309', '#0369a1', '#6d28d9', '#be123c', '#334155', '#047857']

const headerButton =
  'inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer'

function formatDay(day: string): string {
  const parts = day.split('-')
  if (parts.length !== 3) return day
  return `${parts[2]}/${parts[1]}`
}

function shortTick(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value
}

function docHref(type: string, id: number): string {
  if (type === 'factura' || type === 'albaran' || type === 'quotation' || type === 'proforma') {
    return `${rulesFor(type).listPath}/${id}`
  }
  return '/app/invoices'
}

function docTypeLabel(type: string): string {
  if (type === 'factura' || type === 'albaran' || type === 'quotation' || type === 'proforma') {
    return typeLabel(type as SaleType)
  }
  return type
}

function paymentLabel(status: string): string {
  if (status === 'paid') return t('reports.paid', 'Paid')
  if (status === 'partial') return t('reports.partial', 'Partial')
  return t('reports.pending', 'Pending')
}

function paymentTone(status: string): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:ring-emerald-500/30'
  if (status === 'partial') return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 app-dark:bg-sky-500/15 app-dark:text-sky-300 app-dark:ring-sky-500/30'
  return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:ring-amber-500/30'
}

function statusColor(status: string): string {
  if (status === 'paid') return '#059669'
  if (status === 'partial') return '#0284c7'
  return '#d97706'
}

function Dashboard() {
  const { session } = useAuth()
  const query = useQuery({ queryKey: ['app', 'dashboard'], queryFn: getAppDashboard })
  const greeting = `${t('dashboard.greeting', 'Welcome back')}, ${session?.user.name ?? ''}`.trim()

  if (query.isPending) {
    return (
      <>
        <PageHeader title={greeting} subtitle={t('dashboard.subtitle', 'This month at a glance — sales, unpaid documents and stock.')} />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-[148px] lg:col-span-5" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
            <Skeleton className="h-[148px]" />
            <Skeleton className="h-[148px]" />
            <Skeleton className="h-[148px]" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[260px] lg:col-span-3" />
          <Skeleton className="h-[260px] lg:col-span-2" />
        </div>
        <SkeletonCard />
      </>
    )
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title={greeting} />
        <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
          <EmptyState
            icon={AlertTriangle}
            title={t('common.error', 'Something went wrong')}
            description={getErrorMessage(query.error)}
            primaryAction={<Button onClick={() => void query.refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </div>
      </>
    )
  }

  const data = query.data
  const currency = data.company.currency
  const kpis = data.kpis
  const series = (data.series ?? []).map((point) => ({
    name: formatDay(point.day),
    cents: point.total_cents,
  }))
  const statusSlices = (data.status ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: paymentLabel(row.key),
      value: row.count,
      color: statusColor(row.key),
    }))
  const typeSlices = (data.breakdown ?? [])
    .filter((row) => row.total_cents > 0)
    .map((row, index) => ({
      name: docTypeLabel(row.key),
      value: row.total_cents,
      color: CHART[index % CHART.length]!,
    }))

  const sideTiles = [
    {
      label: t('dashboard.tax', 'Tax'),
      value: formatCents(kpis.tax_cents ?? 0, currency),
      hint: t('reports.tax', 'Tax (IVA)'),
      icon: Percent,
      tile: 'bg-slate-100 text-slate-600',
    },
    {
      label: t('dashboard.profit', 'Profit'),
      value: formatCents(kpis.profit_cents ?? 0, currency),
      hint: `${t('dashboard.afterCost', 'after buying cost')} ${formatCents(kpis.cost_cents ?? 0, currency)}`,
      icon: Banknote,
      tile: 'bg-emerald-50 text-emerald-700 app-dark:bg-emerald-500/15 app-dark:text-emerald-300',
    },
    {
      label: t('dashboard.paidThisMonth', 'Paid this month'),
      value: formatCents(kpis.paid_this_month, currency),
      hint: `${kpis.paid_count ?? 0} ${t('reports.paid', 'Paid').toLowerCase()}`,
      icon: CreditCard,
      tile: 'bg-brand-50 text-brand-600',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={greeting}
        subtitle={data.company.name ?? t('dashboard.subtitle', 'This month at a glance — sales, unpaid documents and stock.')}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/app/reports" className={cn(headerButton, 'bg-page text-ink hover:bg-line')}>
              {t('dashboard.viewReports', 'View reports')}
            </Link>
            <Link to="/app/invoices/new" className={cn(headerButton, 'bg-brand-600 text-brand-on hover:bg-brand-500')}>
              <Plus className="h-4 w-4" />
              {t('dashboard.newInvoice', 'New invoice')}
            </Link>
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-2xl bg-brand-600 p-6 text-brand-on shadow-xs lg:col-span-5">
          <TrendingUp className="pointer-events-none absolute -right-2 -bottom-3 h-28 w-28 text-brand-on/10" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.12em] text-brand-on/80 uppercase">
            {t('dashboard.revenue', 'Revenue')}
          </p>
          <p className="mt-3 font-mono text-[28px] font-bold tracking-tight sm:text-[34px]">
            {formatCents(kpis.total_cents ?? 0, currency)}
          </p>
          <p className="mt-2 text-[13px] text-brand-on/80">{t('dashboard.salesThisMonth', 'Sales this month')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          {sideTiles.map((tile) => {
            const Icon = tile.icon
            return (
              <div key={tile.label} className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{tile.label}</p>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tile.tile)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-5 font-mono text-[22px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
                  {tile.value}
                </p>
                <p className="mt-1.5 text-[12px] leading-snug text-slate-400">{tile.hint}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs lg:col-span-3">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            {t('dashboard.salesThisMonth', 'Sales this month')}
          </p>
          {series.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">{t('reports.emptyTitle', 'Nothing in this period')}</p>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={shortTick} />
                  <Tooltip
                    cursor={{ fill: 'rgb(241 245 249)' }}
                    formatter={(value) => [formatCents(Number(value), currency), t('reports.total', 'Total')]}
                  />
                  <Bar dataKey="cents" fill="var(--app-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs lg:col-span-2">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
            {t('dashboard.byStatus', 'This month by status')}
          </p>
          {statusSlices.length === 0 && typeSlices.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">{t('reports.emptyTitle', 'Nothing in this period')}</p>
          ) : (
            <>
              <div className="relative h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSlices.length > 0 ? statusSlices : typeSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={74}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {(statusSlices.length > 0 ? statusSlices : typeSlices).map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [String(value), String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="font-mono text-[13px] font-bold text-slate-900">{kpis.document_count ?? 0}</p>
                </div>
              </div>
              <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {(statusSlices.length > 0 ? statusSlices : typeSlices).map((slice) => (
                  <li key={slice.name} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ background: slice.color }} />
                    {slice.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              {t('dashboard.recent', 'Latest documents')}
            </p>
            <Link to="/app/invoices" className="text-[11px] font-semibold text-brand-600">
              {t('nav.invoices', 'Invoices')}
            </Link>
          </div>
          {(data.recent ?? []).length === 0 ? (
            <EmptyState icon={Receipt} title={t('dashboard.recentEmpty', 'No documents yet.')} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(data.recent ?? []).map((row) => (
                <DocumentRow key={`${row.type}-${row.id}`} row={row} currency={currency} />
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <AttentionCard
            title={t('dashboard.outstanding', 'Outstanding')}
            href="/app/payments"
            linkLabel={t('dashboard.viewPayments', 'Payments')}
            empty={t('dashboard.openEmpty', 'Nothing unpaid.')}
          >
            {(data.open_documents ?? []).map((row) => (
              <Link
                key={row.id}
                to={docHref(row.type, row.id)}
                className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-slate-900">{row.client_name}</span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {docTypeLabel(row.type)} {row.number}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[13px] font-semibold text-slate-900">
                    {formatCents(row.outstanding_cents, currency)}
                  </span>
                  <StatusChip status={row.payment_status} />
                </span>
              </Link>
            ))}
          </AttentionCard>

          <AttentionCard
            title={t('dashboard.lowStock', 'Low stock')}
            href="/app/stock"
            linkLabel={t('nav.stock', 'Warehouse stock')}
            empty={t('dashboard.stockOk', 'Stock looks healthy.')}
          >
            {(data.low_stock ?? []).map((row) => (
              <StockRow key={row.id} row={row} />
            ))}
          </AttentionCard>
        </div>
      </div>
    </div>
  )
}

function AttentionCard({
  title,
  href,
  linkLabel,
  empty,
  children,
}: {
  title: string
  href: string
  linkLabel: string
  empty: string
  children: ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const hasItems = items.filter(Boolean).length > 0

  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{title}</p>
        <Link to={href} className="text-[11px] font-semibold text-brand-600">
          {linkLabel}
        </Link>
      </div>
      {hasItems ? children : <p className="px-4 pb-4 text-sm text-slate-400">{empty}</p>}
    </div>
  )
}

function DocumentRow({ row, currency }: { row: DashboardDocument; currency: string }) {
  return (
    <li>
      <Link to={docHref(row.type, row.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-900">{row.client_name}</span>
          <span className="block truncate text-[11px] text-slate-400">
            {docTypeLabel(row.type)} {row.number}
            {row.issued_at ? ` · ${formatDate(row.issued_at)}` : ''}
          </span>
        </span>
        <StatusChip status={row.payment_status} />
        <span className="w-[5.5rem] shrink-0 text-right font-mono text-[13px] font-semibold text-slate-900">
          {formatCents(row.total_cents, currency)}
        </span>
      </Link>
    </li>
  )
}

function StockRow({ row }: { row: DashboardStockRow }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0">
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-slate-900">{row.article}</span>
        <span className="text-[11px] text-slate-400">
          {t('reports.quantity', 'Quantity')} {row.quantity} · {t('reports.lowStock', 'Low stock')} {row.minimum_stock}
        </span>
      </span>
      <span
        className={cn(
          'inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase',
          row.band === 'out' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
        )}
      >
        {row.band === 'out' ? t('reports.outOfStock', 'Out of stock') : t('reports.lowStock', 'Low stock')}
      </span>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase', paymentTone(status))}>
      {paymentLabel(status)}
    </span>
  )
}

export default Dashboard
