import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, ReceiptEuro as Receipt, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t, intlLocale } from '../../i18n'
import { cn } from '../../lib/cn'
import { nowLocal, withOffset } from '../../lib/issueDate'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { listAllProducts, listRecargoRates, listTaxRates } from '../../services/catalog'
import { listPaymentMethods } from '../../services/paymentMethods'
import { getSale, invoiceAlbaran, previewSale } from '../../services/sales'
import type { SaleLine } from '../../types/sales'
import { RecargoPicker } from './RecargoPicker'
import { ivaOptions } from './useSaleComposer'

const clientLabel = 'mb-1.5 block text-xs font-semibold text-slate-600'
const clientField =
  'h-10 w-full box-border rounded-xl border border-line bg-card px-3 text-[13px] text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'

type Fill = { client_company: string; client_phone: string; client_nif: string; client_address: string; client_email: string }
const EMPTY_FILL: Fill = { client_company: '', client_phone: '', client_nif: '', client_address: '', client_email: '' }

/**
 * A delivery note becomes an invoice, on a page of its own with the counter's look: the lines are locked (product,
 * quantity and price are what was handed over, and there is nothing to scan), and only IVA per line and recargo can be
 * added. There is no discount to add. The client is not changed: what the delivery note already says is locked, and
 * only the details it lacks can be filled in. No stock moves; the delivery note took it out already.
 */
