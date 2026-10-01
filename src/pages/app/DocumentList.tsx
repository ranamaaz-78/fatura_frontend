import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  ImageDown,
  Plus,
  Receipt,
  Search,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tooltip } from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { AVATAR_TONES, TONE_AMBER, TONE_GREEN, TONE_VIOLET } from '../../lib/status'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getSale, listSales } from '../../services/sales'
import { isSaleExpired, isSaleVoided, quoteDaysLeft, type IssuableType, type SaleDisplayStatus, type SaleDocument } from '../../types/sales'
import { rulesFor, typeLabel } from './documentTypes'

type PaymentFilter = SaleDisplayStatus | 'all'

type Theme = {
  icon: LucideIcon
  tile: string
  badge: string
  rowMark: string
}

const PER_PAGE = 8

const rowAction =
  'flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer disabled:opacity-50'

const THEMES: Record<IssuableType, Theme> = {
  factura: {
    icon: Receipt,
    tile: 'bg-brand-600 text-brand-on',
    badge: 'bg-brand-600 text-brand-on',
    rowMark: 'bg-brand-600',
  },
  albaran: {
    icon: Truck,
    tile: 'border-2 border-brand-600 bg-card text-brand-600',
    badge: 'border border-brand-600 bg-card text-brand-600',
    rowMark: 'bg-brand-600',
  },
  quotation: {
    icon: FileText,
    tile: 'border-2 border-brand-600 bg-brand-50 text-brand-600',
    badge: 'border border-brand-600 bg-card text-brand-600',
    rowMark: 'bg-brand-600',
  },
  proforma: {
    icon: FileCheck2,
    tile: 'bg-brand-50 text-brand-600 ring-2 ring-brand-600 ring-inset',
    badge: 'bg-brand-50 text-brand-600 ring-1 ring-brand-600 ring-inset',
    rowMark: 'bg-brand-600',
  },
}

function listHint(type: IssuableType): string {
  switch (type) {
    case 'albaran':
      return t('sales.listAlbaranHint', 'Goods handed over. This is not a tax invoice.')
    case 'quotation':
      return t('sales.listQuoteHint', 'Prices with and without tax. Stock is not reserved.')
    case 'proforma':
      return t('sales.listProformaHint', 'Agreed price only. No tax and no discount.')
    default:
      return t('sales.listInvoiceHint', 'Tax invoices. Mark paid when the money arrives.')
  }
}

const AVATARS = AVATAR_TONES

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '?'
}

function paymentBadge(status: SaleDisplayStatus): string {
  if (status === 'voided') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:ring-rose-500/30'
  if (status === 'partial') return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 app-dark:bg-sky-500/15 app-dark:text-sky-300 app-dark:ring-sky-500/30'
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:ring-emerald-500/30'
    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:ring-amber-500/30'
}

function paymentChipLabel(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase',
        className,
      )}
    >
      {children}
    </span>
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
  value: ReactNode
  hint: string
  tile: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tile)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900">{value}</p>
        <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

function TypeBadges({ document, type }: { document: SaleDocument; type: IssuableType }) {
  const rules = rulesFor(type)
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge className={THEMES[type].badge}>{typeLabel(type)}</Badge>
      {isSaleVoided(document) ? (
        <Badge className={paymentBadge('voided')}>{t('sales.voided', 'Voided')}</Badge>
      ) : rules.settlesPayment || rules.settlesLines ? (
        <>
          <Badge className={paymentBadge(document.payment_status)}>
            {paymentChipLabel(document.payment_status)}
          </Badge>
          {document.payment_status === 'paid' && document.payment_method ? (
            <Badge className="bg-brand-50 text-brand-600 ring-1 ring-brand-600/20">
              {document.payment_method.name}
            </Badge>
          ) : null}
        </>
      ) : type === 'quotation' ? (
        isSaleExpired(document) ? (
          <Badge className="bg-rose-50 text-rose-700 ring-1 ring-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:ring-rose-500/30">
            {t('sales.expired', 'Expired')}
          </Badge>
        ) : document.expires_at ? (
          <Badge
            className={
              quoteDaysLeft(document.expires_at) <= 2
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:ring-amber-500/30'
                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
            }
          >
            {t('sales.validUntil', 'Valid until')} {formatDate(document.expires_at)}
          </Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            {t('sales.notTaxInvoice', 'Not a tax invoice')}
          </Badge>
        )
      ) : (
        <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">{t('sales.noTax', 'No tax')}</Badge>
      )}
    </span>
  )
}

