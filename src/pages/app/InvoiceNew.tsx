import { useMutation, useQuery } from '@tanstack/react-query'
import { Camera, Minus, Plus, Receipt, ScanLine, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { centsToInput, formatCents, lineTotals, parseAmountToCents, parseNumber } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { listAllProducts, listTaxRates } from '../../services/catalog'
import { createSale, listActiveCustomers, previewSale } from '../../services/sales'
import type { Product } from '../../types/catalog'
import type { Customer, PaymentStatus, SaleType } from '../../types/sales'

const TYPES: { id: SaleType; label: string }[] = [
  { id: 'factura', label: 'Factura' },
  { id: 'albaran', label: 'Albarán' },
  { id: 'abono', label: 'Abono' },
]

type DraftLine = {
  key: string
  product_id: number | null
  sr_number: string
  article: string
  description: string
  quantity: number
  unitPrice: string
  discount: string
  iva: string
  stock: number | null
}

function ivaOptions(rates: { rate: number }[], current: string): string[] {
  const values = rates.map((rate) => String(rate.rate))
  if (current !== '' && !values.includes(current)) values.unshift(current)
  return values
}

function nowLocal(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? 'F').slice(0, 2)
  return letters.toUpperCase()
}

const field =
  'w-full box-border rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#004ac6]'

const label = 'mb-1 block text-[11px] font-semibold text-slate-600'

const optionOn = 'bg-[#eff4ff]'

function digits(value: string): string {
  return value.replace(/[\s-]+/g, '')
}

function productRank(product: Product, query: string): number {
  const barcode = product.barcode.toLowerCase()
  const sr = (product.sr_number ?? '').toLowerCase()
  const article = product.article.toLowerCase()
  const brand = (product.brand ?? '').toLowerCase()
  if (barcode === query || sr === query) return 0
  if (barcode.startsWith(query) || sr.startsWith(query) || article.startsWith(query)) return 1
  if (article.includes(query) || barcode.includes(query) || sr.includes(query) || brand.includes(query)) return 2
  return 99
}