function AlbaranToInvoice() {
  const { id } = useParams()
  const documentId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const { session } = useAuth()
  const currency = session?.company?.currency ?? 'EUR'
  const company = session?.company

  const sale = useQuery({ queryKey: ['app', 'sale', documentId], queryFn: () => getSale(documentId) })
  const taxRates = useQuery({ queryKey: ['app', 'tax-rates'], queryFn: listTaxRates })
  const recargoRates = useQuery({ queryKey: ['app', 'recargo-rates'], queryFn: listRecargoRates })
  const catalog = useQuery({ queryKey: ['app', 'products', 'pos'], queryFn: listAllProducts })
  const [issuedAt] = useState(nowLocal)
  const preview = useQuery({
    queryKey: ['app', 'sales', 'preview', 'factura', issuedAt.slice(0, 7)],
    queryFn: () => previewSale('factura', withOffset(issuedAt)),
  })

  const document = sale.data
  const lines = useMemo(() => (document?.lines ?? []).filter((line): line is SaleLine & { id: number } => line.id != null), [document])

  const [iva, setIva] = useState<Record<number, string>>({})
  const [recargoId, setRecargoId] = useState<number | null>(null)
  const [fill, setFill] = useState<Fill>(EMPTY_FILL)
  // A paid delivery note paid its own price only: the IVA and recargo on top are paid now or left owed.
  const [payNow, setPayNow] = useState(false)
  const [methodId, setMethodId] = useState('')
  const methods = useQuery({ queryKey: ['app', 'payment-methods', 'active'], queryFn: () => listPaymentMethods('active') })

  // Each line starts on its product's own IVA (or the highest rate in Settings), as the server would pick.
  useEffect(() => {
    if (!document || !catalog.data || !taxRates.data) return
    const fallback = Math.max(21, ...(taxRates.data ?? []).map((rate) => rate.rate))
    setIva((current) => {
      const next = { ...current }
      for (const line of lines) {
        if (next[line.id] !== undefined) continue
        const product = line.product_id === null ? undefined : catalog.data.find((row) => row.id === line.product_id)
        next[line.id] = String(product?.iva_percent ?? fallback)
      }
      return next
    })
  }, [catalog.data, document, lines, taxRates.data])

  // Only a delivery note that can still be invoiced belongs here.
  useEffect(() => {
    if (!document) return
    if (document.type !== 'albaran' || !document.can_invoice) {
      push({ tone: 'danger', title: t('sales.albaranNotInvoiceable', 'This delivery note cannot be invoiced: it is voided or already has an invoice.') })
      navigate(`/app/delivery-notes/${document.id}`, { replace: true })
    }
  }, [document, navigate, push])

  const totals = useMemo(() => {
    // base is what is taxed (after the bill discount, if the delivery note had one); gross is before it.
    let base = 0
    let gross = 0
    let tax = 0
    for (const line of lines) {
      const rate = Number(iva[line.id] ?? 0)
      base += line.base_cents
      gross += line.base_cents + (line.bill_discount_cents ?? 0)
      tax += Math.round((line.base_cents * rate) / 100)
    }
    return { base, gross, tax }
  }, [iva, lines])
  const recargo = (recargoRates.data ?? []).find((rate) => rate.id === recargoId) ?? null
  const recargoCents = recargo ? Math.round((totals.base * recargo.rate) / 100) : 0
  const grandTotal = totals.base + totals.tax + recargoCents
  // What the invoice adds to a delivery note that is already paid: nothing is owed on a note not yet paid.
  const owed = document?.payment_status === 'paid' ? Math.max(0, grandTotal - document.total_cents) : 0

  const create = useMutation({
    mutationFn: () => {
      const chosen: Record<number, number> = {}
      for (const line of lines) chosen[line.id] = Number(iva[line.id] ?? 0)
      const typed = Object.fromEntries(Object.entries(fill).filter(([, value]) => value.trim() !== ''))
      return invoiceAlbaran(documentId, {
        iva: chosen,
        recargo_rate_id: recargoId,
        ...typed,
        ...(owed > 0 && payNow ? { pay_difference: true, payment_method_id: Number(methodId) } : {}),
      })
    },
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: ['app', 'sale', documentId] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'customers'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      push({ tone: 'success', title: t('sales.invoiceFromAlbaranDone', 'Invoice {number} created.', { number: invoice.number }) })
      navigate(`/app/invoices/${invoice.id}`, { state: { print: true } })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  if (sale.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">{getErrorMessage(sale.error)}</div>
    )
  }
  if (!document) return <div className="h-64 animate-pulse rounded-2xl bg-page" />

  const hasTaxId = Boolean(document.client_nif || document.client_nie)
  const fields: { key: keyof Fill | 'name'; label: string; have: string | null; type?: string }[] = [
    { key: 'name', label: t('sales.clientName', 'Name'), have: document.client_name },
    { key: 'client_company', label: t('sales.clientCompany', 'Company'), have: document.client_company ?? null },
    { key: 'client_phone', label: t('sales.phone', 'Telephone'), have: document.client_phone ?? null },
    { key: 'client_nif', label: t('sales.nif', 'NIF / NIE'), have: hasTaxId ? (document.client_nif || document.client_nie || null) : null },
    { key: 'client_address', label: t('sales.address', 'Address'), have: document.client_address ?? null },
    { key: 'client_email', label: t('sales.email', 'Email'), have: document.client_email ?? null, type: 'email' },
  ]
  const todayLabel = new Date(issuedAt).toLocaleDateString(intlLocale())

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-brand-on shadow-xs">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{t('sales.invoiceFromAlbaranTitle', 'Convert to invoice')}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('sales.convertPageHint', 'Delivery note :number. Add IVA and recargo; the lines and the client are not changed. Stock does not move: the delivery note already took it out.').replace(':number', document.number)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('sales.stockUntouched', 'Stock is not touched')}
        </span>
      </div>

      <div className="flex flex-col gap-8 rounded-3xl border border-line bg-card p-4 shadow-md sm:p-8 lg:p-10">
        <div className="grid gap-6 border-b border-slate-100 pb-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{company?.name ?? '—'}</h2>
            {company?.email ? <p className="mt-0.5 truncate text-xs text-slate-500">{company.email}</p> : null}
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line/80 bg-page p-4 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-slate-600">{t('sales.document', 'Document')}</span>
              <span className="block rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-bold text-brand-on">{t('sales.typeFactura', 'Invoice')}</span>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-slate-600">{t('sales.number', 'Number')}</span>
              <span className="block rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-bold text-ink">{preview.data?.number ?? '—'}</span>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-slate-600">{t('sales.issuedAt', 'Date and time')}</span>
              <span className="block rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs text-ink">{todayLabel}</span>
            </div>
            <p className="text-[11px] text-ink-muted sm:col-span-3">
              {document.payment_status === 'paid'
                ? t('sales.convertKeepsPaid', 'The delivery note is paid, so the invoice is created as paid once any IVA or recargo on top is paid too.')
                : t('sales.convertKeepsPending', 'The delivery note is pending, so the invoice is created as pending.')}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-page p-5">
          <h3 className="flex items-center gap-2.5 text-sm font-bold tracking-[0.06em] text-slate-800 uppercase">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <UserRound className="h-4 w-4" />
            </span>
            {t('sales.clientHeading', 'Client')}
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            {fields.map((field) => {
              const locked = Boolean(field.have)
              return (
                <div key={field.key}>
                  <span className={clientLabel}>{field.label}</span>
                  <span className="relative block">
                    <input
                      type={field.type ?? 'text'}
                      readOnly={locked}
                      tabIndex={locked ? -1 : 0}
                      aria-label={field.label}
                      value={locked ? (field.have ?? '') : field.key === 'name' ? '' : fill[field.key as keyof Fill]}
                      onChange={(event) => setFill((current) => ({ ...current, [field.key]: event.target.value }))}
                      maxLength={field.key === 'client_address' ? 255 : 180}
                      className={cn(clientField, locked && 'cursor-not-allowed bg-slate-100 pr-9 text-slate-600')}
                    />
                    {locked ? <Lock className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /> : null}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-ink-muted">
            {t('sales.convertClientHint', 'Locked details are the delivery note’s and cannot be changed. You can fill in the ones it lacks; they are kept on the invoice and on the saved client.')}
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line">
          <div className="min-w-[640px]">
            <div className="flex items-center bg-page px-3 py-2.5 text-[10.5px] font-bold tracking-[0.06em] text-slate-500 uppercase">
              <span className="w-10 text-center">#</span>
              <span className="min-w-0 flex-1 px-2">{t('sales.article', 'Article')}</span>
              <span className="w-20 text-center">{t('sales.quantity', 'Qty')}</span>
              <span className="w-28 text-right">{t('sales.price', 'Price')}</span>
              <span className="w-40 px-3">{t('sales.iva', '% IVA')}</span>
              <span className="w-28 text-right">{t('sales.amount', 'Amount')}</span>
            </div>
            {lines.map((line, index) => (
              <div key={line.id} className="flex items-center border-t border-slate-100 px-3 py-2.5">
                <span className="w-10 text-center text-xs text-slate-400">{index + 1}</span>
                <span className="min-w-0 flex-1 px-2">
                  <span className="block truncate text-xs font-bold text-slate-900">{line.article}</span>
                  {line.barcode ? <span className="block truncate text-[11px] tabular-nums text-slate-500">{line.barcode}</span> : null}
                </span>
                <span className="w-20 text-center text-xs font-semibold text-slate-700">{line.quantity}</span>
                <span className="w-28 text-right text-xs text-slate-700">
                  {formatCents(line.unit_price, currency)}
                  {line.discount_percent > 0 ? <span className="block text-[10px] text-slate-400">−{line.discount_percent}%</span> : null}
                </span>
                <span className="w-40 px-3">
                  <Select
                    compact
                    aria-label={`${t('sales.iva', '% IVA')} ${line.article}`}
                    value={iva[line.id] ?? ''}
                    onChange={(event) => setIva((current) => ({ ...current, [line.id]: event.target.value }))}
                  >
                    {ivaOptions(taxRates.data ?? [], iva[line.id] ?? '').map((option) => (
                      <option key={option} value={option}>
                        {option}%
                      </option>
                    ))}
                  </Select>
                </span>
                <span className="w-28 text-right text-xs font-bold text-slate-900">{formatCents(line.base_cents + (line.bill_discount_cents ?? 0), currency)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-auto flex w-full max-w-sm flex-col gap-2 text-sm">
          <span className="flex justify-between text-slate-600">
            <span>{t('sales.subtotal', 'Subtotal')}</span>
            <span className="font-semibold text-slate-900">{formatCents(totals.gross, currency)}</span>
          </span>
          {/* The discount the delivery note was made with: carried over, not something to add here. */}
          {document.discount_cents > 0 ? (
            <span className="flex justify-between text-slate-600">
              <span>
                {t('sales.discount', 'Discount')}
                {document.discount_type === 'percent' ? ` (${document.discount_value}%)` : ''}
              </span>
              <span className="font-semibold text-slate-900">−{formatCents(document.discount_cents, currency)}</span>
            </span>
          ) : null}
          <span className="flex justify-between text-slate-600">
            <span>IVA</span>
            <span className="font-semibold text-slate-900">{formatCents(totals.tax, currency)}</span>
          </span>
          <RecargoPicker
            rates={recargoRates.data ?? []}
            loading={recargoRates.isPending}
            selectedId={recargoId}
            onSelect={setRecargoId}
            amountCents={recargoCents}
            currency={currency}
          />
          <span className="mt-1 flex items-baseline justify-between border-t-2 border-slate-200 pt-3">
            <span className="text-sm font-black text-slate-900">{t('sales.grandTotal', 'Total')}</span>
            <span className="text-2xl font-black text-brand-500">{formatCents(grandTotal, currency)}</span>
          </span>
          {owed > 0 ? (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 app-dark:border-amber-500/30 app-dark:bg-amber-500/10">
              <p className="text-xs font-semibold text-amber-900 app-dark:text-amber-200">
                {t('sales.differenceTitle', 'Still to pay: :amount (the IVA and recargo on top of what the delivery note already paid)').replace(':amount', formatCents(owed, currency))}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {([false, true] as const).map((now) => (
                  <button
                    key={String(now)}
                    type="button"
                    onClick={() => setPayNow(now)}
                    className={cn(
                      'cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold',
                      payNow === now ? 'bg-brand-600 text-brand-on' : 'border border-line bg-card text-ink',
                    )}
                  >
                    {now ? t('sales.payDifferenceNow', 'Pay it now') : t('sales.leaveDifference', 'Leave it unpaid')}
                  </button>
                ))}
              </div>
              {payNow ? (
                <Select compact aria-label={t('sales.paymentMethod', 'Payment method')} value={methodId} onChange={(event) => setMethodId(event.target.value)}>
                  <option value="">{t('sales.pickMethod', 'Pick how it was paid')}</option>
                  {(methods.data ?? []).map((method) => (
                    <option key={method.id} value={String(method.id)}>
                      {method.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <p className="text-[11px] text-amber-900/80 app-dark:text-amber-200/80">
                  {t('sales.leaveDifferenceHint', 'The invoice stays pending until you record this payment on it.')}
                </p>
              )}
            </div>
          ) : null}
          <button
            type="button"
            disabled={create.isPending || lines.length === 0 || (owed > 0 && payNow && methodId === '')}
            onClick={() => create.mutate()}
            className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-brand-on shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {create.isPending ? t('sales.issuing', 'Issuing...') : t('sales.invoiceFromAlbaranConfirm', 'Create invoice')}
          </button>
          <Link to={`/app/delivery-notes/${document.id}`} className="text-center text-xs font-semibold text-slate-500 hover:text-slate-700">
            {t('common.cancel', 'Cancel')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AlbaranToInvoice
