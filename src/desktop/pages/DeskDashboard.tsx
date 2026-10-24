import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowUpRight, Banknote, CreditCard, PackageX, Percent, RefreshCw, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../auth/AuthProvider'
import { docPermission, usePermissions } from '../../auth/permissions'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { CHART, docHref, docTypeLabel, formatDay, paymentLabel, shortTick, statusColor } from '../../pages/app/Dashboard'
import { getErrorMessage } from '../../services/api'
import { getAppDashboard } from '../../services/app'
import type { DashboardDocument, DashboardStockRow } from '../../types/module01'
import { NEW_DOCUMENTS, newDocumentPath } from '../shell/routes'
import { identityFor } from '../ui/docIdentity'
import { Kbd, KpiTile, Panel, PanelLink, Pill, Shimmer, Sparkline, deskButtonClass } from '../ui/kit'

function pillTone(status: string) {
  return status === 'paid' ? 'paid' : status === 'partial' ? 'partial' : 'pending'
}

/**
 * The dashboard as a command deck: the month's takings up front with the actions to start a document, the numbers
 * beside it, the month's curve, and what needs attention. Same data as the website (the same request).
 */
export default function DeskDashboard() {
  const { can } = usePermissions()
  const { session } = useAuth()
  const query = useQuery({ queryKey: ['app', 'dashboard'], queryFn: getAppDashboard })
  const greeting = `${t('dashboard.greeting', 'Welcome back')}, ${session?.user.name ?? ''}`.trim()

  if (query.isPending) {
    return (
      <div className="grid grid-cols-12 gap-5">
        <Shimmer className="col-span-7 h-[260px]" />
        <div className="col-span-5 grid grid-cols-2 gap-5">
          <Shimmer className="h-[120px]" />
          <Shimmer className="h-[120px]" />
          <Shimmer className="h-[120px]" />
          <Shimmer className="h-[120px]" />
        </div>
        <Shimmer className="col-span-8 h-[320px]" />
        <Shimmer className="col-span-4 h-[320px]" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="desk-glass flex flex-col items-center px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink">{t('common.error', 'Something went wrong')}</h2>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{getErrorMessage(query.error)}</p>
        <button type="button" onClick={() => void query.refetch()} className={deskButtonClass('primary', 'mt-6')}>
          <RefreshCw className="h-4 w-4" />
          {t('common.retry', 'Retry')}
        </button>
      </div>
    )
  }

  const data = query.data
  const currency = data.company.currency
  const kpis = data.kpis
  const series = (data.series ?? []).map((point) => ({ name: formatDay(point.day), cents: point.total_cents }))
  const statusSlices = (data.status ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({ name: paymentLabel(row.key), value: row.count, color: statusColor(row.key) }))
  const typeSlices = (data.breakdown ?? [])
    .filter((row) => row.total_cents > 0)
    .map((row, index) => ({ name: docTypeLabel(row.key), value: row.total_cents, color: CHART[index % CHART.length]! }))
  const slices = statusSlices.length > 0 ? statusSlices : typeSlices
  const creatable = NEW_DOCUMENTS.filter((doc) => can(docPermission(doc.type, 'create')))
  const stockAlerts = (kpis.low_count ?? 0) + (kpis.out_count ?? 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-12 gap-5">
        {/* The month, up front. */}
        <section className="desk-hero desk-rise relative col-span-12 flex flex-col overflow-hidden p-7 xl:col-span-7">
          <TrendingUp className="pointer-events-none absolute -right-6 -bottom-8 h-48 w-48 text-white/[0.06]" aria-hidden />
          <p className="text-[12px] font-semibold text-white/75">{data.company.name ?? ''}</p>
          <h1 className="mt-1 text-[24px] leading-tight font-extrabold tracking-[-0.03em]">{greeting}</h1>

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">{t('dashboard.salesThisMonth', 'Sales this month')}</p>
              <p className="desk-num mt-2 text-[44px] leading-none font-extrabold">{formatCents(kpis.total_cents ?? 0, currency)}</p>
            </div>
            <dl className="flex gap-8 pb-1 text-white/85">
              <HeroStat label={t('desk.documents', 'Documents')} value={kpis.document_count ?? 0} />
              <HeroStat label={t('reports.paid', 'Paid')} value={kpis.paid_count ?? 0} />
              <HeroStat label={t('reports.pending', 'Pending')} value={kpis.open_count ?? 0} />
            </dl>
          </div>

          <div className="mt-5 h-12 opacity-90">
            <Sparkline values={series.map((point) => point.cents)} color="#ffffff" className="h-12" />
          </div>

          {creatable.length > 0 || can('reports.view') ? (
            <div className="relative mt-5 flex flex-wrap gap-2">
              {creatable.map((doc) => {
                const Icon = doc.icon
                return (
                  <Link
                    key={doc.type}
                    to={newDocumentPath(doc.type)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/14 px-3.5 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/24"
                  >
                    <Icon className="h-4 w-4" />
                    {doc.label}
                    <Kbd className="ml-1 border-white/40">{doc.key}</Kbd>
                  </Link>
                )
              })}
              {can('reports.view') ? (
                <Link to="/app/reports" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
                  {t('dashboard.viewReports', 'View reports')}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="col-span-12 grid grid-cols-2 gap-5 xl:col-span-5">
          <KpiTile className="desk-rise desk-rise-1" label={t('dashboard.tax', 'Tax')} value={formatCents(kpis.tax_cents ?? 0, currency)} hint={t('reports.tax', 'Tax (IVA)')} icon={Percent} tone="slate" />
          <KpiTile
            className="desk-rise desk-rise-2"
            label={t('dashboard.profit', 'Profit')}
            value={formatCents(kpis.profit_cents ?? 0, currency)}
            hint={`${t('dashboard.afterCost', 'after buying cost')} ${formatCents(kpis.cost_cents ?? 0, currency)}`}
            icon={Banknote}
            tone="emerald"
          />
          <KpiTile
            className="desk-rise desk-rise-3"
            label={t('dashboard.paidThisMonth', 'Paid this month')}
            value={formatCents(kpis.paid_this_month, currency)}
            hint={`${kpis.paid_count ?? 0} ${t('reports.paid', 'Paid').toLowerCase()}`}
            icon={CreditCard}
            tone="brand"
          />
          <KpiTile
            className="desk-rise desk-rise-4"
            label={t('dashboard.lowStock', 'Low stock')}
            value={String(stockAlerts)}
            hint={`${t('reports.outOfStock', 'Out of stock')} ${kpis.out_count ?? 0} · ${t('reports.lowStock', 'Low stock')} ${kpis.low_count ?? 0}`}
            icon={PackageX}
            tone={stockAlerts > 0 ? 'amber' : 'teal'}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Panel className="col-span-12 xl:col-span-8" title={t('dashboard.salesThisMonth', 'Sales this month')} bodyClassName="px-3 pb-4">
          {series.length === 0 ? (
            <p className="py-24 text-center text-sm text-ink-muted">{t('reports.emptyTitle', 'Nothing in this period')}</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="desk-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--app-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--app-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--app-line)" strokeDasharray="3 6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--app-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={shortTick} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--app-muted)' }} axisLine={false} tickLine={false} width={64} tickFormatter={(value: number) => formatCents(value, currency)} />
                  <Tooltip
                    cursor={{ stroke: 'var(--app-primary)', strokeOpacity: 0.3 }}
                    contentStyle={{ background: 'var(--app-card)', border: '1px solid var(--app-line)', borderRadius: 12, color: 'var(--app-ink)', fontSize: 12 }}
                    formatter={(value) => [formatCents(Number(value), currency), t('reports.total', 'Total')]}
                  />
                  <Area isAnimationActive={false} type="monotone" dataKey="cents" stroke="var(--app-primary)" strokeWidth={2.4} fill="url(#desk-area)" activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel className="col-span-12 xl:col-span-4" title={t('dashboard.byStatus', 'This month by status')} bodyClassName="px-5 pb-5">
          {slices.length === 0 ? (
            <p className="py-24 text-center text-sm text-ink-muted">{t('reports.emptyTitle', 'Nothing in this period')}</p>
          ) : (
            <>
              <div className="relative h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={slices} dataKey="value" nameKey="name" innerRadius={64} outerRadius={88} paddingAngle={3} strokeWidth={0} cornerRadius={6}>
                      {slices.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--app-card)', border: '1px solid var(--app-line)', borderRadius: 12, color: 'var(--app-ink)', fontSize: 12 }}
                      formatter={(value, name) => [String(value), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="desk-num text-[30px] leading-none font-extrabold text-ink">{kpis.document_count ?? 0}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{t('desk.documents', 'Documents')}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {slices.map((slice) => (
                  <li key={slice.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2 text-ink-muted">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                      {slice.name}
                    </span>
                    <span className="desk-num font-semibold text-ink">{statusSlices.length > 0 ? slice.value : formatCents(slice.value, currency)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Panel
          className="col-span-12 xl:col-span-7"
          title={t('dashboard.recent', 'Latest documents')}
          action={<PanelLink to="/app/invoices">{t('nav.invoices', 'Invoices')}</PanelLink>}
          bodyClassName="pb-2"
        >
          {(data.recent ?? []).length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-ink-muted">{t('dashboard.recentEmpty', 'No documents yet.')}</p>
          ) : (
            <ol className="relative px-3">
              {(data.recent ?? []).map((row) => (
                <TimelineRow key={`${row.type}-${row.id}`} row={row} currency={currency} />
              ))}
            </ol>
          )}
        </Panel>

        <div className="col-span-12 space-y-5 xl:col-span-5">
          <Panel
            title={t('dashboard.outstanding', 'Outstanding')}
            action={<PanelLink to="/app/payments">{t('dashboard.viewPayments', 'Payments')}</PanelLink>}
            bodyClassName="pb-2"
          >
            {(data.open_documents ?? []).length === 0 ? (
              <p className="px-5 pb-4 text-sm text-ink-muted">{t('dashboard.openEmpty', 'Nothing unpaid.')}</p>
            ) : (
              (data.open_documents ?? []).map((row) => (
                <Link key={row.id} to={docHref(row.type, row.id)} className="mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-elevated">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{row.client_name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {docTypeLabel(row.type)} {row.number}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="desk-num block text-[14px] font-bold text-ink">{formatCents(row.outstanding_cents, currency)}</span>
                    <Pill tone={pillTone(row.payment_status)} className="mt-1">
                      {paymentLabel(row.payment_status)}
                    </Pill>
                  </span>
                </Link>
              ))
            )}
          </Panel>

          <Panel
            title={t('dashboard.lowStock', 'Low stock')}
            action={<PanelLink to="/app/stock">{t('nav.stock', 'Warehouse stock')}</PanelLink>}
            bodyClassName="pb-2"
          >
            {(data.low_stock ?? []).length === 0 ? (
              <p className="px-5 pb-4 text-sm text-ink-muted">{t('dashboard.stockOk', 'Stock looks healthy.')}</p>
            ) : (
              (data.low_stock ?? []).map((row) => <StockMeter key={row.id} row={row} />)
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] text-white/65">{label}</dt>
      <dd className="desk-num text-[20px] font-bold text-white">{value}</dd>
    </div>
  )
}

function TimelineRow({ row, currency }: { row: DashboardDocument; currency: string }) {
  const identity = identityFor(row.type)
  const Icon = identity.icon
  return (
    <li>
      <Link to={docHref(row.type, row.id)} className="group flex items-center gap-4 rounded-xl px-3 py-2.5 transition hover:bg-elevated">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', identity.chip)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{row.client_name}</span>
          <span className="block truncate text-[11px] text-ink-muted">
            {docTypeLabel(row.type)} · {row.number}
            {row.issued_at ? ` · ${formatDate(row.issued_at)}` : ''}
          </span>
        </span>
        <Pill tone={pillTone(row.payment_status)}>{paymentLabel(row.payment_status)}</Pill>
        <span className="desk-num w-28 shrink-0 text-right text-[14px] font-bold text-ink">{formatCents(row.total_cents, currency)}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-muted opacity-0 transition group-hover:opacity-100" />
      </Link>
    </li>
  )
}

function StockMeter({ row }: { row: DashboardStockRow }) {
  const out = row.band === 'out'
  const ratio = row.minimum_stock > 0 ? Math.min(1, Math.max(0, row.quantity / row.minimum_stock)) : 0
  return (
    <div className="mx-2 rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-semibold text-ink">{row.article}</span>
        <Pill tone={out ? 'voided' : 'pending'}>{out ? t('reports.outOfStock', 'Out of stock') : t('reports.lowStock', 'Low stock')}</Pill>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
          <span className={cn('block h-full rounded-full', out ? 'bg-rose-500' : 'bg-amber-500')} style={{ width: `${Math.max(ratio * 100, 4)}%` }} />
        </span>
        <span className="desk-num shrink-0 text-[11px] text-ink-muted">
          {row.quantity} / {row.minimum_stock}
        </span>
      </div>
    </div>
  )
}
