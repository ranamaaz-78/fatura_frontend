import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Banknote, CreditCard, Eye, FileClock, Search, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { Tooltip } from '../../components/ui/Tooltip'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { listPaymentMethods } from '../../services/paymentMethods'
import { listPayments } from '../../services/sales'
import type { PaymentEntry, PaymentPeriod, PaymentStatusBadge, SaleType } from '../../types/sales'
import { rulesFor, typeLabel } from './documentTypes'
import { PaymentMethodManagerModal } from './PaymentMethodManagerModal'

const PER_PAGE = 15

const headerButton =
  'inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer'

const rowAction =
  'flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer'

const AVATARS = [
  'bg-[#eff4ff] text-[#004ac6]',
  'bg-[#ecfdf5] text-[#047857]',
  'bg-[#fffbeb] text-[#b45309]',
  'bg-[#fdf2f8] text-[#be123c]',
  'bg-[#f5f3ff] text-[#6d28d9]',
]

const emptyStats = {
  received_cents: 0,
  received_count: 0,
  pending_cents: 0,
  pending_count: 0,
  outstanding_cents: 0,
  outstanding_count: 0,
  client_count: 0,
}

const emptyCounts = { all: 0, month: 0, week: 0, day: 0 }

const dateInputClass =
  'h-8 rounded-[10px] border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20'

