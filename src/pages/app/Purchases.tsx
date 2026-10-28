import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CalendarDays, Download, PackageCheck, Plus, Search, ShoppingBag, Truck, Wallet, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { usePermissions } from '../../auth/permissions'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { intlLocale, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { TONE_AMBER, TONE_GREEN, TONE_ROSE, TONE_VIOLET } from '../../lib/status'
import { getErrorMessage } from '../../services/api'
import { downloadPurchases } from '../../lib/exportPurchases'
import { getPurchase, listAllPurchases, listPurchases, voidPurchase } from '../../services/purchases'
import { listSuppliers } from '../../services/suppliers'
import type { Purchase, PurchaseStatus } from '../../types/purchases'
import { PurchaseModal } from './PurchaseModal'

const PER_PAGE = 10

/** "2026-10-28" as dd/mm/yyyy, without going through a time zone. */
function day(value: string): string {
  const [year, month, date] = value.split('-')
  return `${date}/${month}/${year}`
}

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

function Purchases() {
  const { session } = useAuth()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'EUR'

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<PurchaseStatus>('active')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced, supplierId, from, to, status])

  const suppliers = useQuery({ queryKey: ['app', 'suppliers', 'all', ''], queryFn: () => listSuppliers() })
  const query = useQuery({
    queryKey: ['app', 'purchases', { search: debounced, supplierId, from, to, status, page }],
    queryFn: () =>
      listPurchases({
        page,
        per_page: PER_PAGE,
        search: debounced || undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
        from: from || undefined,
        to: to || undefined,
        status,
      }),
    placeholderData: keepPreviousData,
  })

  const detail = useQuery({
    queryKey: ['app', 'purchases', 'one', openId],
    queryFn: () => getPurchase(openId as number),
    enabled: openId !== null,
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const stats = query.data?.stats ?? { month_count: 0, month_cents: 0, month_suppliers: 0 }
  const filtered = Boolean(debounced || supplierId || from || to)
  const purchase: Purchase | undefined = detail.data

  const cancel = useMutation({
    mutationFn: () => voidPurchase(openId as number, reason.trim()),
    onSuccess: () => {
      setCancelling(false)
      setReason('')
      push({ tone: 'success', title: t('purchases.cancelled', 'Purchase cancelled. The stock was taken back.') })
      void queryClient.invalidateQueries({ queryKey: ['app', 'purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  /** What is on screen, every page of it, as an Excel sheet: the same search, supplier, dates and status. */
  async function exportExcel() {
    setExporting(true)
    try {
      const purchases = await listAllPurchases({
        search: debounced || undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
        from: from || undefined,
        to: to || undefined,
        status,
      })

      if (purchases.length === 0) {
        push({ tone: 'warning', title: t('purchases.exportNothing', 'There are no purchases to export with these filters.') })
        return
      }

      const supplierName = (suppliers.data ?? []).find((supplier) => String(supplier.id) === supplierId)?.name
      const filters = [
        supplierName,
        from || to ? `${from ? day(from) : '…'} → ${to ? day(to) : '…'}` : null,
        debounced ? `“${debounced}”` : null,
        status === 'voided' ? t('purchases.statusCancelled', 'Cancelled') : status === 'all' ? t('purchases.statusAll', 'All') : null,
      ]
        .filter(Boolean)
        .join(', ')

      await downloadPurchases(purchases, { companyName: session?.company?.name ?? '', currency, filters })
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      setExporting(false)
    }
  }

  const chips: { id: PurchaseStatus; label: string }[] = [
    { id: 'active', label: t('purchases.statusActive', 'Active') },
    { id: 'voided', label: t('purchases.statusCancelled', 'Cancelled') },
    { id: 'all', label: t('purchases.statusAll', 'All') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-brand-on">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-ink">{t('nav.purchases', 'Purchases')}</h1>
            <p className="mt-1 max-w-xl text-xs text-ink-muted">
              {t('purchases.subtitle', 'What you bought from your suppliers: which products, on which date, how many and at what rate.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} loading={exporting} disabled={rows.length === 0} onClick={() => void exportExcel()}>
            {t('purchases.export', 'Export to Excel')}
          </Button>
          {can('stock.create') ? (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              {t('purchases.new', 'New purchase')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t('purchases.statCount', 'Purchases this month')} value={stats.month_count} hint={t('purchases.statCountHint', 'Cancelled ones not counted')} tone={TONE_VIOLET} icon={<PackageCheck className="h-5 w-5" />} />
        <Stat label={t('purchases.statSpent', 'Spent this month')} value={formatCents(stats.month_cents, currency)} hint={t('purchases.statSpentHint', 'At the rates you bought at')} tone={TONE_AMBER} icon={<Wallet className="h-5 w-5" />} />
        <Stat label={t('purchases.statSuppliers', 'Suppliers this month')} value={stats.month_suppliers} hint={t('purchases.statSuppliersHint', 'You bought from')} tone={TONE_GREEN} icon={<Truck className="h-5 w-5" />} />
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          <span className="relative w-full max-w-[280px] min-w-[200px] flex-grow">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('purchases.searchPlaceholder', 'Search number, supplier or product')}
              className="h-[38px] w-full rounded-xl border border-line bg-card pr-3 pl-9 text-[13px] text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
          </span>
          <div className="w-48">
            <Select compact aria-label={t('purchases.supplier', 'Supplier')} value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">{t('purchases.allSuppliers', 'All suppliers')}</option>
              {(suppliers.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Input compact type="date" aria-label={t('purchases.from', 'From')} value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="w-36">
            <Input compact type="date" aria-label={t('purchases.to', 'To')} value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
          </div>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSupplierId('')
                setFrom('')
                setTo('')
              }}
              className="inline-flex h-[38px] cursor-pointer items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-muted hover:bg-page hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
              {t('sales.clearClient', 'Clear')}
            </button>
          ) : null}
          <div className="flex gap-1.5 md:ml-auto">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                aria-pressed={status === chip.id}
                onClick={() => setStatus(chip.id)}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center rounded-[10px] px-3 text-xs font-semibold transition-colors',
                  status === chip.id ? 'bg-brand-50 text-brand-600' : 'border border-line bg-card text-ink-muted hover:bg-page',
                )}
              >
                {chip.label}
              </button>
            ))}
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
            icon={ShoppingBag}
            title={filtered ? t('purchases.noMatch', 'No purchases match that') : t('purchases.emptyTitle', 'No purchases yet')}
            description={
              filtered
                ? t('purchases.noMatchBody', 'Try another supplier, date or word.')
                : t('purchases.emptyBody', 'Record a delivery from a supplier and your stock updates by itself.')
            }
            primaryAction={
              !filtered && can('stock.create') ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  {t('purchases.new', 'New purchase')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-page text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  <tr>
                    <th className="px-4 py-2.5">{t('purchases.date', 'Purchase date')}</th>
                    <th className="px-4 py-2.5">{t('purchases.number', 'Number')}</th>
                    <th className="px-4 py-2.5">{t('purchases.supplier', 'Supplier')}</th>
                    <th className="px-4 py-2.5 text-right">{t('purchases.items', 'Products')}</th>
                    <th className="px-4 py-2.5 text-right">{t('purchases.total', 'Total')}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer border-t border-line transition-colors hover:bg-page">
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{day(row.purchased_on)}</td>
                      <td className="px-4 py-3 font-bold text-ink">{row.number}</td>
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-ink">{row.supplier_name}</span>
                        {row.supplier_invoice_no ? <span className="text-[11px] text-ink-muted">{row.supplier_invoice_no}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-ink-muted">{row.items_count}</td>
                      <td className={cn('px-4 py-3 text-right font-bold text-ink', row.is_voided && 'line-through opacity-60')}>{formatCents(row.total_cents, currency)}</td>
                      <td className="px-4 py-3 text-right">
                        {row.is_voided ? <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', TONE_ROSE)}>{t('purchases.statusCancelled', 'Cancelled')}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta && meta.last_page > 1 ? (
              <Pagination
                page={meta.current_page}
                pageCount={meta.last_page}
                onPageChange={setPage}
                summary={`${t('common.showing', 'Showing')} ${(meta.current_page - 1) * meta.per_page + 1}-${(meta.current_page - 1) * meta.per_page + rows.length} ${t('common.of', 'of')} ${meta.total}`}
              />
            ) : null}
          </>
        )}
      </div>

      <PurchaseModal open={creating} onClose={() => setCreating(false)} currency={currency} />

      <Drawer open={openId !== null} onClose={() => setOpenId(null)} side="right" width="w-full max-w-[520px]">
        <div className="flex h-full flex-col bg-card">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-ink">{purchase?.number ?? t('nav.purchases', 'Purchases')}</h2>
              {purchase ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {day(purchase.purchased_on)} · {purchase.supplier_name}
                </p>
              ) : null}
            </div>
            <button type="button" aria-label={t('common.close', 'Close')} onClick={() => setOpenId(null)} className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-page hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {detail.isPending || !purchase ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                {purchase.is_voided ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-900">
                    <p className="font-bold">{t('purchases.statusCancelled', 'Cancelled')}</p>
                    {purchase.void_reason ? <p className="mt-0.5">{purchase.void_reason}</p> : null}
                  </div>
                ) : null}

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-ink-muted">{t('purchases.supplier', 'Supplier')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{purchase.supplier_name}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t('purchases.invoiceNoShort', 'Supplier invoice no.')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{purchase.supplier_invoice_no ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t('purchases.recordedBy', 'Recorded by')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{purchase.created_by_name ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">{t('purchases.recordedOn', 'Recorded on')}</dt>
                    <dd className="mt-0.5 font-semibold text-ink">{purchase.created_at ? new Date(purchase.created_at).toLocaleString(intlLocale()) : '—'}</dd>
                  </div>
                </dl>

                <div className="overflow-hidden rounded-2xl border border-line">
                  <div className="flex bg-page px-3 py-2 text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                    <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
                    <span className="w-12 text-right">{t('purchases.qtyShort', 'Qty')}</span>
                    <span className="w-20 text-right">{t('purchases.rateShort', 'Rate')}</span>
                    <span className="w-24 text-right">{t('purchases.lineTotal', 'Total')}</span>
                  </div>
                  {(purchase.lines ?? []).map((line) => (
                    <div key={line.id} className="flex items-center border-t border-line px-3 py-2.5 text-xs">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{line.article}</span>
                      <span className="w-12 text-right text-ink">{line.quantity}</span>
                      <span className="w-20 text-right text-ink-muted">{formatCents(line.unit_cost, currency)}</span>
                      <span className="w-24 text-right font-bold text-ink">{formatCents(line.total_cents, currency)}</span>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between border-t border-line bg-page px-3 py-3">
                    <span className="text-xs font-bold tracking-[0.06em] text-ink-muted uppercase">{t('purchases.total', 'Total')}</span>
                    <span className="text-lg font-extrabold text-ink">{formatCents(purchase.total_cents, currency)}</span>
                  </div>
                </div>

                {purchase.notes ? (
                  <div>
                    <p className="text-xs font-semibold text-ink-muted">{t('purchases.notesTitle', 'Notes')}</p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{purchase.notes}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {purchase && !purchase.is_voided && can('stock.void') ? (
            <div className="border-t border-line px-5 py-3">
              <Button variant="danger" fullWidth icon={<Ban className="h-4 w-4" />} onClick={() => setCancelling(true)}>
                {t('purchases.cancel', 'Cancel this purchase')}
              </Button>
            </div>
          ) : null}
        </div>
      </Drawer>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        maxWidth="md"
        title={t('purchases.cancelTitle', 'Why is this purchase being cancelled?')}
        subtitle={t('purchases.cancelSubtitle', 'The pieces are taken back out of your stock. If some were already sold, it cannot be cancelled.')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate()}>
              {t('purchases.cancelConfirm', 'Cancel purchase')}
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

export default Purchases
