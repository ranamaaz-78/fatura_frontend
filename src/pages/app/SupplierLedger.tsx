import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, BookOpen, CalendarDays, Eye, FileDown, Receipt, FileSpreadsheet, HandCoins, ListChecks, Plus, Printer, Search, Trash2, Truck, Wallet, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { usePermissions } from '../../auth/permissions'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Drawer } from '../../components/ui/Drawer'
import { IconButton } from '../../components/ui/IconButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { perPageOf, usePageSize } from '../../components/ui/PageSizeSelect'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { intlLocale, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { TONE_AMBER, TONE_GREEN, TONE_ROSE, TONE_VIOLET } from '../../lib/status'
import { getErrorMessage } from '../../services/api'
import { getLedgerEntry, getLedgerStatement, listAllLedger, listLedger, listLedgerSuppliers, removeLedgerPayment, voidLedgerEntry } from '../../services/ledger'
import { daysSince, exportLedgerEntries, exportLedgerStatement, exportLedgerSuppliers, type LedgerExportFormat } from '../../lib/exportLedger'
import { listSuppliers } from '../../services/suppliers'
import type { LedgerEntry, LedgerStatus, PaymentStatus } from '../../types/ledger'
import { LedgerEntryModal } from './LedgerEntryModal'
import { LedgerPaymentModal } from './LedgerPaymentModal'
import { useLedgerReceipts } from './ledgerReceipts'
import { SlipPreview } from './SlipPreview'
import { day, PaymentBadge } from './ledgerBits'

const EXCEL = 'Excel'

function Stat({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint: string; tone: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</p>
        <p className="truncate text-lg font-bold text-ink">{value}</p>
        <p className="text-[11px] leading-snug text-ink-muted">{hint}</p>
      </div>
    </div>
  )
}

/** Chips that switch one filter. */
function Chips<T extends string>({ chips, value, onChange, primary = false }: { chips: { id: T; label: string }[]; value: T; onChange: (next: T) => void; primary?: boolean }) {
  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={value === chip.id}
          onClick={() => onChange(chip.id)}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center rounded-[10px] px-3 text-xs font-semibold transition-colors',
            value === chip.id ? (primary ? 'bg-brand-600 text-brand-on' : 'bg-brand-50 text-brand-600') : 'border border-line bg-card text-ink-muted hover:bg-page',
          )}
        >
          {chip.label}
        </button>
      ))}
    </>
  )
}

/**
 * The supplier ledger: a record book of what was bought from each supplier (in words, with an amount) and what was
 * paid for it, in full or in parts. It is apart from Purchases: no products, no stock.
 */