const emptyCounts = { all: 0, pending: 0, paid: 0, partial: 0, voided: 0 }
const emptyStats = {
  total_cents: 0,
  paid_count: 0,
  paid_cents: 0,
  pending_count: 0,
  pending_cents: 0,
  settled_cents: 0,
  month_count: 0,
  month_cents: 0,
  client_count: 0,
}

export function DocumentList({ type }: { type: IssuableType }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'USD'
  const company = session?.company ?? null
  const rules = rulesFor(type)
  const theme = THEMES[type]
  const Icon = theme.icon
  const [payment, setPayment] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<{ id: number; format: 'png' | 'pdf' } | null>(null)

  const showsPaymentFilters = rules.settlesPayment || rules.settlesLines
  const displayStatus = showsPaymentFilters && payment !== 'all' ? payment : undefined

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced])

  const query = useQuery({
    queryKey: ['app', 'sales', { type, search: debounced, display_status: displayStatus, page }],
    queryFn: () =>
      listSales({
        type,
        search: debounced || undefined,
        display_status: displayStatus,
        page,
        per_page: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const counts = query.data?.counts ?? emptyCounts
  const stats = query.data?.stats ?? emptyStats

  const chips: { id: PaymentFilter; label: string; count: number }[] = rules.settlesLines
    ? [
        { id: 'all', label: t('sales.anyPayment', 'Any payment'), count: counts.all },
        { id: 'pending', label: t('sales.pending', 'Pending'), count: counts.pending },
        { id: 'partial', label: t('sales.partial', 'Partial'), count: counts.partial },
        { id: 'paid', label: t('sales.paid', 'Paid'), count: counts.paid },
      ]
    : [
        { id: 'all', label: t('sales.anyPayment', 'Any payment'), count: counts.all },
        { id: 'pending', label: t('sales.pending', 'Pending'), count: counts.pending },
        { id: 'paid', label: t('sales.paid', 'Paid'), count: counts.paid },
        { id: 'voided', label: t('sales.voided', 'Voided'), count: counts.voided },
      ]

  const firstOnPage = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const lastOnPage = meta ? firstOnPage + rows.length - 1 : 0
  const pageNumbers = useMemo(() => {
    if (!meta) return []
    const start = Math.max(1, Math.min(meta.current_page - 1, meta.last_page - 2))
    return Array.from({ length: Math.min(3, meta.last_page) }, (_, index) => start + index)
  }, [meta])

  async function exportRow(document: SaleDocument, format: 'png' | 'pdf') {
    setExporting({ id: document.id, format })
    try {
      const full = await getSale(document.id)
      await downloadSaleDocumentSheet(full, company, currency, format)
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      setExporting(null)
    }
  }

  function actions(document: SaleDocument) {
    const busy = exporting?.id === document.id
    const pdfLabel = t('sales.downloadPdf', 'Download PDF')
    const imageLabel = t('sales.downloadImage', 'Download as image')
    const viewLabel = t('common.view', 'View')
    return (
      <>
        <Tooltip content={pdfLabel} align="end">
          <button
            type="button"
            aria-label={`${pdfLabel} ${document.number}`}
            disabled={busy}
            className={cn(rowAction, 'hover:bg-brand-50 hover:text-brand-600')}
            onClick={() => void exportRow(document, 'pdf')}
          >
            <FileDown className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content={imageLabel} align="end">
          <button
            type="button"
            aria-label={`${imageLabel} ${document.number}`}
            disabled={busy}
            className={cn(rowAction, 'hover:bg-brand-50 hover:text-brand-600')}
            onClick={() => void exportRow(document, 'png')}
          >
            <ImageDown className="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip content={viewLabel} align="end">
          <button
            type="button"
            aria-label={`${viewLabel} ${document.number}`}
            disabled={busy}
            className={cn(rowAction, 'hover:bg-slate-100 hover:text-slate-600')}
            onClick={() => navigate(`${rules.listPath}/${document.id}`)}
          >
            <Eye className="h-4 w-4" />
          </button>
        </Tooltip>
      </>
    )
  }

  const emptyBecauseSearch = Boolean(debounced)
  const emptyBecauseFilter = showsPaymentFilters && payment !== 'all'

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl border border-line/80 bg-card p-6 shadow-xs">
        <span className={cn('absolute inset-x-0 top-0 h-1.5', theme.rowMark)} />
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', theme.tile)}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{typeLabel(type)}</h1>
                <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  {counts.all} {t('sales.documents', 'documents')}
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-xs text-slate-500">{listHint(type)}</p>
            </div>
          </div>
          <Link
            to={`/app/invoices/new?type=${type}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on shadow-xs hover:bg-brand-500 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {t('sales.newOf', 'New :type').replace(':type', typeLabel(type))}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t('sales.documents', 'Documents')}
          value={counts.all}
          hint={t('sales.issuedSoFar', 'Issued so far')}
          tile="bg-brand-50 text-brand-600"
          icon={<Icon className="h-5 w-5" />}
        />
        <Stat
          label={t('sales.totalValue', 'Total value')}
          value={formatCents(stats.total_cents, currency)}
          hint={t('sales.allOpenDocs', 'Across every document')}
          tile={TONE_VIOLET}
          icon={<Receipt className="h-5 w-5" />}
        />
        {rules.settlesPayment ? (
          <>
            <Stat
              label={t('sales.paid', 'Paid')}
              value={stats.paid_count}
              hint={formatCents(stats.paid_cents, currency)}
              tile={TONE_GREEN}
              icon={<FileCheck2 className="h-5 w-5" />}
            />
            <Stat
              label={t('sales.pending', 'Pending')}
              value={formatCents(stats.pending_cents, currency)}
              hint={`${stats.pending_count} ${t('sales.stillOpen', 'still open')}`}
              tile={TONE_AMBER}
              icon={<FileText className="h-5 w-5" />}
            />
          </>
        ) : rules.settlesLines ? (
          <>
            <Stat
              label={t('sales.settled', 'Settled')}
              value={formatCents(stats.settled_cents, currency)}
              hint={t('sales.moneyReceived', 'Money recorded on these proformas')}
              tile={TONE_GREEN}
              icon={<FileCheck2 className="h-5 w-5" />}
            />
            <Stat
              label={t('sales.pending', 'Pending')}
              value={counts.pending + counts.partial}
              hint={t('sales.stillOpen', 'still open')}
              tile={TONE_AMBER}
              icon={<FileText className="h-5 w-5" />}
            />
          </>
        ) : (
          <>
            <Stat
              label={t('sales.thisMonth', 'This month')}
              value={stats.month_count}
              hint={formatCents(stats.month_cents, currency)}
              tile={TONE_GREEN}
              icon={<FileCheck2 className="h-5 w-5" />}
            />
            <Stat
              label={t('sales.clients', 'Clients')}
              value={stats.client_count}
              hint={t('sales.distinctClients', 'Named on these documents')}
              tile="bg-slate-100 text-slate-600"
              icon={<Users className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3">
          <span className="relative w-full max-w-[340px] flex-grow">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('sales.searchPlaceholder', 'Search number or client')}
              className="h-[38px] w-full rounded-xl border border-line bg-card pr-3 pl-8.5 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
          </span>
          {showsPaymentFilters ? (
            <div className="flex flex-wrap gap-1.5 md:ml-auto">
              {chips.map((chip) => {
                const on = payment === chip.id
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setPayment(chip.id)
                      setPage(1)
                    }}
                    className={cn(
                      'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors',
                      on
                        ? 'bg-brand-50 text-brand-600'
                        : 'border border-line bg-card text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {chip.label}
                    <span className={cn('text-[11px]', on ? 'text-brand-500' : 'text-slate-400')}>
                      {chip.count}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:ml-auto">
              <Badge className={theme.badge}>{typeLabel(type)}</Badge>
              {type === 'quotation' ? (
                <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  {t('sales.notTaxInvoice', 'Not a tax invoice')}
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 ring-1 ring-slate-200">{t('sales.noTax', 'No tax')}</Badge>
              )}
              <span className="text-[11px] text-slate-400">
                {counts.all} {t('sales.documents', 'documents')}
              </span>
            </div>
          )}
        </div>

        {query.isPending && !query.data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_item, index) => (
              <span key={index} className="block h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : counts.all === 0 && !debounced ? (
          <EmptyState
            icon={Icon}
            title={t('sales.emptyTitle', 'No documents yet')}
            description={t('sales.emptyOf', 'Issue a :type from New sale.').replace(':type', typeLabel(type))}
            primaryAction={
              <Link
                to={`/app/invoices/new?type=${type}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on"
              >
                <Plus className="h-4 w-4" />
                {t('sales.newOf', 'New :type').replace(':type', typeLabel(type))}
              </Link>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={
              emptyBecauseSearch
                ? t('sales.searchEmpty', 'No documents match that search')
                : t('sales.filterEmpty', 'Nothing in this filter')
            }
            description={
              emptyBecauseSearch
                ? t('sales.searchEmptyBody', 'Try a document number or a client name.')
                : emptyBecauseFilter
                  ? t('sales.filterEmptyBody', 'Switch back to Any payment to see every document.')
                  : t('sales.searchEmptyBody', 'Try a document number or a client name.')
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="flex items-center bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                <span className="min-w-0 flex-1">{t('sales.document', 'Document')}</span>
                <span className="w-48">{t('sales.client', 'Client')}</span>
                <span className="w-28">{t('sales.date', 'Date')}</span>
                <span className="w-56">{t('sales.status', 'Status')}</span>
                <span className="w-28 text-right">{t('sales.total', 'Total')}</span>
                <span className="w-[110px] text-right">{t('common.actions', 'Actions')}</span>
              </div>
              {rows.map((document) => (
                <div
                  key={document.id}
                  className="group relative flex items-center border-t border-slate-100 px-4 py-3.5 transition-colors hover:bg-page"
                >
                  <span className={cn('absolute inset-y-3 left-0 w-0.5 rounded-full opacity-0 group-hover:opacity-100', theme.rowMark)} />
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        AVATARS[document.id % AVATARS.length],
                      )}
                    >
                      {initials(document.client_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{document.number}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {document.client_code ?? typeLabel(type)}
                      </span>
                    </span>
                  </span>
                  <span className="w-48 min-w-0 pr-3">
                    <span className="block truncate text-[13px] font-semibold text-slate-800">{document.client_name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{document.client_company ?? '—'}</span>
                  </span>
                  <span className="w-28 text-xs text-slate-500">{formatDate(document.issued_at)}</span>
                  <span className="w-56">
                    <TypeBadges document={document} type={type} />
                  </span>
                  <span className="w-28 text-right text-sm font-bold text-slate-900">
                    {formatCents(document.total_cents, currency)}
                  </span>
                  <span className="flex w-[110px] justify-end gap-1">{actions(document)}</span>
                </div>
              ))}
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((document) => (
                <div key={document.id} className="flex items-start gap-3 px-4 py-4">
                  <span
                    className={cn(
                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      AVATARS[document.id % AVATARS.length],
                    )}
                  >
                    {initials(document.client_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-slate-900">{document.number}</span>
                      <span className="shrink-0 text-sm font-bold text-slate-900">
                        {formatCents(document.total_cents, currency)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] font-semibold text-slate-700">
                      {document.client_name}
                      {document.client_company ? (
                        <span className="font-normal text-slate-400"> · {document.client_company}</span>
                      ) : null}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <TypeBadges document={document} type={type} />
                      <span className="text-[11px] text-slate-400">{formatDate(document.issued_at)}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">{actions(document)}</span>
                </div>
              ))}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                <span>
                  {t('common.showing', 'Showing')}{' '}
                  <span className="text-slate-900">
                    {firstOnPage}-{lastOnPage}
                  </span>{' '}
                  {t('common.of', 'of')} <span className="text-slate-900">{meta.total}</span>{' '}
                  {t('sales.documents', 'documents')}
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
                            ? 'bg-brand-600 font-semibold text-brand-on'
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
    </div>
  )
}
