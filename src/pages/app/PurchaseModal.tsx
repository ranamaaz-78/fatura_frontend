import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageSearch, ScanLine, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { onlyDecimal, onlyDigits } from '../../lib/numberInput'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { listAllProducts } from '../../services/catalog'
import { createPurchase } from '../../services/purchases'
import { listSuppliers } from '../../services/suppliers'
import type { Product } from '../../types/catalog'
import { productRank } from './useSaleComposer'

type Line = {
  key: string
  product_id: number
  article: string
  barcode: string
  /** Typed as text, so a half-typed number is never lost. */
  quantity: string
  rate: string
  stock: number
}

function today(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink'

/**
 * Records one delivery from a supplier: who it came from, when, and for each product how many and at what rate.
 * Saving adds the pieces to the stock and makes the rate the product's buying price (the server does both).
 */
export function PurchaseModal({ open, onClose, currency }: { open: boolean; onClose: () => void; currency: string }) {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(today)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const suppliers = useQuery({ queryKey: ['app', 'suppliers', 'purchase-form'], queryFn: () => listSuppliers(undefined, 'active'), enabled: open })
  const catalog = useQuery({ queryKey: ['app', 'products', 'purchase-form'], queryFn: listAllProducts, enabled: open })

  // A clean form every time it is opened.
  useEffect(() => {
    if (!open) return
    setSupplierId('')
    setDate(today())
    setInvoiceNo('')
    setNotes('')
    setSearch('')
    setLines([])
    setErrors({})
  }, [open])

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (needle === '') return []
    return (catalog.data ?? [])
      .map((product) => ({ product, rank: productRank(product, needle) }))
      .filter((row) => row.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.product.article.localeCompare(b.product.article))
      .slice(0, 6)
      .map((row) => row.product)
  }, [catalog.data, search])

  function add(product: Product) {
    setLines((current) => {
      const existing = current.find((line) => line.product_id === product.id)
      if (existing) {
        return current.map((line) => (line.key === existing.key ? { ...line, quantity: String((Number(line.quantity) || 0) + 1) } : line))
      }
      return [
        ...current,
        {
          key: crypto.randomUUID(),
          product_id: product.id,
          article: product.article,
          barcode: product.barcode,
          quantity: '1',
          // The price it is bought at now; the real rate of this delivery is typed over it.
          rate: centsToInput(product.buying_price),
          stock: product.quantity,
        },
      ]
    })
    setSearch('')
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || matches.length === 0) return
    event.preventDefault()
    add(matches[0]!)
  }

  function change(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const amounts = lines.map((line) => {
    const quantity = Number(line.quantity) || 0
    const unit = parseAmountToCents(line.rate)
    return { quantity, unit, total: unit === null ? 0 : quantity * unit }
  })
  const grandTotal = amounts.reduce((sum, row) => sum + row.total, 0)
  const pieces = amounts.reduce((sum, row) => sum + row.quantity, 0)
  const ready =
    supplierId !== '' && date !== '' && lines.length > 0 && amounts.every((row) => row.quantity >= 1 && row.unit !== null && row.unit >= 0)

  const save = useMutation({
    mutationFn: () =>
      createPurchase({
        supplier_id: Number(supplierId),
        purchased_on: date,
        supplier_invoice_no: invoiceNo.trim() || null,
        notes: notes.trim() || null,
        lines: lines.map((line, index) => ({
          product_id: line.product_id,
          quantity: amounts[index]!.quantity,
          unit_cost: amounts[index]!.unit ?? 0,
        })),
      }),
    onSuccess: () => {
      onClose()
      push({ tone: 'success', title: t('purchases.saved', 'Purchase saved. The stock was updated.') })
      void queryClient.invalidateQueries({ queryKey: ['app', 'purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
    },
    onError: (error) => {
      const mapped = mapValidationErrors(error)
      setErrors(mapped)
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="4xl"
      title={t('purchases.newTitle', 'New purchase')}
      subtitle={t('purchases.newSubtitle', 'One delivery from one supplier: the products, how many came in and what each cost.')}
      footer={
        <>
          <span className="mr-auto text-xs text-ink-muted">
            {lines.length > 0 ? `${lines.length} ${t('purchases.products', 'products')} · ${pieces} ${t('purchases.pieces', 'pieces')}` : ''}
          </span>
          <span className="text-sm text-ink-muted">{t('purchases.total', 'Total')}</span>
          <span className="text-xl font-extrabold text-ink">{formatCents(grandTotal, currency)}</span>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button loading={save.isPending} disabled={!ready} onClick={() => save.mutate()}>
            {t('purchases.save', 'Save purchase')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className={labelClass}>
              {t('purchases.supplier', 'Supplier')}
              <span className="ml-0.5 text-rose-500">*</span>
            </span>
            <SearchableSelect
              compact
              aria-label={t('purchases.supplier', 'Supplier')}
              value={supplierId}
              error={Boolean(errors.supplier_id)}
              onChange={(event) => setSupplierId(event.target.value)}
              options={[
                { value: '', label: t('purchases.pickSupplier', 'Choose a supplier') },
                ...(suppliers.data ?? []).map((supplier) => ({
                  value: String(supplier.id),
                  label: supplier.name,
                  keywords: `${supplier.company_name ?? ''} ${supplier.code}`,
                })),
              ]}
            />
            {errors.supplier_id ? <p className="mt-1 text-xs text-rose-600">{errors.supplier_id}</p> : null}
          </div>
          <Input
            compact
            type="date"
            max={today()}
            label={t('purchases.date', 'Purchase date')}
            value={date}
            error={errors.purchased_on}
            onChange={(event) => setDate(event.target.value)}
          />
          <Input
            compact
            label={t('purchases.invoiceNo', 'Supplier invoice no. (optional)')}
            maxLength={60}
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
          />
        </div>

        <div className="relative">
          <span className={labelClass}>{t('purchases.addProduct', 'Add a product: type its name or scan its barcode')}</span>
          <span className="relative block">
            <ScanLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKey}
              autoComplete="off"
              placeholder={t('sales.productPlaceholder', 'Name or barcode')}
              className="h-10 w-full rounded-xl border border-line bg-card pr-3 pl-9 text-[13px] text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
          </span>
          {search.trim() !== '' ? (
            <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
              {catalog.isPending ? (
                <p className="px-4 py-3 text-xs text-ink-muted">{t('sales.phoneSearching', 'Searching…')}</p>
              ) : matches.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-3 text-xs text-ink-muted">
                  <PackageSearch className="h-4 w-4" />
                  {t('sales.noProduct', 'No product matches that.')}
                </p>
              ) : (
                matches.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => add(product)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-4 border-b border-line px-3.5 py-2.5 text-left last:border-0 hover:bg-page',
                      index === 0 && 'bg-brand-50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{product.article}</span>
                      <span className="text-[11px] text-ink-muted">{product.barcode}</span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-ink-muted">
                      {t('purchases.inStock', 'In stock')} {product.quantity}
                      <span className="block font-semibold text-ink">{formatCents(product.buying_price, currency)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line">
          <div className="min-w-[640px]">
            <div className="flex items-center bg-page px-3 py-2.5 text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
              <span className="min-w-0 flex-1 px-2">{t('sales.article', 'Article')}</span>
              <span className="w-24 shrink-0 px-1 text-right">{t('purchases.quantity', 'Quantity')}</span>
              <span className="w-32 shrink-0 px-1 text-right">{t('purchases.rate', 'Rate (each)')}</span>
              <span className="w-28 shrink-0 px-2 text-right">{t('purchases.lineTotal', 'Total')}</span>
              <span className="w-10 shrink-0" />
            </div>
            {lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-ink-muted">{t('purchases.noLines', 'Search a product above to add the first line.')}</p>
            ) : (
              lines.map((line, index) => (
                <div key={line.key} className="flex items-center border-t border-line px-3 py-2">
                  <span className="min-w-0 flex-1 px-2">
                    <span className="block truncate text-xs font-bold text-ink">{line.article}</span>
                    <span className="text-[11px] text-ink-muted">
                      {t('purchases.inStock', 'In stock')} {line.stock}
                      {Number(line.quantity) > 0 ? ` → ${line.stock + Number(line.quantity)}` : ''}
                    </span>
                  </span>
                  <span className="w-24 shrink-0 px-1">
                    <input
                      aria-label={`${t('purchases.quantity', 'Quantity')} ${line.article}`}
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) => change(line.key, { quantity: onlyDigits(event.target.value) })}
                      className="h-9 w-full rounded-lg border border-line bg-card px-2 text-right text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                  </span>
                  <span className="w-32 shrink-0 px-1">
                    <input
                      aria-label={`${t('purchases.rate', 'Rate (each)')} ${line.article}`}
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(event) => change(line.key, { rate: onlyDecimal(event.target.value) })}
                      className={cn(
                        'h-9 w-full rounded-lg border bg-card px-2 text-right text-xs font-bold text-ink outline-none focus:border-brand-600',
                        amounts[index]!.unit === null ? 'border-amber-400 bg-amber-50' : 'border-line',
                      )}
                    />
                  </span>
                  <span className="w-28 shrink-0 px-2 text-right text-sm font-bold text-ink">{formatCents(amounts[index]!.total, currency)}</span>
                  <button
                    type="button"
                    title={t('common.delete', 'Delete')}
                    aria-label={`${t('common.delete', 'Delete')} ${line.article}`}
                    onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                    className="flex w-10 shrink-0 cursor-pointer justify-center text-ink-muted hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        {errors.lines ? <p className="-mt-3 text-xs text-rose-600">{errors.lines}</p> : null}

        <Textarea compact rows={2} maxLength={2000} label={t('purchases.notes', 'Notes (optional)')} value={notes} onChange={(event) => setNotes(event.target.value)} />

        <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs text-ink">
          {t('purchases.hint', 'Saving adds the quantities to your stock and makes each rate the product’s buying price.')}
        </p>
      </div>
    </Modal>
  )
}