function InvoiceNew() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'USD'
  const company = session?.company

  const [type, setType] = useState<SaleType>('factura')
  const [issuedAt, setIssuedAt] = useState(nowLocal)
  const [payment, setPayment] = useState<PaymentStatus>('pending')
  const [notes, setNotes] = useState('')

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNif, setClientNif] = useState('')

  const [productQuery, setProductQuery] = useState('')
  const [dropdown, setDropdown] = useState(false)
  const [camera, setCamera] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])

  const preview = useQuery({
    queryKey: ['app', 'sales', 'preview', type],
    queryFn: () => previewSale(type),
  })

  const customers = useQuery({
    queryKey: ['app', 'customers', 'pos'],
    queryFn: listActiveCustomers,
  })

  const catalog = useQuery({
    queryKey: ['app', 'products', 'pos'],
    queryFn: listAllProducts,
  })

  const taxRates = useQuery({
    queryKey: ['app', 'tax-rates'],
    queryFn: listTaxRates,
  })

  const phoneNeedle = digits(clientPhone)
  const phoneMatches = useMemo(() => {
    if (phoneNeedle.length < 3) return []
    return (customers.data ?? [])
      .filter((customer) => digits(customer.phone ?? '').includes(phoneNeedle))
      .sort((a, b) => {
        const rank = (customer: Customer) => {
          const phone = digits(customer.phone ?? '')
          if (phone === phoneNeedle) return 0
          if (phone.startsWith(phoneNeedle)) return 1
          return 2
        }
        return rank(a) - rank(b) || a.name.localeCompare(b.name)
      })
      .slice(0, 8)
  }, [customers.data, phoneNeedle])

  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (query === '') return []
    return (catalog.data ?? [])
      .map((product) => ({ product, rank: productRank(product, query) }))
      .filter((row) => row.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.product.article.localeCompare(b.product.article))
      .slice(0, 8)
      .map((row) => row.product)
  }, [catalog.data, productQuery])

  const totals = useMemo(() => {
    const groups = new Map<number, { base: number; tax: number }>()
    let base = 0
    let tax = 0

    for (const line of lines) {
      const unit = parseAmountToCents(line.unitPrice) ?? 0
      const discount = parseNumber(line.discount) ?? 0
      const iva = parseNumber(line.iva) ?? 0
      const math = lineTotals(line.quantity, unit, discount, iva)
      base += math.base
      tax += math.tax
      const group = groups.get(iva) ?? { base: 0, tax: 0 }
      group.base += math.base
      group.tax += math.tax
      groups.set(iva, group)
    }

    return { base, tax, total: base + tax, groups: [...groups.entries()] }
  }, [lines])

  const issue = useMutation({
    mutationFn: createSale,
    onSuccess: (document) => navigate(`/app/invoices/${document.id}`),
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function pickCustomer(customer: Customer) {
    setCustomerId(customer.id)
    setClientName(customer.name)
    setClientCompany(customer.company_name ?? '')
    setClientPhone(customer.phone ?? '')
    setClientNif(customer.nif || customer.nie || '')
  }

  function onPhoneChange(value: string) {
    setClientPhone(value)
    if (customerId !== null) setCustomerId(null)
  }

  function onPhoneKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || phoneMatches.length === 0) return
    event.preventDefault()
    pickCustomer(phoneMatches[0]!)
  }

  function onProductKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || productMatches.length === 0) return
    event.preventDefault()
    addProduct(productMatches[0]!)
  }

  function clearCustomer() {
    setCustomerId(null)
    setClientName('')
    setClientCompany('')
    setClientPhone('')
    setClientNif('')
  }

  function piecesLeft(productId: number, stock: number): number {
    const used = lines.reduce((sum, line) => (line.product_id === productId ? sum + line.quantity : sum), 0)
    return type === 'abono' ? stock + used : stock - used
  }

  function addProduct(product: Product) {
    const existing = lines.find((line) => line.product_id === product.id)
    if (existing && existing.stock !== null && type !== 'abono' && existing.quantity + 1 > existing.stock) {
      push({
        tone: 'danger',
        title: t('sales.noStock', 'Not enough stock for :article. Only :stock left.')
          .replace(':article', existing.article)
          .replace(':stock', String(existing.stock)),
      })
    } else {
      setLines((current) => {
        const line = current.find((item) => item.product_id === product.id)
        if (!line) {
          return [
            ...current,
            {
              key: crypto.randomUUID(),
              product_id: product.id,
              sr_number: product.sr_number ?? '',
              article: product.article,
              description: product.description ?? '',
              quantity: 1,
              unitPrice: centsToInput(product.selling_price),
              discount: '0',
              iva: String(product.iva_percent),
              stock: product.quantity,
            },
          ]
        }
        const next = line.quantity + 1
        if (line.stock !== null && type !== 'abono' && next > line.stock) return current
        return current.map((item) => (item.key === line.key ? { ...item, quantity: next } : item))
      })
    }
    setProductQuery('')
    setDropdown(false)
    setCamera(false)
  }

  function changeLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function changeQuantity(line: DraftLine, next: number) {
    const capped = line.stock !== null && type !== 'abono' ? Math.min(next, line.stock) : next
    if (capped < 1) return
    changeLine(line.key, { quantity: capped })
  }

  function submit() {
    if (issue.isPending) return
    if (clientName.trim() === '') {
      push({ tone: 'danger', title: t('sales.needClient', 'Enter the client name.') })
      return
    }
    if (lines.length === 0) {
      push({ tone: 'danger', title: t('sales.needLines', 'Add at least one line.') })
      return
    }

    const typedPhone = digits(clientPhone)
    if (customerId === null && typedPhone.length >= 3) {
      const exact = (customers.data ?? []).find((customer) => digits(customer.phone ?? '') === typedPhone)
      if (exact) {
        push({
          tone: 'danger',
          title: t('sales.phoneTaken', 'This number is already saved. Pick that client from the list.'),
        })
        return
      }
    }

    const prepared = lines.map((line) => ({
      product_id: line.product_id,
      sr_number: line.sr_number.trim() || null,
      article: line.article.trim(),
      description: line.description.trim() || null,
      quantity: line.quantity,
      unit_price: parseAmountToCents(line.unitPrice) ?? -1,
      discount_percent: parseNumber(line.discount) ?? 0,
      iva_percent: parseNumber(line.iva) ?? 0,
    }))

    if (prepared.some((line) => line.article === '' || line.unit_price < 0)) {
      push({ tone: 'danger', title: t('sales.badLine', 'Every line needs an article and a price.') })
      return
    }

    issue.mutate({
      type,
      issued_at: new Date(issuedAt).toISOString(),
      payment_status: payment,
      customer_id: customerId,
      save_customer: customerId === null,
      client_name: clientName.trim(),
      client_company: clientCompany.trim() || null,
      client_phone: clientPhone.trim() || null,
      client_nif: clientNif.trim() || null,
      client_nie: null,
      notes: notes.trim() || null,
      lines: prepared,
    })
  }

  const issueLabel =
    type === 'abono'
      ? t('sales.issueAbono', 'Issue abono and return stock')
      : type === 'albaran'
        ? t('sales.issueAlbaran', 'Issue albarán and deduct stock')
        : t('sales.issueFactura', 'Issue factura and deduct stock')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-xs">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
              {t('sales.newTitle', 'New sale')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('sales.newSubtitle', 'Factura, albarán or abono, with the client and the lines on one screen.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('sales.stockProtected', 'Stock protected, no negatives')}
          </span>
            <button
            type="button"
            onClick={() => {
              setDropdown(true)
              setCamera(true)
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700"
          >
            <Camera className="h-4 w-4" />
            {t('sales.camera', 'Scan code')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-md sm:p-8 lg:p-10">
        <div className="grid gap-6 border-b border-slate-100 pb-6 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#004ac6] font-mono text-sm font-bold text-white">
                {initials(company?.name ?? 'Fatura')}
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{company?.name ?? '—'}</h2>
                <p className="font-mono text-xs text-slate-500">{company?.email}</p>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {[company?.address, company?.city].filter(Boolean).join(' · ') || t('sales.noAddress', 'No address on the company yet')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <span className={label}>{t('sales.document', 'Document')}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {TYPES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setType(option.id)}
                    className={cn(
                      'cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold',
                      type === option.id ? 'bg-[#004ac6] text-white' : 'border border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>{t('sales.number', 'Number')}</span>
              <span className="block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800">
                {preview.data?.number ?? '—'}
              </span>
            </div>
            <div>
              <span className={label}>{t('sales.issuedAt', 'Date and time')}</span>
              <input
                type="datetime-local"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none"
              />
            </div>
            <div>
              <span className={label}>{t('sales.payment', 'Payment')}</span>
              <div className="grid grid-cols-2 gap-1">
                {(['pending', 'paid'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPayment(status)}
                    className={cn(
                      'cursor-pointer rounded-lg px-1 py-1.5 text-[11px] font-bold',
                      payment === status
                        ? status === 'paid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                        : 'border border-slate-300 bg-white text-slate-600',
                    )}
                  >
                    {status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-[#f8f9ff] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-[0.06em] text-slate-800 uppercase">
              <UserRound className="h-4 w-4 text-[#2563eb]" />
              {t('sales.clientHeading', 'Client')}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {customerId === null ? (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-800">
                  {t('sales.newClient', 'New client')}
                </span>
              ) : null}
              <button type="button" onClick={clearCustomer} className="cursor-pointer font-medium text-slate-400 hover:text-slate-600">
                {t('sales.clearClient', 'Clear')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <span className={label}>{t('sales.phone', 'Telephone')}</span>
              <input
                value={clientPhone}
                onChange={(event) => onPhoneChange(event.target.value)}
                onKeyDown={onPhoneKeyDown}
                placeholder={t('sales.phoneSearch', 'Search by phone number')}
                className={cn(field, 'font-mono')}
              />
              {customerId === null && phoneMatches.length > 0 ? (
                <div className="absolute top-full left-0 z-20 mt-1 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {phoneMatches.map((customer, index) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => pickCustomer(customer)}
                      className={cn(
                        'flex w-full cursor-pointer flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50',
                        index === 0 && optionOn,
                      )}
                    >
                      <span className="text-xs font-bold text-slate-900">{customer.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {[customer.company_name, customer.phone, customer.nif || customer.nie].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <span className={label}>{t('sales.clientName', 'Name')}</span>
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} className={cn(field, 'font-semibold')} />
            </div>
            <div>
              <span className={label}>{t('sales.clientCompany', 'Company name')}</span>
              <input value={clientCompany} onChange={(event) => setClientCompany(event.target.value)} className={field} />
            </div>
            <div>
              <span className={label}>{t('sales.taxId', 'N.I.F/N.I.E')}</span>
              <input
                value={clientNif}
                onChange={(event) => setClientNif(event.target.value.toUpperCase())}
                className={cn(field, 'font-mono uppercase')}
              />
            </div>
          </div>

          {customerId === null && phoneNeedle.length >= 3 ? (
            <p className="text-[11px] font-medium text-slate-500">
              {customers.isPending
                ? t('sales.phoneSearching', 'Searching…')
                : phoneMatches.length === 0
                  ? t('sales.phoneNew', 'No client on this number. Fill in the details — they will be saved as a new client.')
                  : t('sales.phoneEnter', 'Press Enter to use the highlighted client.')}
            </p>
          ) : null}
        </div>

        <div className="relative flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.06em] text-slate-700 uppercase">
            {t('sales.findProduct', 'Scan a barcode or search a product')}
          </span>
          <div className="flex gap-2">
            <span className="relative min-w-0 flex-1">
              <ScanLine className="absolute top-3 left-3.5 h-5 w-5 text-[#2563eb]" />
              <input
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value)
                  setDropdown(true)
                }}
                onKeyDown={onProductKeyDown}
                onFocus={() => setDropdown(true)}
                placeholder={t('sales.productPlaceholder', 'Name, sr number or barcode')}
                className="w-full rounded-xl border-2 border-blue-400/40 bg-white py-3 pr-3 pl-11 text-sm font-medium outline-none"
              />
            </span>
          </div>
          {dropdown && !camera && productQuery.trim() !== '' ? (
            <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {catalog.isPending ? (
                <p className="px-4 py-3 text-xs text-slate-500">{t('sales.phoneSearching', 'Searching…')}</p>
              ) : productMatches.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">{t('sales.noProduct', 'No product matches that.')}</p>
              ) : (
                productMatches.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-4 border-b border-slate-100 px-3.5 py-3 text-left last:border-0 hover:bg-slate-50',
                      index === 0 && optionOn,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{product.article}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {product.sr_number ?? '—'} · {product.barcode} · IVA {product.iva_percent}%
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-bold">{formatCents(product.selling_price, currency)}</span>
                      <span className="text-[11px] text-slate-500">
                        {piecesLeft(product.id, product.quantity)} {t('sales.left', 'left')}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-[0.06em] text-slate-700 uppercase">
              {t('sales.lines', 'Lines')} ({lines.length})
            </span>
            {lines.length > 0 ? (
              <button type="button" onClick={() => setLines([])} className="cursor-pointer text-xs font-medium text-rose-600">
                {t('sales.clearLines', 'Clear lines')}
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <div className="min-w-[920px]">
              <div className="flex items-center bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600">
                <span className="w-10 text-center">#</span>
                <span className="w-28 px-2">{t('sales.sr', 'Sr number')}</span>
                <span className="min-w-0 flex-1 px-2">{t('sales.article', 'Article')}</span>
                <span className="w-40 px-2">{t('sales.available', 'Available')}</span>
                <span className="w-28 text-center">{t('sales.qty', 'Quantity')}</span>
                <span className="w-24 text-right">{t('sales.price', 'Price')}</span>
                <span className="w-16 text-right">{t('sales.dto', 'Dto %')}</span>
                <span className="w-16 text-right">{t('sales.iva', '% IVA')}</span>
                <span className="w-24 text-right">{t('sales.total', 'Total')}</span>
                <span className="w-10" />
              </div>
              {lines.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">
                  {t('sales.emptyLines', 'Search a product above to add the first line.')}
                </p>
              ) : (
                lines.map((line, index) => {
                  const unit = parseAmountToCents(line.unitPrice) ?? 0
                  const math = lineTotals(line.quantity, unit, parseNumber(line.discount) ?? 0, parseNumber(line.iva) ?? 0)
                  const atStock = line.stock !== null && type !== 'abono' && line.quantity >= line.stock
                  const remaining =
                    line.stock === null ? null : type === 'abono' ? line.stock + line.quantity : line.stock - line.quantity
                  const stockTone =
                    remaining === null
                      ? ''
                      : remaining <= 0
                        ? 'bg-[#fff1f2] text-[#be123c]'
                        : line.stock !== null && remaining <= Math.max(1, Math.floor(line.stock * 0.1))
                          ? 'bg-[#fffbeb] text-[#b45309]'
                          : 'bg-[#ecfdf5] text-[#047857]'
                  return (
                    <div key={line.key} className="flex items-center border-t border-slate-100 px-3 py-2.5">
                      <span className="w-10 text-center font-mono text-xs text-slate-400">{index + 1}</span>
                      <span className="w-28 px-2 font-mono text-[11px] text-slate-500">{line.sr_number || '—'}</span>
                      <span className="min-w-0 flex-1 truncate px-2 text-xs font-bold text-slate-900">{line.article}</span>
                      <span className="flex w-40 flex-col items-start px-2">
                        {remaining === null || line.stock === null ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <>
                            <span className={cn('rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold', stockTone)}>
                              {remaining} {t('sales.left', 'left')}
                            </span>
                            <span className="mt-1 text-[10px] leading-tight text-slate-500">
                              {t('sales.ofAvailable', ':left of :stock available')
                                .replace(':left', String(remaining))
                                .replace(':stock', String(line.stock))}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="flex w-28 justify-center">
                        <span className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300">
                          <button type="button" onClick={() => changeQuantity(line, line.quantity - 1)} className="cursor-pointer p-1.5 text-slate-600">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-bold">{line.quantity}</span>
                          <button
                            type="button"
                            disabled={atStock}
                            onClick={() => changeQuantity(line, line.quantity + 1)}
                            className="cursor-pointer p-1.5 text-slate-600 disabled:text-slate-300"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </span>
                      <input
                        value={line.unitPrice}
                        onChange={(event) => changeLine(line.key, { unitPrice: event.target.value })}
                        className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right font-mono text-xs font-bold outline-none"
                      />
                      <input
                        value={line.discount}
                        onChange={(event) => changeLine(line.key, { discount: event.target.value })}
                        className="ml-2 w-14 rounded-lg border border-slate-300 px-2 py-1 text-right font-mono text-xs outline-none"
                      />
                      <select
                        aria-label={t('sales.iva', '% IVA')}
                        value={line.iva}
                        onChange={(event) => changeLine(line.key, { iva: event.target.value })}
                        className="ml-2 w-[4.5rem] rounded-lg border border-slate-300 bg-white px-1 py-1 text-right font-mono text-xs outline-none"
                      >
                        {ivaOptions(taxRates.data ?? [], line.iva).map((option) => (
                          <option key={option} value={option}>
                            {option}%
                          </option>
                        ))}
                      </select>
                      <span className="w-24 text-right font-mono text-sm font-bold text-slate-900">
                        {formatCents(math.total, currency)}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t('common.delete', 'Delete')} ${line.article}`}
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                        className="flex w-10 cursor-pointer justify-center text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-t border-slate-100 pt-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            <span className="text-xs font-bold tracking-[0.06em] text-slate-700 uppercase">
              {t('sales.notes', 'Notes')}
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs outline-none"
            />
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:col-span-5">
            <h4 className="border-b border-slate-200 pb-2 text-xs font-bold tracking-[0.06em] text-slate-900 uppercase">
              {t('sales.settlement', 'Settlement')}
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex justify-between text-slate-600">
                <span>{t('sales.base', 'Taxable base')}</span>
                <span className="font-mono font-bold text-slate-800">{formatCents(totals.base, currency)}</span>
              </span>
              {totals.groups.map(([rate, group]) => (
                <span key={rate} className="flex justify-between border-l-2 border-blue-400 pl-2 text-[11px] text-slate-500">
                  <span>IVA {rate}% ({formatCents(group.base, currency)})</span>
                  <span className="font-mono text-slate-700">{formatCents(group.tax, currency)}</span>
                </span>
              ))}
              <span className="flex justify-between text-slate-600">
                <span>{t('sales.taxTotal', 'Tax')}</span>
                <span className="font-mono font-bold text-slate-800">{formatCents(totals.tax, currency)}</span>
              </span>
              <span className="mt-1 flex items-baseline justify-between border-t-2 border-slate-200 pt-3">
                <span className="text-sm font-black text-slate-900">{t('sales.grandTotal', 'Total')}</span>
                <span className="font-mono text-2xl font-black text-[#2563eb]">{formatCents(totals.total, currency)}</span>
              </span>
            </div>
            <button
              type="button"
              disabled={issue.isPending}
              onClick={submit}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#004ac6] px-4 py-3.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {issue.isPending ? t('sales.issuing', 'Issuing...') : issueLabel}
            </button>
          </div>
        </div>
      </div>

      {camera ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div role="dialog" aria-label={t('sales.camera', 'Scan code')} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold">{t('sales.cameraTitle', 'Find by barcode')}</h3>
              <button type="button" aria-label={t('common.close', 'Close')} onClick={() => setCamera(false)} className="cursor-pointer text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="flex gap-2 p-5"
              onSubmit={(event) => {
                event.preventDefault()
                const match = productMatches.find((product) => product.barcode === productQuery.trim()) ?? productMatches[0]
                if (match) addProduct(match)
                else push({ tone: 'danger', title: t('sales.noProduct', 'No product matches that.') })
              }}
            >
              <input
                autoFocus
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value)
                  setDropdown(true)
                }}
                placeholder={t('sales.barcodePlaceholder', 'Type or scan the barcode')}
                className={cn(field, 'font-mono')}
              />
              <button type="submit" className="cursor-pointer rounded-lg bg-[#2563eb] px-4 text-xs font-semibold text-white">
                {t('sales.add', 'Add')}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default InvoiceNew
