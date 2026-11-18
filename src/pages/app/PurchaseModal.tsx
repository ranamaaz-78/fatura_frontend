import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Minus, PackageSearch, Plus, ScanLine, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { QuantityField } from '../../components/ui/QuantityField'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { onlyDecimal } from '../../lib/numberInput'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { listAllProducts } from '../../services/catalog'
import { createPurchase, updatePurchase } from '../../services/purchases'
import { listSuppliers } from '../../services/suppliers'
import type { Product } from '../../types/catalog'
import type { Purchase } from '../../types/purchases'
import { useResultNav } from '../../lib/useResultNav'
import { productRank } from './useSaleComposer'

type IvaMode = 'none' | 'excluded' | 'included'

const IVA_MODES: { id: IvaMode; label: () => string }[] = [
  { id: 'none', label: () => t('purchases.ivaNone', 'No IVA') },
  { id: 'excluded', label: () => t('purchases.ivaExcludedShort', 'IVA excluded') },
  { id: 'included', label: () => t('purchases.ivaIncludedShort', 'IVA included') },
]

type Line = {
  key: string
  product_id: number
  article: string
  barcode: string
  /** Typed as text, so a half-typed number is never lost. */
  quantity: string
  rate: string
  /** The selling price, typed as text; it starts as the product's own and goes with the delivery only if it was changed. */
  sell: string
  /** What the product costs and sells for now (cents): what the new prices are compared with. */
  buyNow: number
  sellNow: number
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
export function PurchaseModal({ open, onClose, currency, purchase = null }: { open: boolean; onClose: () => void; currency: string; purchase?: Purchase | null }) {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(today)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [notes, setNotes] = useState('')
  // IVA on the whole purchase: none, excluded (added on top of the typed prices) or included (already in them).
  const [ivaMode, setIvaMode] = useState<IvaMode>('none')
  const [ivaPercent, setIvaPercent] = useState('21')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Changing a purchase: whether its saved lines were put in the form yet.
  const [filled, setFilled] = useState(false)

  const suppliers = useQuery({ queryKey: ['app', 'suppliers', 'purchase-form'], queryFn: () => listSuppliers(undefined, 'active'), enabled: open })
  const catalog = useQuery({ queryKey: ['app', 'products', 'purchase-form'], queryFn: listAllProducts, enabled: open })

  // A clean form every time it is opened.
  useEffect(() => {
    if (!open) return
    setSupplierId('')
    setDate(today())
    setInvoiceNo('')
    setNotes('')
    setIvaMode('none')
    setIvaPercent('21')
    setSearch('')
    setLines([])
    setErrors({})
    setFilled(false)
    if (purchase) {
      // Changing a purchase: the form starts as it was saved.
      setSupplierId(purchase.supplier_id === null ? '' : String(purchase.supplier_id))
      setDate(purchase.purchased_on)
      setInvoiceNo(purchase.supplier_invoice_no ?? '')
      setNotes(purchase.notes ?? '')
      setIvaMode(purchase.iva_mode ?? 'none')
      setIvaPercent(purchase.iva_mode && purchase.iva_mode !== 'none' ? String(purchase.iva_percent ?? 21) : '21')
    }
  }, [open, purchase])

  // Its lines are filled in once the catalog is there (each product's stock, barcode and prices come from it).
  useEffect(() => {
    if (!open || !purchase || filled || !catalog.data) return
    const held = new Map<number, number>()
    for (const line of purchase.lines ?? []) {
      if (line.product_id !== null) held.set(line.product_id, (held.get(line.product_id) ?? 0) + line.quantity)
    }
    const rows: Line[] = []
    for (const line of purchase.lines ?? []) {
      const product = catalog.data.find((item) => item.id === line.product_id)
      if (!product) continue
      rows.push({
        key: crypto.randomUUID(),
        product_id: product.id,
        article: product.article,
        barcode: product.barcode,
        quantity: String(line.quantity),
        rate: centsToInput(line.unit_cost),
        sell: centsToInput(product.selling_price),
        buyNow: product.buying_price,
        sellNow: product.selling_price,
        // The stock before this purchase: what it put in is added again by the quantity typed.
        stock: product.quantity - (held.get(product.id) ?? 0),
      })
    }
    setLines(rows)
    setFilled(true)
  }, [open, purchase, filled, catalog.data])

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (needle === '') return []
    return (catalog.data ?? [])
      .map((product) => ({ product, rank: productRank(product, needle) }))
      .filter((row) => row.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.product.article.localeCompare(b.product.article))
      .slice(0, 40)
      .map((row) => row.product)
  }, [catalog.data, search])

  // Up and Down walk the results; Enter takes the highlighted one.
  const nav = useResultNav(matches.length, search)

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
          sell: centsToInput(product.selling_price),
          buyNow: product.buying_price,
          sellNow: product.selling_price,
          stock: product.quantity,
        },
      ]
    })
    setSearch('')
  }

  function onSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (nav.onNavKey(event)) return
    if (event.key !== 'Enter' || matches.length === 0) return
    event.preventDefault()
    add(matches[nav.active] ?? matches[0]!)
  }

  function change(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const amounts = lines.map((line) => {
    const quantity = Number(line.quantity) || 0
    const unit = parseAmountToCents(line.rate)
    return { quantity, unit, total: unit === null ? 0 : quantity * unit }
  })
  const sells = lines.map((line) => parseAmountToCents(line.sell))
  // The buying price against the one the product has now, and the selling price that keeps the same margin.
  const costs = lines.map((line, index) => {
    const unit = amounts[index]!.unit
    if (unit === null || line.buyNow <= 0 || unit === line.buyNow) return null
    const percent = Math.round(((unit - line.buyNow) / line.buyNow) * 1000) / 10
    return { percent, keepMargin: Math.round((line.sellNow * unit) / line.buyNow) }
  })
  /** Lines whose cost went up and whose selling price is not yet at the margin-keeping price. */
  const raisable = lines.flatMap((_line, index) => (costs[index] && costs[index]!.percent > 0 && sells[index] !== costs[index]!.keepMargin ? [index] : []))
  function raiseAll() {
    setLines((current) =>
      current.map((line, index) => (raisable.includes(index) ? { ...line, sell: centsToInput(costs[index]!.keepMargin) } : line)),
    )
  }
  const typedTotal = amounts.reduce((sum, row) => sum + row.total, 0)
  // The same sums the server makes: excluded adds the IVA on top, included takes it out of the total.
  const percent = Math.min(100, Math.max(0, Number(ivaPercent.replace(',', '.')) || 0))
  const activeMode: IvaMode = percent > 0 ? ivaMode : 'none'
  const ivaCents = activeMode === 'excluded' ? Math.round((typedTotal * percent) / 100) : activeMode === 'included' ? typedTotal - Math.round(typedTotal / (1 + percent / 100)) : 0
  const baseCents = activeMode === 'included' ? typedTotal - ivaCents : typedTotal
  const grandTotal = activeMode === 'excluded' ? typedTotal + ivaCents : typedTotal
  const pieces = amounts.reduce((sum, row) => sum + row.quantity, 0)
  const ready =
    supplierId !== '' && date !== '' && lines.length > 0 && amounts.every((row) => row.quantity >= 1 && row.unit !== null && row.unit >= 0)

  const save = useMutation({
    mutationFn: () =>
      (purchase ? (input: Parameters<typeof updatePurchase>[1]) => updatePurchase(purchase.id, input) : createPurchase)({
        supplier_id: Number(supplierId),
        purchased_on: date,
        supplier_invoice_no: invoiceNo.trim() || null,
        notes: notes.trim() || null,
        iva_mode: activeMode,
        iva_percent: activeMode === 'none' ? undefined : percent,
        lines: lines.map((line, index) => ({
          product_id: line.product_id,
          quantity: amounts[index]!.quantity,
          unit_cost: amounts[index]!.unit ?? 0,
          // Only a selling price the shop changed travels with the delivery; the others stay as the product has them.
          selling_price: sells[index] !== null && sells[index] !== line.sellNow ? (sells[index] as number) : undefined,
        })),
      }),
    onSuccess: () => {
      onClose()
      push({
        tone: 'success',
        title: purchase
          ? t('purchases.updated', 'Purchase updated. The stock and Supplier Payments follow the change.')
          : t('purchases.saved', 'Purchase saved. The stock was updated and it was written down in Supplier Payments.'),
      })
      void queryClient.invalidateQueries({ queryKey: ['app', 'purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'purchase'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'ledger'] })
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
      maxWidth="5xl"
      title={purchase ? t('purchases.editTitle', 'Edit purchase {number}', { number: purchase.number }) : t('purchases.newTitle', 'New purchase')}
      subtitle={
        purchase
          ? t('purchases.editSubtitle', 'Change it while nothing is paid for it. The stock moves by the difference and its entry in Supplier Payments follows.')
          : t('purchases.newSubtitle', 'One delivery from one supplier: the products, how many came in and what each cost.')
      }
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
            {purchase ? t('purchases.saveChanges', 'Save changes') : t('purchases.save', 'Save purchase')}
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
            <div className="absolute top-full right-0 left-0 z-20 mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line bg-card shadow-lg">
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
                    data-nav-active={index === nav.active}
                    onMouseEnter={() => nav.setActive(index)}
                    onClick={() => add(product)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-4 border-b border-line px-3.5 py-2.5 text-left last:border-0 hover:bg-page',
                      index === nav.active && 'bg-brand-50',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{product.article}</span>
                      <span className="text-[11px] text-ink-muted">{[product.short_code, product.barcode].filter(Boolean).join(' · ')}</span>
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
          <div className="min-w-[900px]">
            <div className="flex items-center bg-page px-3 py-2.5 text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
              <span className="min-w-0 flex-1 px-2">{t('sales.article', 'Article')}</span>
              <span className="w-24 shrink-0 px-1 text-center">{t('purchases.stockHead', 'Stock')}</span>
              <span className="w-32 shrink-0 px-1 text-right">{t('purchases.quantity', 'Quantity')}</span>
              <span className="w-32 shrink-0 px-1 text-right">{t('purchases.rate', 'Buying price')}</span>
              <span className="w-36 shrink-0 px-1 text-right">{t('purchases.sellingPrice', 'Selling price')}</span>
              <span className="w-28 shrink-0 px-2 text-right">{t('purchases.lineTotal', 'Total')}</span>
              <span className="w-10 shrink-0" />
            </div>
            {raisable.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-brand-50 px-4 py-2">
                <span className="text-xs text-ink">{t('purchases.costsUp', 'The cost went up on {count} products.', { count: raisable.length })}</span>
                <button
                  type="button"
                  onClick={raiseAll}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-brand-on transition hover:bg-brand-500"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('purchases.raiseAll', 'Raise all selling prices (keep the margin)')}
                </button>
              </div>
            ) : null}
            {lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-ink-muted">{t('purchases.noLines', 'Search a product above to add the first line.')}</p>
            ) : (
              lines.map((line, index) => (
                <div key={line.key} className="flex items-center border-t border-line px-3 py-2">
                  <span className="min-w-0 flex-1 px-2">
                    <span className="block truncate text-xs font-bold text-ink">{line.article}</span>
                    {line.barcode ? <span className="block truncate text-[11px] tabular-nums text-ink-muted">{line.barcode}</span> : null}
                  </span>
                  <span className="w-24 shrink-0 px-1 text-center text-xs tabular-nums text-ink-muted">
                    {line.stock}
                    {Number(line.quantity) > 0 ? (
                      <span className="font-bold text-emerald-700"> → {line.stock + Number(line.quantity)}</span>
                    ) : null}
                  </span>
                  <span className="flex w-32 shrink-0 justify-end px-1">
                    <span className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-line bg-card focus-within:border-brand-600">
                      <button
                        type="button"
                        aria-label="−"
                        disabled={(Number(line.quantity) || 1) <= 1}
                        onClick={() => change(line.key, { quantity: String(Math.max(1, (Number(line.quantity) || 1) - 1)) })}
                        className="flex h-9 w-8 cursor-pointer items-center justify-center text-ink-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <QuantityField
                        label={`${t('purchases.quantity', 'Quantity')} ${line.article}`}
                        value={Number(line.quantity) || 1}
                        max={9999999}
                        onChange={(next) => change(line.key, { quantity: String(next) })}
                        className="h-9 w-12 bg-transparent text-center text-xs font-bold text-ink outline-none"
                      />
                      <button
                        type="button"
                        aria-label="+"
                        onClick={() => change(line.key, { quantity: String((Number(line.quantity) || 0) + 1) })}
                        className="flex h-9 w-8 cursor-pointer items-center justify-center text-ink-muted hover:text-ink"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </span>
                  <span className="w-32 shrink-0 px-1">
                    <input
                      aria-label={`${t('purchases.rate', 'Buying price')} ${line.article}`}
                      inputMode="decimal"
                      value={line.rate}
                      onChange={(event) => change(line.key, { rate: onlyDecimal(event.target.value) })}
                      className={cn(
                        'h-9 w-full rounded-lg border bg-card px-2 text-right text-xs font-bold text-ink outline-none focus:border-brand-600',
                        amounts[index]!.unit === null ? 'border-amber-400 bg-amber-50' : 'border-line',
                      )}
                    />
                    {costs[index] ? (
                      <span
                        className={cn(
                          'mt-1 ml-auto flex w-fit items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold',
                          costs[index]!.percent > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
                        )}
                        title={t('purchases.costVsNow', 'Compared with the buying price it has now ({price})', { price: formatCents(line.buyNow, currency) })}
                      >
                        {costs[index]!.percent > 0 ? '▲' : '▼'} {Math.abs(costs[index]!.percent)}%
                      </span>
                    ) : null}
                  </span>
                  <span className="w-36 shrink-0 px-1">
                    <input
                      aria-label={`${t('purchases.sellingPrice', 'Selling price')} ${line.article}`}
                      inputMode="decimal"
                      value={line.sell}
                      onChange={(event) => change(line.key, { sell: onlyDecimal(event.target.value) })}
                      className={cn(
                        'h-9 w-full rounded-lg border bg-card px-2 text-right text-xs font-bold text-ink outline-none focus:border-brand-600',
                        sells[index] === null ? 'border-amber-400 bg-amber-50' : sells[index] !== line.sellNow ? 'border-brand-600 bg-brand-50' : 'border-line',
                      )}
                    />
                    {/* The cost went up: one click puts the selling price where the margin stays the same. */}
                    {costs[index] && costs[index]!.percent > 0 ? (
                      sells[index] === costs[index]!.keepMargin ? (
                        <span className="mt-1 ml-auto flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                          <Check className="h-3 w-3" />
                          {t('purchases.marginKept', 'Margin kept')}
                        </span>
                      ) : (
                        <button
                          type="button"
                          title={t('purchases.raiseHint', 'Raises the selling price by the same {percent}% as the cost, so your margin stays the same.', { percent: costs[index]!.percent })}
                          onClick={() => change(line.key, { sell: centsToInput(costs[index]!.keepMargin) })}
                          className="mt-1 ml-auto flex w-fit cursor-pointer items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10.5px] font-bold text-brand-on transition hover:bg-brand-500"
                        >
                          <TrendingUp className="h-3 w-3" />
                          {t('purchases.raiseTo', 'Raise to {price}', { price: formatCents(costs[index]!.keepMargin, currency) })}
                        </button>
                      )
                    ) : null}
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

        {lines.length > 0 ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-page/60 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">{t('purchases.ivaMode', 'IVA on this purchase')}</span>
              <div className="flex flex-wrap items-center gap-2">
                <div role="radiogroup" className="inline-flex rounded-xl border border-line bg-card p-1">
                  {IVA_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={ivaMode === mode.id}
                      onClick={() => setIvaMode(mode.id)}
                      className={cn(
                        'h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold transition',
                        ivaMode === mode.id ? 'bg-brand-600 text-brand-on shadow-xs' : 'text-ink-muted hover:text-ink',
                      )}
                    >
                      {mode.label()}
                    </button>
                  ))}
                </div>
                {ivaMode !== 'none' ? (
                  <label className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-card pr-3 pl-3 focus-within:border-brand-600">
                    <input
                      aria-label={t('purchases.ivaPercent', 'IVA %')}
                      inputMode="decimal"
                      value={ivaPercent}
                      onChange={(event) => setIvaPercent(onlyDecimal(event.target.value))}
                      className="w-12 bg-transparent text-right text-sm font-bold text-ink outline-none"
                    />
                    <span className="text-sm font-semibold text-ink-muted">%</span>
                  </label>
                ) : null}
              </div>
              {ivaMode === 'excluded' ? <p className="text-[11px] text-ink-muted">{t('purchases.ivaExcludedHint', 'The prices above are before IVA: it is added on top.')}</p> : null}
              {ivaMode === 'included' ? <p className="text-[11px] text-ink-muted">{t('purchases.ivaIncludedHint', 'The prices above already hold the IVA: it is taken out of the total.')}</p> : null}
              {errors.iva_percent ? <p className="text-[11px] text-rose-600">{errors.iva_percent}</p> : null}
            </div>

            <dl className="w-full overflow-hidden rounded-xl border border-line bg-card text-sm sm:w-72">
              <div className="flex justify-between px-4 py-2.5">
                <dt className="text-ink-muted">{activeMode === 'none' ? t('purchases.total', 'Total') : t('purchases.baseAmount', 'Base (before IVA)')}</dt>
                <dd className="font-semibold text-ink">{formatCents(baseCents, currency)}</dd>
              </div>
              {activeMode !== 'none' ? (
                <>
                  <div className="flex justify-between border-t border-line px-4 py-2.5">
                    <dt className="text-ink-muted">
                      {t('purchases.ivaAmount', 'IVA')} {percent}%
                    </dt>
                    <dd className="font-semibold text-ink">{formatCents(ivaCents, currency)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t-2 border-brand-600 bg-brand-50 px-4 py-3">
                    <dt className="font-bold text-ink">{t('purchases.totalWithIva', 'Total to pay')}</dt>
                    <dd className="text-lg font-extrabold text-ink">{formatCents(grandTotal, currency)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
        ) : null}

        <Textarea compact rows={2} maxLength={2000} label={t('purchases.notes', 'Notes (optional)')} value={notes} onChange={(event) => setNotes(event.target.value)} />

        <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs text-ink">
          {t('purchases.hint', 'Saving adds the quantities to your stock and makes each rate the product’s buying price.')}
        </p>
      </div>
    </Modal>
  )
}