function SupplierLedger() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'EUR'

  const [view, setView] = useState<'entries' | 'suppliers'>('entries')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<LedgerStatus>('active')
  const [payment, setPayment] = useState<'all' | PaymentStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize('ledger')
  const [creating, setCreating] = useState(false)
  const [params, setParams] = useSearchParams()
  // "…/app/ledger?open=12" (the link from a purchase) opens that entry straight away.
  const [openId, setOpenId] = useState<number | null>(() => Number(params.get('open')) || null)
  const [statementOf, setStatementOf] = useState<number | null>(null)
  const [stFrom, setStFrom] = useState('')
  const [stTo, setStTo] = useState('')
  const [exporting, setExporting] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const receipts = useLedgerReceipts()
  const [removing, setRemoving] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, supplierId, from, to, status, payment])

  // The link has done its job once the entry is open: the address goes back to the plain page.
  useEffect(() => {
    if (params.get('open')) setParams({}, { replace: true })
  }, [params, setParams])

  const suppliers = useQuery({ queryKey: ['app', 'suppliers', 'all', ''], queryFn: () => listSuppliers() })
  const query = useQuery({
    queryKey: ['app', 'ledger', 'list', { search: debounced, supplierId, from, to, status, payment, page, pageSize }],
    queryFn: () =>
      listLedger({
        page,
        per_page: perPageOf(pageSize),
        search: debounced || undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
        from: from || undefined,
        to: to || undefined,
        status,
        payment,
      }),
    placeholderData: keepPreviousData,
  })
  const bySupplier = useQuery({ queryKey: ['app', 'ledger', 'suppliers'], queryFn: listLedgerSuppliers, enabled: view === 'suppliers' })
  const detail = useQuery({ queryKey: ['app', 'ledger', 'one', openId], queryFn: () => getLedgerEntry(openId as number), enabled: openId !== null })
  const statement = useQuery({
    queryKey: ['app', 'ledger', 'statement', statementOf, stFrom, stTo],
    queryFn: () => getLedgerStatement(statementOf as number, stFrom, stTo),
    enabled: statementOf !== null && (stFrom === '' || stTo === '' || stFrom <= stTo),
    placeholderData: keepPreviousData,
  })

  /** A colour of the theme as #rrggbb: the exports are drawn away from the page, where theme variables are not known. */
  function brandColor(): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--app-primary').trim()
    return /^#[0-9a-f]{6}$/i.test(value) ? value : '#1e3a8a'
  }

  /** Writes the current view (the entries with their filters, the suppliers, or one supplier's account) as Excel or PDF. */
  async function runExport(what: 'entries' | 'suppliers' | 'statement', format: LedgerExportFormat) {
    setExporting(`${what}-${format}`)
    try {
      const context = { companyName: session?.company?.name ?? '', currency, brand: brandColor() }

      if (what === 'entries') {
        const supplierName = (suppliers.data ?? []).find((supplier) => String(supplier.id) === supplierId)?.name
        const filters = [
          supplierName,
          from || to ? `${from ? day(from) : '…'} → ${to ? day(to) : '…'}` : null,
          debounced ? `“${debounced}”` : null,
          payment !== 'all' ? paymentChips.find((chip) => chip.id === payment)?.label : null,
          status === 'voided' ? t('ledger.statusCancelled', 'Cancelled') : status === 'all' ? t('ledger.statusAll', 'All') : null,
        ].filter(Boolean).join(', ')
        const entries = await listAllLedger({ search: debounced || undefined, supplier_id: supplierId ? Number(supplierId) : undefined, from: from || undefined, to: to || undefined, status, payment })
        if (entries.length === 0) {
          push({ tone: 'warning', title: t('ledger.exportNothing', 'There is nothing to export with these filters.') })
          return
        }
        await exportLedgerEntries(format, entries, { ...context, filters })
      } else if (what === 'suppliers') {
        const rows = bySupplier.data ?? (await listLedgerSuppliers())
        if (rows.length === 0) {
          push({ tone: 'warning', title: t('ledger.exportNothing', 'There is nothing to export with these filters.') })
          return
        }
        await exportLedgerSuppliers(format, rows, context)
      } else if (statement.data) {
        await exportLedgerStatement(format, statement.data, context)
      }
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      setExporting(null)
    }
  }

  /** Excel and PDF buttons for one view. */
  const exportButtons = (what: 'entries' | 'suppliers' | 'statement', disabled: boolean) => (
    <span className="flex items-center gap-1.5">
      <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === `${what}-xlsx`} disabled={disabled || exporting !== null} onClick={() => void runExport(what, 'xlsx')}>
        {EXCEL}
      </Button>
      <Button variant="secondary" size="sm" icon={<FileDown className="h-4 w-4" />} loading={exporting === `${what}-pdf`} disabled={disabled || exporting !== null} onClick={() => void runExport(what, 'pdf')}>
        PDF
      </Button>
    </span>
  )

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const stats = query.data?.stats ?? { owed_cents: 0, month_bought_cents: 0, month_paid_cents: 0, open_count: 0 }
  const filtered = Boolean(debounced || supplierId || from || to || payment !== 'all')
  const entry: LedgerEntry | undefined = detail.data

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['app', 'ledger'] })

  const removePayment = useMutation({
    mutationFn: (paymentId: number) => removeLedgerPayment(openId as number, paymentId),
    onSuccess: () => {
      setRemoving(null)
      push({ tone: 'success', title: t('ledger.paymentRemoved', 'Payment removed.') })
      refresh()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const cancel = useMutation({
    mutationFn: () => voidLedgerEntry(openId as number, reason.trim()),
    onSuccess: () => {
      setCancelling(false)
      setReason('')
      push({ tone: 'success', title: t('ledger.cancelled', 'Entry cancelled.') })
      refresh()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const paymentChips: { id: 'all' | PaymentStatus; label: string }[] = [
    { id: 'all', label: t('ledger.payAllShort', 'Any payment') },
    { id: 'unpaid', label: t('ledger.payUnpaid', 'Unpaid') },
    { id: 'partial', label: t('ledger.payPartial', 'Partly paid') },
    { id: 'paid', label: t('ledger.payPaid', 'Paid') },
  ]
  const statusChips: { id: LedgerStatus; label: string }[] = [
    { id: 'active', label: t('ledger.statusActive', 'Active') },
    { id: 'voided', label: t('ledger.statusCancelled', 'Cancelled') },
    { id: 'all', label: t('ledger.statusAll', 'All') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-brand-on">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-ink">{t('nav.ledger', 'Supplier Payments')}</h1>
            <p className="mt-1 max-w-xl text-xs text-ink-muted">
              {t('ledger.subtitle', 'A record book: what you bought from each supplier, what you paid for it and what you still owe. It does not touch your stock.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportButtons(view === 'suppliers' ? 'suppliers' : 'entries', view === 'suppliers' ? (bySupplier.data ?? []).length === 0 : rows.length === 0)}
          {can('ledger.create') ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              {t('ledger.new', 'New entry')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('ledger.statOwed', 'You owe suppliers')} value={formatCents(stats.owed_cents, currency)} hint={t('ledger.statOwedHint', 'Still to pay, on active entries')} tone={TONE_ROSE} icon={<HandCoins className="h-5 w-5" />} />
        <Stat label={t('ledger.statBought', 'Bought this month')} value={formatCents(stats.month_bought_cents, currency)} hint={t('ledger.statBoughtHint', 'Cancelled entries not counted')} tone={TONE_AMBER} icon={<Wallet className="h-5 w-5" />} />
        <Stat label={t('ledger.statPaid', 'Paid this month')} value={formatCents(stats.month_paid_cents, currency)} hint={t('ledger.statPaidHint', 'Payments made to suppliers')} tone={TONE_GREEN} icon={<ListChecks className="h-5 w-5" />} />
        <Stat label={t('ledger.statOpen', 'Open entries')} value={stats.open_count} hint={t('ledger.statOpenHint', 'Not fully paid yet')} tone={TONE_VIOLET} icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="flex gap-1.5">
        <Chips
          primary
          value={view}
          onChange={setView}
          chips={[
            { id: 'entries', label: t('ledger.viewEntries', 'Entries') },
            { id: 'suppliers', label: t('ledger.viewSuppliers', 'By supplier') },
          ]}
        />
      </div>

      {view === 'suppliers' ? (
        <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
          {bySupplier.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_item, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (bySupplier.data ?? []).length === 0 ? (
            <EmptyState icon={BookOpen} title={t('ledger.emptyTitle', 'Nothing written down yet')} description={t('ledger.emptyBody', 'Write down what you buy from a supplier and keep track of what you owe.')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-page text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">{t('ledger.supplier', 'Supplier')}</th>
                    <th className="px-4 py-2.5 text-right">{t('ledger.entries', 'Entries')}</th>
                    <th className="px-4 py-2.5 text-right">{t('ledger.bought', 'Bought')}</th>
                    <th className="px-4 py-2.5 text-right">{t('ledger.paid', 'Paid')}</th>
                    <th className="px-4 py-2.5 text-right">{t('ledger.balance', 'Balance')}</th>
                    <th className="px-4 py-2.5">{t('ledger.lastBought', 'Last purchase')}</th>
                    <th className="px-4 py-2.5">{t('ledger.lastPaid', 'Last payment')}</th>
                    <th className="px-4 py-2.5 text-right">{t('ledger.oldestOpen', 'Oldest open (days)')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(bySupplier.data ?? []).map((row) => (
                    <tr key={row.supplier_id} onClick={() => setStatementOf(row.supplier_id)} className="cursor-pointer border-t border-line transition-colors hover:bg-page">
                      <td className="px-4 py-3 font-semibold text-ink">{row.supplier_name}</td>
                      <td className="px-4 py-3 text-right text-ink-muted">{row.entries_count}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatCents(row.bought_cents, currency)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{formatCents(row.paid_cents, currency)}</td>
                      <td className={cn('px-4 py-3 text-right font-bold', row.owed_cents > 0 ? 'text-rose-700' : 'text-ink-muted')}>{row.owed_cents > 0 ? formatCents(row.owed_cents, currency) : t('ledger.settled', 'Settled')}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{row.last_bill_date ? day(row.last_bill_date) : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{row.last_paid_on ? day(row.last_paid_on) : '—'}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', row.oldest_open_on && daysSince(row.oldest_open_on) > 60 ? 'text-rose-700' : 'text-ink-muted')}>{row.oldest_open_on ? daysSince(row.oldest_open_on) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
          <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
            <span className="relative w-full max-w-[280px] min-w-[200px] flex-grow">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('ledger.searchPlaceholder', 'Search supplier, description or number')}
                className="h-[38px] w-full rounded-xl border border-line bg-card pr-3 pl-9 text-[13px] text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </span>
            <div className="w-48">
              <Select compact aria-label={t('ledger.supplier', 'Supplier')} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">{t('ledger.allSuppliers', 'All suppliers')}</option>
                {(suppliers.data ?? []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-36">
              <Input compact type="date" aria-label={t('ledger.from', 'From')} value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="w-36">
              <Input compact type="date" aria-label={t('ledger.to', 'To')} value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
            </div>
            {filtered ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSupplierId('')
                  setFrom('')
                  setTo('')
                  setPayment('all')
                }}
                className="inline-flex h-[38px] cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-muted hover:bg-page hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                {t('sales.clearClient', 'Clear')}
              </button>
            ) : null}
            <div className="flex flex-wrap gap-1.5 md:ml-auto">
              <Chips primary chips={paymentChips} value={payment} onChange={setPayment} />
              <span className="mx-1 hidden w-px self-stretch bg-line md:block" />
              <Chips chips={statusChips} value={status} onChange={setStatus} />
            </div>
          </div>

          {query.isPending && !query.data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_item, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={filtered ? t('ledger.noMatch', 'No entries match that') : t('ledger.emptyTitle', 'Nothing written down yet')}
              description={filtered ? t('ledger.noMatchBody', 'Try another supplier, date or word.') : t('ledger.emptyBody', 'Write down what you buy from a supplier and keep track of what you owe.')}
              primaryAction={
                !filtered && can('ledger.create') ? (
                  <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                    {t('ledger.new', 'New entry')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-page text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                    <tr>
                      <th className="px-4 py-2.5">{t('ledger.date', 'Date')}</th>
                      <th className="px-4 py-2.5">{t('ledger.number', 'Number')}</th>
                      <th className="px-4 py-2.5">{t('ledger.supplier', 'Supplier')}</th>
                      <th className="px-4 py-2.5">{t('ledger.refShort', 'Invoice no.')}</th>
                      <th className="px-4 py-2.5 text-right">{t('ledger.amount', 'Amount')}</th>
                      <th className="px-4 py-2.5 text-right">{t('ledger.paid', 'Paid')}</th>
                      <th className="px-4 py-2.5 text-right">{t('ledger.balance', 'Balance')}</th>
                      <th className="px-4 py-2.5">{t('ledger.lastPaid', 'Last payment')}</th>
                      <th className="px-4 py-2.5 text-right">{t('ledger.age', 'Days open')}</th>
                      <th className="px-4 py-2.5" />
                      <th className="px-4 py-2.5 text-right">{t('ledger.payStatement', 'Statement')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer border-t border-line transition-colors hover:bg-page">
                        <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{day(row.bill_date)}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{row.number}</td>
                        <td className="max-w-[320px] px-4 py-3">
                          <span className="block font-semibold text-ink">{row.supplier_name}</span>
                          <span className="block truncate text-[11px] text-ink-muted">{row.description}</span>
                          {row.purchase_number ? <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">{t('ledger.fromPurchase', 'From purchase {number}', { number: row.purchase_number })}</span> : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{row.reference ?? '—'}</td>
                        <td className={cn('px-4 py-3 text-right font-bold text-ink', row.is_voided && 'line-through opacity-60')}>
                          {formatCents(row.amount_cents, currency)}
                          {row.iva ? (
                            <span className="block text-[10px] font-medium whitespace-nowrap text-ink-muted">
                              {t('ledger.ivaInside', 'incl. IVA {percent}%: {amount}', { percent: row.iva.percent, amount: formatCents(row.iva.iva_cents, currency) })}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">{row.is_voided ? '—' : formatCents(row.paid_cents, currency)}</td>
                        <td className={cn('px-4 py-3 text-right font-semibold', row.owed_cents > 0 && !row.is_voided ? 'text-rose-700' : 'text-ink-muted')}>{row.is_voided ? '—' : formatCents(row.owed_cents, currency)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{row.last_paid_on ? day(row.last_paid_on) : '—'}</td>
                        <td className={cn('px-4 py-3 text-right font-semibold', !row.is_voided && row.owed_cents > 0 && daysSince(row.bill_date) > 60 ? 'text-rose-700' : 'text-ink-muted')}>
                          {!row.is_voided && row.owed_cents > 0 ? daysSince(row.bill_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.is_voided ? <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', TONE_ROSE)}>{t('ledger.statusCancelled', 'Cancelled')}</span> : <PaymentBadge status={row.payment_status} />}
                        </td>
                        {/* The paper for this entry's payments, without opening it. Only where something was paid. */}
                        <td className="px-4 py-1.5 text-right whitespace-nowrap" onClick={(event) => event.stopPropagation()}>
                          {(row.payments_count ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <IconButton label={t('ledger.printPayments', 'Print payment statement')} tooltipAlign="end" className="min-h-9 min-w-9" onClick={() => void receipts.printStatement(row.id)}>
                                <Printer className="h-4 w-4" />
                              </IconButton>
                              <IconButton label={t('ledger.downloadPayments', 'Download payment statement (PDF)')} tooltipAlign="end" className="min-h-9 min-w-9" onClick={() => void receipts.statement(row.id)}>
                                <FileDown className="h-4 w-4" />
                              </IconButton>
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta && meta.total > 0 ? (
                <Pagination
                  page={meta.current_page}
                  pageCount={meta.last_page}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPage(1)
                  }}
                  summary={`${t('common.showing', 'Showing')} ${(meta.current_page - 1) * meta.per_page + 1}-${(meta.current_page - 1) * meta.per_page + rows.length} ${t('common.of', 'of')} ${meta.total}`}
                />
              ) : null}
            </>
          )}
        </div>
      )}

      <LedgerEntryModal open={creating} onClose={() => setCreating(false)} currency={currency} />
      <LedgerPaymentModal entry={paying && entry ? entry : null} currency={currency} onClose={() => setPaying(false)} />
      <SlipPreview preview={receipts.preview} onClose={receipts.closePreview} />

      {/* One entry: what it was, the payments against it, and the buttons to pay or cancel. */}
      <Drawer open={openId !== null} onClose={() => setOpenId(null)} side="right" width="w-full max-w-[520px]">
        <div className="flex h-full flex-col bg-card">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink">{entry?.number ?? t('nav.ledger', 'Supplier Payments')}</h2>
              {entry ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {day(entry.bill_date)} · {entry.supplier_name}
                </p>
              ) : null}
            </div>
            <button type="button" aria-label={t('common.close', 'Close')} onClick={() => setOpenId(null)} className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {detail.isPending || !entry ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                {entry.is_voided ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-900">
                    <p className="font-bold">{t('ledger.statusCancelled', 'Cancelled')}</p>
                    {entry.void_reason ? <p className="mt-0.5">{entry.void_reason}</p> : null}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-line p-4">
                  <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t('ledger.what', 'What came from the supplier')}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{entry.description}</p>
                  {entry.purchase_number ? <p className="mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">{t('ledger.fromPurchase', 'From purchase {number}', { number: entry.purchase_number })}</p> : null}
                  <p className="mt-3 text-xs text-ink-muted">{entry.iva ? t('ledger.amountWithIva', 'Amount (IVA included)') : t('ledger.amount', 'Amount')}</p>
                  <p className="text-2xl font-extrabold text-ink">{formatCents(entry.amount_cents, currency)}</p>
                  {entry.iva ? (
                    <dl className="mt-3 overflow-hidden rounded-xl border border-line text-xs">
                      <div className="flex justify-between px-3 py-2">
                        <dt className="text-ink-muted">{t('purchases.baseAmount', 'Base (before IVA)')}</dt>
                        <dd className="font-semibold text-ink">{formatCents(entry.iva.base_cents, currency)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-line px-3 py-2">
                        <dt className="text-ink-muted">
                          {t('purchases.ivaAmount', 'IVA')} {entry.iva.percent}%
                          <span className="ml-1 text-[10px]">· {entry.iva.mode === 'included' ? t('ledger.ivaWasIncluded', 'was in the prices') : t('ledger.ivaWasAdded', 'added on top')}</span>
                        </dt>
                        <dd className="font-semibold text-ink">{formatCents(entry.iva.iva_cents, currency)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-line bg-page px-3 py-2">
                        <dt className="font-semibold text-ink">{t('purchases.totalWithIva', 'Total to pay')}</dt>
                        <dd className="font-bold text-ink">{formatCents(entry.amount_cents, currency)}</dd>
                      </div>
                    </dl>
                  ) : null}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-ink-muted">{t('ledger.reference', 'Supplier invoice no. (optional)')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{entry.reference ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t('ledger.recordedBy', 'Written by')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{entry.created_by_name ?? '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-muted">{t('ledger.recordedOn', 'Written on')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{entry.created_at ? new Date(entry.created_at).toLocaleString(intlLocale()) : '—'}</dd>
                  </div>
                </dl>

                {!entry.is_voided ? (
                  <div className="overflow-hidden rounded-2xl border border-line">
                    <div className="flex items-center justify-between gap-3 bg-page px-3 py-2.5">
                      <span className="text-xs font-bold tracking-[0.06em] text-ink-muted uppercase">{t('ledger.payments', 'Payments to the supplier')}</span>
                      <PaymentBadge status={entry.payment_status} />
                    </div>
                    {(entry.payments ?? []).length === 0 ? (
                      <p className="border-t border-line px-3 py-3 text-xs text-ink-muted">{t('ledger.noPayments', 'Nothing has been paid yet.')}</p>
                    ) : (
                      (entry.payments ?? []).map((row) => (
                        <div key={row.id} className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-xs">
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">
                              {day(row.paid_on)}
                              {row.payment_method_name ? ` · ${row.payment_method_name}` : ''}
                            </span>
                            {row.note ? <span className="block truncate text-[11px] text-ink-muted">{row.note}</span> : null}
                          </span>
                          <span className="font-bold text-emerald-700">{formatCents(row.amount_cents, currency)}</span>
                          <button
                            type="button"
                            title={t('ledger.viewReceipt', 'View receipt')}
                            aria-label={t('ledger.viewReceipt', 'View receipt')}
                            onClick={() => void receipts.viewReceipt(entry.id, row.id)}
                            className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-brand-600"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t('ledger.downloadReceipt', 'Download receipt')}
                            aria-label={t('ledger.downloadReceipt', 'Download receipt')}
                            onClick={() => void receipts.receipt(entry.id, row.id)}
                            className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-brand-600"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                          {can('ledger.pay') ? (
                            <button
                              type="button"
                              title={t('common.delete', 'Delete')}
                              aria-label={t('common.delete', 'Delete')}
                              onClick={() => setRemoving(row.id)}
                              className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                    <div className="grid grid-cols-2 gap-2 border-t border-line bg-page px-3 py-2.5 text-xs">
                      <span className="text-ink-muted">
                        {t('ledger.paid', 'Paid')}: <span className="font-bold text-emerald-700">{formatCents(entry.paid_cents, currency)}</span>
                      </span>
                      <span className="text-right text-ink-muted">
                        {t('ledger.owed', 'Still owed')}: <span className={cn('font-bold', entry.owed_cents > 0 ? 'text-rose-700' : 'text-ink')}>{formatCents(entry.owed_cents, currency)}</span>
                      </span>
                    </div>
                    {(entry.payments ?? []).length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 border-t border-line px-3 py-3">
                        <Button fullWidth variant="secondary" icon={<Eye className="h-4 w-4" />} className="whitespace-nowrap" title={t('ledger.viewStatement', 'View statement')} onClick={() => void receipts.viewStatement(entry.id)}>
                          {t('common.view', 'View')}
                        </Button>
                        <Button fullWidth variant="secondary" icon={<Printer className="h-4 w-4" />} className="whitespace-nowrap" onClick={() => void receipts.printStatement(entry.id)}>
                          {t('sales.print', 'Print')}
                        </Button>
                        <Button fullWidth variant="secondary" icon={<FileDown className="h-4 w-4" />} className="whitespace-nowrap" title={t('ledger.downloadStatementShort', 'Download PDF')} onClick={() => void receipts.statement(entry.id)}>
                          PDF
                        </Button>
                      </div>
                    ) : null}
                    {entry.owed_cents > 0 && can('ledger.pay') ? (
                      <div className="border-t border-line px-3 py-3">
                        <Button fullWidth icon={<HandCoins className="h-4 w-4" />} onClick={() => setPaying(true)}>
                          {t('ledger.addPayment', 'Add a payment')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {entry.notes ? (
                  <div>
                    <p className="text-xs font-semibold text-ink-muted">{t('ledger.notesTitle', 'Notes')}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{entry.notes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {entry && !entry.is_voided && can('ledger.void') ? (
            <div className="border-t border-line px-5 py-3">
              <Button variant="danger" fullWidth icon={<Ban className="h-4 w-4" />} disabled={(entry.payments ?? []).length > 0} onClick={() => setCancelling(true)}>
                {t('ledger.cancel', 'Cancel this entry')}
              </Button>
              {(entry.payments ?? []).length > 0 ? <p className="mt-2 text-center text-[11px] text-ink-muted">{t('ledger.cancelNeedsRemoval', 'Remove its payments first, then cancel it.')}</p> : null}
            </div>
          ) : null}
        </div>
      </Drawer>

      {/* One supplier's account, like a ledger page: opening balance, each purchase and payment, running balance. */}
      <Drawer
        open={statementOf !== null}
        onClose={() => {
          setStatementOf(null)
          setStFrom('')
          setStTo('')
        }}
        side="right"
        width="w-full max-w-[820px]"
      >
        <div className="flex h-full flex-col bg-card">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink">{statement.data?.supplier.name ?? t('ledger.account', 'Account')}</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{t('ledger.accountHint', 'Everything written down for this supplier, and what is still owed.')}</p>
            </div>
            <button
              type="button"
              aria-label={t('common.close', 'Close')}
              onClick={() => {
                setStatementOf(null)
                setStFrom('')
                setStTo('')
              }}
              className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-3">
            <div className="w-40">
              <Input compact type="date" label={t('ledger.from', 'From')} value={stFrom} max={stTo || undefined} onChange={(event) => setStFrom(event.target.value)} />
            </div>
            <div className="w-40">
              <Input compact type="date" label={t('ledger.to', 'To')} value={stTo} min={stFrom || undefined} onChange={(event) => setStTo(event.target.value)} />
            </div>
            {stFrom || stTo ? (
              <button
                type="button"
                onClick={() => {
                  setStFrom('')
                  setStTo('')
                }}
                className="inline-flex h-[38px] cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-muted hover:bg-page hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
                {t('sales.clearClient', 'Clear')}
              </button>
            ) : null}
            <span className="ml-auto">{exportButtons('statement', !statement.data)}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {statement.isPending || !statement.data ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                <div className={cn('grid grid-cols-2 gap-2 rounded-xl bg-page p-3 text-center', (statement.data.iva_cents ?? 0) > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4')}>
                  <div>
                    <p className="text-[11px] text-ink-muted">{t('ledger.opening', 'Opening balance')}</p>
                    <p className="text-sm font-bold text-ink">{formatCents(statement.data.opening_cents, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-muted">{t('ledger.bought', 'Bought')}</p>
                    <p className="text-sm font-bold text-ink">{formatCents(statement.data.bought_cents, currency)}</p>
                  </div>
                  {(statement.data.iva_cents ?? 0) > 0 ? (
                    <div>
                      <p className="text-[11px] text-ink-muted">{t('ledger.ivaInBought', 'IVA in it')}</p>
                      <p className="text-sm font-bold text-ink">{formatCents(statement.data.iva_cents ?? 0, currency)}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[11px] text-ink-muted">{t('ledger.paid', 'Paid')}</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCents(statement.data.paid_cents, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ink-muted">{t('ledger.closing', 'Closing balance')}</p>
                    <p className="text-sm font-bold text-rose-700">{formatCents(statement.data.closing_cents, currency)}</p>
                  </div>
                </div>

                {statement.data.transactions.length === 0 && !statement.data.from ? (
                  <p className="py-8 text-center text-sm text-ink-muted">{t('ledger.noMoves', 'Nothing was written down for this supplier in these dates.')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-line">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-page text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                        <tr>
                          <th className="px-3 py-2">{t('ledger.date', 'Date')}</th>
                          <th className="px-3 py-2">{t('ledger.type', 'Type')}</th>
                          <th className="px-3 py-2">{t('ledger.number', 'Number')}</th>
                          <th className="px-3 py-2">{t('ledger.details', 'Details')}</th>
                          <th className="px-3 py-2 text-right">{t('ledger.bought', 'Bought')}</th>
                          <th className="px-3 py-2 text-right">{t('ledger.paid', 'Paid')}</th>
                          <th className="px-3 py-2 text-right">{t('ledger.balance', 'Balance')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.data.from ? (
                          <tr className="border-t border-line bg-page/60 font-semibold">
                            <td className="px-3 py-2 whitespace-nowrap text-ink-muted">{day(statement.data.from)}</td>
                            <td className="px-3 py-2 text-ink" colSpan={5}>
                              {t('ledger.opening', 'Opening balance')}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">{formatCents(statement.data.opening_cents, currency)}</td>
                          </tr>
                        ) : null}
                        {statement.data.transactions.map((move, index) => (
                          <tr key={`${move.type}-${index}`} className="border-t border-line">
                            <td className="px-3 py-2 whitespace-nowrap text-ink-muted">{day(move.date)}</td>
                            <td className="px-3 py-2">
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', move.type === 'bill' ? TONE_AMBER : TONE_GREEN)}>{move.type === 'bill' ? t('ledger.typeBill', 'Purchase') : t('ledger.typePayment', 'Payment')}</span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-ink">{move.number}</td>
                            <td className="max-w-[240px] truncate px-3 py-2 text-ink-muted" title={move.details}>
                              {move.details}
                              {move.reference ? ` (${move.reference})` : ''}
                              {(move.iva_cents ?? 0) > 0 ? (
                                <span className="block text-[10px] text-ink-muted">
                                  {t('ledger.ivaInside', 'incl. IVA {percent}%: {amount}', { percent: move.iva_percent ?? 0, amount: formatCents(move.iva_cents ?? 0, currency) })}
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right text-ink">{move.bought_cents > 0 ? formatCents(move.bought_cents, currency) : ''}</td>
                            <td className="px-3 py-2 text-right text-emerald-700">{move.paid_cents > 0 ? formatCents(move.paid_cents, currency) : ''}</td>
                            <td className={cn('px-3 py-2 text-right font-bold', move.balance_cents > 0 ? 'text-rose-700' : 'text-ink')}>{formatCents(move.balance_cents, currency)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-line bg-page font-bold">
                          <td className="px-3 py-2.5 text-ink" colSpan={4}>
                            {t('ledger.closing', 'Closing balance')}
                          </td>
                          <td className="px-3 py-2.5 text-right text-ink">{formatCents(statement.data.bought_cents, currency)}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700">{formatCents(statement.data.paid_cents, currency)}</td>
                          <td className="px-3 py-2.5 text-right text-rose-700">{formatCents(statement.data.closing_cents, currency)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing !== null && removePayment.mutate(removing)}
        loading={removePayment.isPending}
        tone="warning"
        title={t('ledger.removePaymentTitle', 'Remove this payment?')}
        description={t('ledger.removePaymentBody', 'What is owed on this entry goes up again. The record of the payment is kept.')}
        confirmLabel={t('common.delete', 'Delete')}
      />

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        maxWidth="md"
        title={t('ledger.cancelTitle', 'Why is this entry being cancelled?')}
        subtitle={t('ledger.cancelSubtitle', 'It stays in the list as cancelled and no longer counts as owed.')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate()}>
              {t('ledger.cancelConfirm', 'Cancel entry')}
            </Button>
          </>
        }
      >
        <Textarea
          required
          compact
          rows={3}
          maxLength={255}
          label={t('sales.voidReason', 'Reason')}
          hint={t('sales.voidReasonHint', 'At least 3 characters. This stays on the document.')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  )
}

export default SupplierLedger