function localIso(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthStartIso(): string {
  const date = new Date()
  date.setDate(1)
  return localIso(date)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '?'
}

function documentHref(type: SaleType, id: number): string {
  return `${rulesFor(type).listPath}/${id}`
}

function statusTone(status: PaymentStatusBadge): string {
  if (status === 'partial') return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200'
  return status === 'received'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
}

function statusLabel(status: PaymentStatusBadge): string {
  if (status === 'partial') return t('payments.partial', 'Partial')
  return status === 'received' ? t('payments.received', 'Received') : t('payments.pending', 'Pending')
}

const METHOD_TONES = [
  'bg-[#eff4ff] text-[#004ac6] ring-1 ring-[#bfdbfe]',
  'bg-[#ecfdf5] text-[#047857] ring-1 ring-[#a7f3d0]',
  'bg-[#fff7ed] text-[#c2410c] ring-1 ring-[#fed7aa]',
  'bg-[#f5f3ff] text-[#6d28d9] ring-1 ring-[#ddd6fe]',
  'bg-[#fdf2f8] text-[#be123c] ring-1 ring-[#fecdd3]',
  'bg-[#ecfeff] text-[#0e7490] ring-1 ring-[#a5f3fc]',
  'bg-[#fefce8] text-[#a16207] ring-1 ring-[#fde68a]',
  'bg-[#f1f5f9] text-[#334155] ring-1 ring-[#cbd5e1]',
]

function methodTone(id: number): string {
  return METHOD_TONES[Math.abs(id) % METHOD_TONES.length]!
}

function Payments() {
  const { session } = useAuth()
  const currency = session?.company?.currency ?? 'USD'
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [period, setPeriod] = useState<PaymentPeriod>('all')
  const [from, setFrom] = useState(monthStartIso)
  const [to, setTo] = useState(localIso)
  const [status, setStatus] = useState<PaymentStatusBadge | 'all'>('all')
  const [methodId, setMethodId] = useState('')
  const [page, setPage] = useState(1)
  const [methodsOpen, setMethodsOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const methods = useQuery({
    queryKey: ['app', 'payment-methods'],
    queryFn: () => listPaymentMethods(),
  })

  const customReady = period !== 'custom' || (from !== '' && to !== '' && from <= to)

  const query = useQuery({
    queryKey: ['app', 'payments', { page, search: debounced, period, from, to, status, methodId }],
    queryFn: () =>
      listPayments({
        page,
        per_page: PER_PAGE,
        search: debounced || undefined,
        period: customReady ? period : 'all',
        from: period === 'custom' && customReady ? from : undefined,
        to: period === 'custom' && customReady ? to : undefined,
        status: status === 'all' ? undefined : status,
        payment_method_id: methodId || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const stats = query.data?.stats ?? emptyStats
  const counts = query.data?.counts ?? emptyCounts

  const periodOptions: { id: PaymentPeriod; label: string; count?: number }[] = [
    { id: 'all', label: t('common.all', 'All'), count: counts.all },
    { id: 'month', label: t('sales.thisMonth', 'This month'), count: counts.month },
    { id: 'week', label: t('payments.thisWeek', 'This week'), count: counts.week },
    { id: 'day', label: t('payments.thisDay', 'Today'), count: counts.day },
    { id: 'custom', label: t('payments.custom', 'Custom') },
  ]

  const firstOnPage = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const lastOnPage = meta ? firstOnPage + rows.length - 1 : 0
  const pageNumbers = useMemo(() => {
    if (!meta) return []
    const start = Math.max(1, Math.min(meta.current_page - 1, meta.last_page - 2))
    return Array.from({ length: Math.min(3, meta.last_page) }, (_, index) => start + index)
  }, [meta])

  const filtered = Boolean(debounced) || period !== 'all' || status !== 'all' || methodId !== ''

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
            {t('nav.payments', 'Payments')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('payments.subtitle', 'See which invoices and proformas are received, and which are still pending.')}
          </p>
        </div>
        <button
          type="button"
          className={cn(headerButton, 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
          onClick={() => setMethodsOpen(true)}
        >
          <CreditCard className="h-4 w-4 text-[#004ac6]" />
          {t('payments.manageMethods', 'Manage methods')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={t('payments.received', 'Received')}
          value={formatCents(stats.received_cents, currency)}
          hint={`${stats.received_count} ${t('payments.recorded', 'payments')}`}
          tile="bg-[#ecfdf5] text-[#047857]"
          icon={<Banknote className="h-5 w-5" />}
        />
        <Stat
          label={t('payments.pending', 'Pending')}
          value={stats.pending_count}
          hint={formatCents(stats.pending_cents, currency)}
          tile="bg-[#fffbeb] text-[#b45309]"
          icon={<FileClock className="h-5 w-5" />}
        />
        <Stat
          label={t('payments.outstanding', 'Outstanding')}
          value={formatCents(stats.outstanding_cents, currency)}
          hint={`${stats.outstanding_count} ${t('sales.stillOpen', 'still open')}`}
          tile="bg-[#fffbeb] text-[#b45309]"
          icon={<FileClock className="h-5 w-5" />}
        />
        <Stat
          label={t('sales.clients', 'Clients')}
          value={stats.client_count}
          hint={t('payments.clientsHint', 'On these documents')}
          tile="bg-slate-100 text-slate-600"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3">
          <span className="relative w-full max-w-[280px] flex-grow sm:max-w-[340px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('payments.searchPlaceholder', 'Search client or document')}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white pr-3 pl-8.5 text-[13px] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
          </span>
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            <Select
              aria-label={t('payments.period', 'Period')}
              value={period}
              className="w-[11.5rem] shrink-0"
              onChange={(event) => {
                setPeriod(event.target.value as PaymentPeriod)
                setPage(1)
              }}
            >
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.count === undefined ? option.label : `${option.label} (${option.count})`}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t('payments.status', 'Status')}
              value={status}
              className="w-[10.5rem] shrink-0"
              onChange={(event) => {
                setStatus(event.target.value as PaymentStatusBadge | 'all')
                setPage(1)
              }}
            >
              <option value="all">{t('payments.allStatuses', 'All statuses')}</option>
              <option value="received">{t('payments.received', 'Received')}</option>
              <option value="pending">{t('payments.pending', 'Pending')}</option>
              <option value="partial">{t('payments.partial', 'Partial')}</option>
            </Select>
            <Select
              aria-label={t('payments.method', 'Method')}
              value={methodId}
              className="w-[10.5rem] shrink-0"
              onChange={(event) => {
                setMethodId(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('payments.allMethods', 'All methods')}</option>
              <option value="none">{t('payments.noMethod', 'No method')}</option>
              {(methods.data ?? []).map((method) => (
                <option key={method.id} value={String(method.id)}>
                  {method.name}
                </option>
              ))}
            </Select>
            {period === 'custom' ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <label className="sr-only" htmlFor="payments-from">
                  {t('payments.from', 'From')}
                </label>
                <input
                  id="payments-from"
                  type="date"
                  value={from}
                  max={to}
                  onChange={(event) => {
                    setFrom(event.target.value)
                    setPage(1)
                  }}
                  className={dateInputClass}
                />
                <span className="text-[11px] text-slate-400">–</span>
                <label className="sr-only" htmlFor="payments-to">
                  {t('payments.to', 'To')}
                </label>
                <input
                  id="payments-to"
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => {
                    setTo(event.target.value)
                    setPage(1)
                  }}
                  className={dateInputClass}
                />
              </span>
            ) : null}
          </div>
        </div>

        {query.isPending && query.data === undefined ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_item, index) => (
              <span key={index} className="block h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={filtered ? t('payments.filterEmpty', 'No payments match') : t('payments.noneTitle', 'No payments yet')}
            description={
              filtered
                ? t('payments.filterEmptyBody', 'Try another client, date, status or method.')
                : t(
                    'payments.noneBody',
                    'Issued invoices, delivery notes and proformas show up here as received or pending.',
                  )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="flex items-center bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                <span className="min-w-0 flex-1">{t('sales.client', 'Client')}</span>
                <span className="w-[140px]">{t('sales.document', 'Document')}</span>
                <span className="w-[120px]">{t('payments.method', 'Method')}</span>
                <span className="w-[100px]">{t('payments.status', 'Status')}</span>
                <span className="w-[92px]">{t('sales.date', 'Date')}</span>
                <span className="w-[128px] text-right">{t('payments.amount', 'Amount')}</span>
                <span className="w-[48px]" />
              </div>
              {rows.map((payment, index) => (
                <div
                  key={payment.id}
                  className="flex items-center border-t border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70"
                >
                  <Identity payment={payment} tone={AVATARS[index % AVATARS.length]!} />
                  <span className="w-[140px] min-w-0 pr-2">
                    <span className="block truncate font-mono text-[12px] font-semibold text-slate-800">
                      {payment.document_number}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {typeLabel(payment.document_type)}
                    </span>
                  </span>
                  <span className="w-[120px] pr-2">
                    <MethodBadge method={payment.payment_method} />
                  </span>
                  <span className="w-[100px]">
                    <StatusBadge status={payment.status} />
                  </span>
                  <span className="w-[92px] font-mono text-[12px] text-slate-600">
                    {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                  </span>
                  <span className="w-[128px] text-right">
                    <span className="block font-mono text-[13px] font-semibold text-slate-900">
                      {formatCents(payment.amount_cents, currency)}
                    </span>
                    {payment.status !== 'received' && payment.outstanding_cents > 0 ? (
                      <span className="block font-mono text-[11px] text-amber-700">
                        {formatCents(payment.outstanding_cents, currency)} {t('payments.stillDue', 'still due')}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex w-[48px] justify-end">{viewAction(payment)}</span>
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((payment, index) => (
                <div key={payment.id} className="flex items-start gap-3 p-4">
                  <span
                    className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      AVATARS[index % AVATARS.length],
                    )}
                  >
                    {initials(payment.client_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{payment.client_name}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">{payment.document_number}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <MethodBadge method={payment.payment_method} />
                      <StatusBadge status={payment.status} />
                      <span className="font-mono text-[13px] font-semibold text-slate-900">
                        {formatCents(payment.amount_cents, currency)}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0">{viewAction(payment)}</div>
                </div>
              ))}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                <span>
                  {t('common.showing', 'Showing')}{' '}
                  <span className="font-mono text-slate-900">
                    {firstOnPage}-{lastOnPage}
                  </span>{' '}
                  {t('common.of', 'of')} <span className="font-mono text-slate-900">{meta.total}</span>{' '}
                  {t('payments.recorded', 'payments')}
                </span>
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage(meta.current_page - 1)}
                    className="flex h-8 items-center rounded-[10px] border border-slate-200 px-3 text-slate-700 disabled:text-slate-400 enabled:cursor-pointer enabled:hover:bg-slate-50"
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <span className="hidden items-center gap-1.5 lg:flex">
                    {pageNumbers.map((number) => (
                      <button
                        key={number}
                        type="button"
                        aria-current={number === meta.current_page ? 'page' : undefined}
                        onClick={() => setPage(number)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-[10px] cursor-pointer',
                          number === meta.current_page
                            ? 'bg-[#004ac6] font-semibold text-white'
                            : 'border border-slate-200 hover:bg-slate-50',
                        )}
                      >
                        {number}
                      </button>
                    ))}
                  </span>
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage(meta.current_page + 1)}
                    className="flex h-8 items-center rounded-[10px] border border-slate-200 px-3 text-slate-700 disabled:text-slate-400 enabled:cursor-pointer enabled:hover:bg-slate-50"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <PaymentMethodManagerModal open={methodsOpen} onClose={() => setMethodsOpen(false)} />
    </div>
  )
}

function MethodBadge({ method }: { method: { id: number; name: string } | null }) {
  if (method === null) {
    return <span className="text-[13px] text-slate-400">—</span>
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full items-center truncate rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase',
        methodTone(method.id),
      )}
    >
      {method.name}
    </span>
  )
}

function StatusBadge({ status }: { status: PaymentStatusBadge }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase',
        statusTone(status),
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

function viewAction(payment: PaymentEntry) {
  const viewLabel = t('common.view', 'View')
  return (
    <Tooltip content={viewLabel} align="end">
      <Link
        to={documentHref(payment.document_type, payment.document_id)}
        aria-label={`${viewLabel} ${payment.document_number}`}
        className={`${rowAction} hover:bg-slate-100 hover:text-slate-700`}
      >
        <Eye className="h-4 w-4" />
      </Link>
    </Tooltip>
  )
}

function Identity({ payment, tone }: { payment: PaymentEntry; tone: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', tone)}>
        {initials(payment.client_name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-slate-900">{payment.client_name}</span>
        {payment.client_company ? (
          <span className="block truncate text-[11px] text-slate-400">{payment.client_company}</span>
        ) : null}
      </span>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tile,
  icon,
}: {
  label: string
  value: string | number
  hint: string
  tile: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tile)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">{label}</p>
        <p className="font-mono text-[15px] font-bold leading-tight text-slate-900 sm:truncate sm:text-lg">
          {value}
        </p>
        <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

export default Payments
