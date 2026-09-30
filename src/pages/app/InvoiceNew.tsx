import { useMutation, useQuery } from '@tanstack/react-query'
import { Camera, Check, MessageCircle, Minus, Plus, Receipt, ScanLine, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useToast } from '../../components/ui/Toast'
import { Select } from '../../components/ui/Select'
import { Tooltip } from '../../components/ui/Tooltip'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { TONE_AMBER, TONE_GREEN, TONE_ROSE } from '../../lib/status'
import { allocateDiscount, centsToInput, formatCents, lineTotals, parseAmountToCents, parseNumber } from '../../lib/money'
import { generateSaleDocumentPdfBase64 } from '../../lib/exportSaleSheet'
import { getErrorMessage } from '../../services/api'
import { listAllProducts, listRecargoRates, listTaxRates } from '../../services/catalog'
import { createSale, getSale, listActiveCustomers, previewSale, updateSale } from '../../services/sales'
import { getPrintTemplates } from '../../services/printables'
import { getWhatsAppStatus, sendWhatsAppDocument } from '../../services/whatsapp'
import type { Product } from '../../types/catalog'
import type { Customer, DiscountType, IssuableType, PaymentStatus, SaleDocument, SaleInput } from '../../types/sales'
import { isSaleConverted } from '../../types/sales'
import { ISSUABLE_TYPES, celebratesPayment, isIssuable, rulesFor, typeLabel } from './documentTypes'
import { DiscountEditor } from './DiscountEditor'
import { RecargoPicker } from './RecargoPicker'
import { RecordPaymentModal } from './RecordPaymentModal'

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

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return nowLocal()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function linesFromDocument(document: SaleDocument, products: Product[]): DraftLine[] {
  return (document.lines ?? []).map((line) => {
    const product = line.product_id === null ? undefined : products.find((row) => row.id === line.product_id)
    return {
      key: crypto.randomUUID(),
      product_id: line.product_id,
      sr_number: line.sr_number ?? '',
      article: line.article,
      description: line.description ?? '',
      quantity: line.quantity,
      unitPrice: centsToInput(line.unit_price),
      discount: String(line.discount_percent),
      iva: String(line.iva_percent),
      stock: product?.quantity ?? null,
    }
  })
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? 'F').slice(0, 2)
  return letters.toUpperCase()
}

const field =
  'w-full box-border rounded-lg border border-line bg-card px-3 py-1.5 text-xs text-ink outline-none focus:border-brand-600'

const label = 'mb-1 block text-[11px] font-semibold text-slate-600'

// The client card has room to breathe: taller fields, a visible focus ring, a roomier label.
const clientLabel = 'mb-1.5 block text-xs font-semibold text-slate-600'

const clientField =
  'h-10 w-full box-border rounded-xl border border-line bg-card px-3 text-[13px] text-ink outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'

const optionOn = 'bg-brand-50'

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
  const { id } = useParams()
  const { push } = useToast()
  const [params] = useSearchParams()
  const currency = session?.company?.currency ?? 'USD'
  const company = session?.company
  const editingId = Number(id)
  const editing = Number.isFinite(editingId)

  const requested = params.get('type')
  const [type, setType] = useState<IssuableType>(editing ? 'quotation' : isIssuable(requested) ? requested : 'factura')
  const [hydrated, setHydrated] = useState(false)
  const [recargoRestored, setRecargoRestored] = useState(false)
  const rules = rulesFor(type)
  const [issuedAt, setIssuedAt] = useState(nowLocal)
  const [payment, setPayment] = useState<PaymentStatus>('pending')
  const [methodOpen, setMethodOpen] = useState(false)
  const [recargoId, setRecargoId] = useState<number | null>(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountKind, setDiscountKind] = useState<DiscountType>('percent')
  const [discountInput, setDiscountInput] = useState('')

  const [customerId, setCustomerId] = useState<number | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNif, setClientNif] = useState('')

  const [productQuery, setProductQuery] = useState('')
  const [dropdown, setDropdown] = useState(false)
  const [camera, setCamera] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true)

  // The note on a document comes from Printables. A new document is stamped with the one for its
  // type when it is issued; a saved quotation shows the note it was issued with.
  const printTemplates = useQuery({ queryKey: ['app', 'print-templates'], queryFn: getPrintTemplates })

  const whatsAppStatus = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: getWhatsAppStatus,
    staleTime: 30000,
  })

  // Each list opens this screen with its own ?type=, and the route is shared,
  // so the screen is not remounted when one list sends us to another.
  useEffect(() => {
    if (editing) {
      setType('quotation')
      return
    }
    if (isIssuable(requested)) setType(requested)
  }, [editing, requested])

  const existing = useQuery({
    queryKey: ['app', 'sale', editingId],
    queryFn: () => getSale(editingId),
    enabled: editing,
  })

  const preview = useQuery({
    queryKey: ['app', 'sales', 'preview', type],
    queryFn: () => previewSale(type),
    enabled: !editing,
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

  // Recargo de equivalencia is offered on invoices only, from the rates kept in Settings.
  const recargoRates = useQuery({
    queryKey: ['app', 'recargo-rates'],
    queryFn: listRecargoRates,
    enabled: rules.allowsRecargo,
  })

  const selectedCustomer = customerId === null ? null : ((customers.data ?? []).find((customer) => customer.id === customerId) ?? null)
  const hasClientData =
    customerId !== null ||
    [clientPhone, clientName, clientCompany, clientNif].some((value) => value.trim() !== '')

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

  // What a line is worth once this document's own tax and discount rules apply.
  const lineMath = useMemo(() => {
    const byKey = new Map<string, { base: number; tax: number; total: number; iva: number }>()
    for (const line of lines) {
      const unit = parseAmountToCents(line.unitPrice) ?? 0
      const discount = rules.carriesDiscount ? (parseNumber(line.discount) ?? 0) : 0
      const iva = rules.carriesTax ? (parseNumber(line.iva) ?? 0) : 0
      byKey.set(line.key, { ...lineTotals(line.quantity, unit, discount, iva), iva })
    }
    return byKey
  }, [lines, rules.carriesDiscount, rules.carriesTax])

  // A discount on the whole bill (percent, or an amount). It comes off the taxable base, and IVA
  // is worked out on what is left. Split over the lines with the same rule the server uses.
  const grossBase = useMemo(
    () => lines.reduce((sum, line) => sum + (lineMath.get(line.key)?.base ?? 0), 0),
    [lines, lineMath],
  )
  const typedDiscount = discountOpen && rules.carriesDiscount ? Math.max(parseNumber(discountInput) ?? 0, 0) : 0
  const discountCents =
    discountKind === 'percent'
      ? Math.round((grossBase * Math.min(typedDiscount, 100)) / 100)
      : Math.min(Math.round(typedDiscount * 100), grossBase)
  const discountError =
    typedDiscount <= 0
      ? null
      : discountKind === 'percent' && typedDiscount > 100
        ? t('sales.discountTooHigh', 'A discount cannot be more than 100%.')
        : discountKind === 'amount' && Math.round(typedDiscount * 100) > grossBase
          ? t('sales.discountOverBill', 'The discount cannot be more than the bill.')
          : null

  const totals = useMemo(() => {
    const groups = new Map<number, { base: number; tax: number }>()
    const counted = lines.filter((line) => lineMath.has(line.key))
    const shares = allocateDiscount(
      counted.map((line) => lineMath.get(line.key)?.base ?? 0),
      discountCents,
    )
    let base = 0
    let tax = 0

    counted.forEach((line, index) => {
      const math = lineMath.get(line.key)
      if (!math) return
      const net = math.base - shares[index]
      const lineTax = Math.round(net * (math.iva / 100))
      base += net
      tax += lineTax
      const group = groups.get(math.iva) ?? { base: 0, tax: 0 }
      group.base += net
      group.tax += lineTax
      groups.set(math.iva, group)
    })

    return { gross: grossBase, discount: discountCents, base, tax, total: base + tax, groups: [...groups.entries()] }
  }, [lines, lineMath, grossBase, discountCents])

  // The same rounding the server applies: a percentage of the taxable base, to the cent.
  const recargo = rules.allowsRecargo ? ((recargoRates.data ?? []).find((rate) => rate.id === recargoId) ?? null) : null
  const recargoCents = recargo ? Math.round((totals.base * recargo.rate) / 100) : 0
  const grandTotal = totals.total + recargoCents

  const noteText = (
    editing
      ? (existing.data?.notes ?? '')
      : (printTemplates.data?.templates.find((template) => template.type === type)?.notes ?? '')
  ).trim()

  useEffect(() => {
    const document = existing.data
    if (!document || hydrated) return
    if (isSaleConverted(document) && document.converted_to) {
      navigate(`${rulesFor(document.converted_to.type).listPath}/${document.converted_to.id}`, { replace: true })
      return
    }
    setType('quotation')
    setIssuedAt(toLocalInput(document.issued_at))
    if (document.discount_type && document.discount_cents > 0) {
      setDiscountOpen(true)
      setDiscountKind(document.discount_type)
      setDiscountInput(
        document.discount_type === 'amount' ? centsToInput(document.discount_value ?? 0) : String(document.discount_value ?? ''),
      )
    }
    setCustomerId(document.customer_id)
    setClientName(document.client_name)
    setClientCompany(document.client_company ?? '')
    setClientPhone(document.client_phone ?? '')
    setClientNif(document.client_nif ?? '')
    setLines(linesFromDocument(document, catalog.data ?? []))
    setHydrated(true)
  }, [catalog.data, existing.data, hydrated, navigate])

  // Reopening a saved quotation: pick its recargo rate again once the rates have loaded.
  useEffect(() => {
    const document = existing.data
    if (!editing || !document || recargoRestored || !recargoRates.data) return
    setRecargoRestored(true)

    if (!document.recargo_percent) return
    const match = recargoRates.data.find((rate) => rate.rate === document.recargo_percent)
    if (match) {
      setRecargoId(match.id)
    } else {
      push({
        tone: 'danger',
        title: t(
          'sales.recargoMissing',
          'This quotation had a recargo of :rate%, which is no longer in Settings. Add it back to keep it.',
        ).replace(':rate', String(document.recargo_percent)),
      })
    }
  }, [editing, existing.data, push, recargoRates.data, recargoRestored])

  const save = useMutation({
    mutationFn: (input: SaleInput) => (editing ? updateSale(editingId, input) : createSale(input)),
    onSuccess: (document) => {
      setMethodOpen(false)

      if (
        !editing &&
        sendViaWhatsApp &&
        document.client_phone &&
        whatsAppStatus.data?.status === 'connected' &&
        whatsAppStatus.data?.auto_send !== false
      ) {
        void (async () => {
          try {
            const fileBase64 = await generateSaleDocumentPdfBase64(document, session?.company ?? null, currency)
            const tmpl = whatsAppStatus.data?.message_template
            const docType = document.type.charAt(0).toUpperCase() + document.type.slice(1)
            const totalStr = formatCents(document.total_cents, currency)
            const compName = session?.company?.name || 'YK Digital Solutions'
            const custName = document.client_name || 'Customer'
            const caption = tmpl
              ? tmpl
                  .replace(/\{customer_name\}/g, custName)
                  .replace(/\{document_type\}/g, docType)
                  .replace(/\{document_number\}/g, document.number)
                  .replace(/\{total_amount\}/g, totalStr)
                  .replace(/\{company_name\}/g, compName)
              : `Dear ${custName},\n\nPlease find attached your ${docType} *#${document.number}* from *${compName}* for *${totalStr}*.\n\nThank you for choosing us!`

            await sendWhatsAppDocument({
              sale_id: document.id,
              number: document.client_phone,
              fileBase64,
              filename: `${document.number}.pdf`,
              caption,
            })

            push({
              tone: 'success',
              title: t('whatsapp.autoSentToast', `Document #${document.number} and PDF sent to customer via WhatsApp!`),
            })
          } catch (err) {
            push({
              tone: 'warning',
              title: t('whatsapp.autoSendFailedToast', `Document created, but WhatsApp delivery failed: ${getErrorMessage(err)}`),
            })
          }
        })()
      }

      navigate(`${rulesFor(document.type).listPath}/${document.id}`, {
        state:
          !editing && celebratesPayment(document.type) && document.payment_status === 'paid'
            ? { celebrate: true }
            : undefined,
      })
    },
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
    if (!rules.movesStock) return stock
    const used = lines.reduce((sum, line) => (line.product_id === productId ? sum + line.quantity : sum), 0)
    return stock - used
  }

  function addProduct(product: Product) {
    const existing = lines.find((line) => line.product_id === product.id)
    if (existing && existing.stock !== null && rules.movesStock && existing.quantity + 1 > existing.stock) {
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
              // A proforma is issued at the agreed price, so the box starts empty.
              unitPrice: rules.manualPrice ? '' : centsToInput(product.selling_price),
              discount: '0',
              iva: String(product.iva_percent),
              stock: product.quantity,
            },
          ]
        }
        const next = line.quantity + 1
        if (line.stock !== null && rules.movesStock && next > line.stock) return current
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
    const capped = line.stock !== null && rules.movesStock ? Math.min(next, line.stock) : next
    if (capped < 1) return
    changeLine(line.key, { quantity: capped })
  }

  function buildPayload(): SaleInput | null {
    if (clientName.trim() === '') {
      push({ tone: 'danger', title: t('sales.needClient', 'Enter the client name.') })
      return null
    }
    if (lines.length === 0) {
      push({ tone: 'danger', title: t('sales.needLines', 'Add at least one line.') })
      return null
    }

    if (discountError) {
      push({ tone: 'danger', title: discountError })
      return null
    }

    const typedPhone = digits(clientPhone)
    if (customerId === null && typedPhone.length >= 3) {
      const exact = (customers.data ?? []).find((customer) => digits(customer.phone ?? '') === typedPhone)
      if (exact) {
        push({
          tone: 'danger',
          title: t('sales.phoneTaken', 'This number is already saved. Pick that client from the list.'),
        })
        return null
      }
    }

    const prepared = lines.map((line) => ({
      product_id: line.product_id,
      sr_number: line.sr_number.trim() || null,
      article: line.article.trim(),
      description: line.description.trim() || null,
      quantity: line.quantity,
      unit_price: parseAmountToCents(line.unitPrice) ?? -1,
      discount_percent: rules.carriesDiscount ? (parseNumber(line.discount) ?? 0) : 0,
      iva_percent: rules.carriesTax ? (parseNumber(line.iva) ?? 0) : 0,
    }))

    if (prepared.some((line) => line.article === '' || line.unit_price < 0)) {
      push({ tone: 'danger', title: t('sales.badLine', 'Every line needs an article and a price.') })
      return null
    }

    return {
      type,
      issued_at: new Date(issuedAt).toISOString(),
      payment_status: rules.settlesPayment ? payment : 'pending',
      customer_id: customerId,
      save_customer: customerId === null,
      client_name: clientName.trim(),
      client_company: clientCompany.trim() || null,
      client_phone: clientPhone.trim() || null,
      client_nif: clientNif.trim() || null,
      client_nie: null,
      discount_type: discountCents > 0 ? discountKind : null,
      discount_value:
        discountCents > 0 ? (discountKind === 'amount' ? Math.round(typedDiscount * 100) : typedDiscount) : null,
      recargo_rate_id: recargo ? recargo.id : null,
      lines: prepared,
    }
  }

  function submit() {
    if (save.isPending) return
    const payload = buildPayload()
    if (!payload) return
    if (!editing && rules.settlesPayment && payment === 'paid') {
      setMethodOpen(true)
      return
    }
    save.mutate(payload)
  }

  function confirmMethod(methodId: number) {
    const payload = buildPayload()
    if (!payload) return
    save.mutate({ ...payload, payment_status: 'paid', payment_method_id: methodId })
  }

  const issueLabel = editing
    ? t('sales.saveQuote', 'Save quotation')
    : rules.movesStock
      ? t('sales.issueAndDeduct', 'Issue :type and deduct stock').replace(':type', typeLabel(type).toLowerCase())
      : t('sales.issueOnly', 'Issue :type').replace(':type', typeLabel(type).toLowerCase())

  if (editing && existing.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
        {getErrorMessage(existing.error)}
      </div>
    )
  }

  if (editing && !hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-page" />
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-5 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-brand-on shadow-xs">
            <Receipt className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
              {editing ? t('sales.editQuote', 'Edit quotation') : t('sales.newTitle', 'New sale')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {editing
                ? t('sales.editQuoteHint', 'Change the client or the lines. The quotation number stays.')
                : t('sales.newSubtitle', 'Invoice, delivery note, quotation or proforma, with the client and the lines on one screen.')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              rules.movesStock
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-line bg-page text-slate-600',
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {rules.movesStock
              ? t('sales.stockProtected', 'Stock protected, no negatives')
              : t('sales.stockUntouched', 'Stock is not touched')}
          </span>
            <button
            type="button"
            onClick={() => {
              setDropdown(true)
              setCamera(true)
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-600"
          >
            <Camera className="h-4 w-4" />
            {t('sales.camera', 'Scan code')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8 rounded-3xl border border-line bg-card p-4 shadow-md sm:p-8 lg:p-10">
        <div className="grid gap-6 border-b border-slate-100 pb-6 lg:grid-cols-2">
          {rules.showsCompanyContact ? (
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-mono text-sm font-bold text-brand-on">
                  {initials(company?.name ?? 'YK Digital Solutions')}
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
          ) : (
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                {t('sales.document', 'Document')}
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{rules.title}</h2>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line/80 bg-page p-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <span className={label}>{t('sales.document', 'Document')}</span>
              {editing ? (
                <span className="block rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-bold text-brand-on">
                  {typeLabel('quotation')}
                </span>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {ISSUABLE_TYPES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setType(option)}
                      className={cn(
                        'cursor-pointer rounded-lg px-2 py-1.5 text-xs font-bold',
                        type === option ? 'bg-brand-600 text-brand-on' : 'border border-line bg-card text-ink',
                      )}
                    >
                      {typeLabel(option)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className={label}>{t('sales.number', 'Number')}</span>
              <span className="block rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-xs font-bold text-ink">
                {editing ? (existing.data?.number ?? '—') : (preview.data?.number ?? '—')}
              </span>
            </div>
            <div>
              <span className={label}>{t('sales.issuedAt', 'Date and time')}</span>
              <input
                type="datetime-local"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="w-full rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-xs text-ink outline-none"
              />
            </div>
            {!editing && rules.settlesPayment ? (
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
                          : 'border border-line bg-card text-ink',
                      )}
                    >
                      {status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-page p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2.5 text-sm font-bold tracking-[0.06em] text-slate-800 uppercase">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <UserRound className="h-4 w-4" />
              </span>
              {t('sales.clientHeading', 'Client')}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {customerId !== null ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold',
                    TONE_GREEN,
                  )}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                  {t('sales.savedClient', 'Saved client')}
                  {selectedCustomer ? <span className="font-mono">· {selectedCustomer.code}</span> : null}
                </span>
              ) : hasClientData ? (
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-semibold text-brand-600">
                  {t('sales.newClient', 'New client')}
                </span>
              ) : null}
              {hasClientData ? (
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('sales.clearClient', 'Clear')}
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <div className="relative">
              <span className={clientLabel}>{t('sales.phone', 'Telephone')}</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={clientPhone}
                  onChange={(event) => onPhoneChange(event.target.value)}
                  onKeyDown={onPhoneKeyDown}
                  inputMode="tel"
                  autoComplete="off"
                  placeholder={t('sales.phoneSearch', 'Search by phone number')}
                  className={cn(clientField, 'pl-9 font-mono')}
                />
              </span>
              {customerId === null && phoneMatches.length > 0 ? (
                <div className="absolute top-full left-0 z-20 mt-1.5 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-line bg-card shadow-lg">
                  {phoneMatches.map((customer, index) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => pickCustomer(customer)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50',
                        index === 0 && optionOn,
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
                        {customer.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-slate-900">{customer.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {[customer.company_name, customer.phone, customer.nif || customer.nie].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] font-semibold text-slate-400">{customer.code}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <span className={clientLabel}>
                {t('sales.clientName', 'Name')}
                <span className="ml-0.5 text-rose-500">*</span>
              </span>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                autoComplete="off"
                className={cn(clientField, 'font-semibold')}
              />
            </div>

            <div>
              <span className={clientLabel}>{t('sales.clientCompany', 'Company name')}</span>
              <input
                value={clientCompany}
                onChange={(event) => setClientCompany(event.target.value)}
                autoComplete="off"
                className={clientField}
              />
            </div>

            <div>
              <span className={clientLabel}>{t('sales.taxId', 'N.I.F/N.I.E')}</span>
              <input
                value={clientNif}
                onChange={(event) => setClientNif(event.target.value.toUpperCase())}
                autoComplete="off"
                className={cn(clientField, 'font-mono uppercase')}
              />
            </div>
          </div>

          {customerId === null && phoneNeedle.length >= 3 ? (
            <p
              className={cn(
                'flex items-start gap-1.5 text-[11px] font-medium',
                !customers.isPending && phoneMatches.length === 0 ? 'text-brand-600' : 'text-slate-500',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full',
                  !customers.isPending && phoneMatches.length === 0 ? 'bg-brand-500' : 'bg-slate-300',
                )}
              />
              {customers.isPending
                ? t('sales.phoneSearching', 'Searching…')
                : phoneMatches.length === 0
                  ? t('sales.phoneNew', 'No client on this number. Fill in the details — they will be saved as a new client.')
                  : t('sales.phoneEnter', 'Press Enter to use the highlighted client.')}
            </p>
          ) : null}

          {clientPhone.trim() && whatsAppStatus.data?.status === 'connected' ? (
            <label
              className={cn(
                'flex cursor-pointer select-none items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium',
                'border-emerald-200 bg-emerald-50 text-emerald-700 app-dark:border-emerald-500/30 app-dark:bg-emerald-500/15 app-dark:text-emerald-300',
              )}
            >
              <input
                type="checkbox"
                checked={sendViaWhatsApp}
                onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-emerald-300 accent-emerald-600"
              />
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>{t('whatsapp.sendDocToNumber', 'Send printable PDF via WhatsApp on save')}</span>
            </label>
          ) : null}
        </div>

        <div className="relative flex flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.06em] text-slate-700 uppercase">
            {t('sales.findProduct', 'Scan a barcode or search a product')}
          </span>
          <div className="flex gap-2">
            <span className="relative min-w-0 flex-1">
              <ScanLine className="absolute top-3 left-3.5 h-5 w-5 text-brand-500" />
              <input
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value)
                  setDropdown(true)
                }}
                onKeyDown={onProductKeyDown}
                onFocus={() => setDropdown(true)}
                placeholder={t('sales.productPlaceholder', 'Name, sr number or barcode')}
                className="w-full rounded-xl border-2 border-brand-500/40 bg-card py-3 pr-3 pl-11 text-sm font-medium outline-none"
              />
            </span>
          </div>
          {dropdown && !camera && productQuery.trim() !== '' ? (
            <div className="absolute top-full right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
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
                {rules.showsAvailable ? <span className="w-40 px-2">{t('sales.available', 'Available')}</span> : null}
                <span className="w-28 text-center">{t('sales.qty', 'Quantity')}</span>
                <span className="w-24 text-right">{t('sales.price', 'Price')}</span>
                {rules.carriesDiscount ? <span className="w-16 text-right">{t('sales.dto', 'Dto %')}</span> : null}
                {rules.carriesTax ? <span className="w-16 text-right">{t('sales.iva', '% IVA')}</span> : null}
                {rules.showsPriceWithTax ? (
                  <>
                    <span className="w-28 text-right">{t('sales.priceNet', 'Without tax')}</span>
                    <span className="w-28 text-right">{t('sales.priceGross', 'With tax')}</span>
                  </>
                ) : (
                  <span className="w-24 text-right">{t('sales.total', 'Total')}</span>
                )}
                <span className="w-10" />
              </div>
              {lines.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">
                  {t('sales.emptyLines', 'Search a product above to add the first line.')}
                </p>
              ) : (
                lines.map((line, index) => {
                  const math = lineMath.get(line.key) ?? { base: 0, tax: 0, total: 0, iva: 0 }
                  const atStock = line.stock !== null && rules.movesStock && line.quantity >= line.stock
                  // A quotation reserves nothing, so its badge stays at the shelf count.
                  const remaining =
                    line.stock === null ? null : rules.movesStock ? line.stock - line.quantity : line.stock
                  const stockTone =
                    remaining === null
                      ? ''
                      : remaining <= 0
                        ? TONE_ROSE
                        : line.stock !== null && remaining <= Math.max(1, Math.floor(line.stock * 0.1))
                          ? TONE_AMBER
                          : TONE_GREEN
                  return (
                    <div key={line.key} className="flex items-center border-t border-slate-100 px-3 py-2.5">
                      <span className="w-10 text-center font-mono text-xs text-slate-400">{index + 1}</span>
                      <span className="w-28 px-2 font-mono text-[11px] text-slate-500">{line.sr_number || '—'}</span>
                      <span className="min-w-0 flex-1 truncate px-2 text-xs font-bold text-slate-900">{line.article}</span>
                      {rules.showsAvailable ? (
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
                      ) : null}
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
                        aria-label={`${t('sales.price', 'Price')} ${line.article}`}
                        value={line.unitPrice}
                        onChange={(event) => changeLine(line.key, { unitPrice: event.target.value })}
                        placeholder={rules.manualPrice ? t('sales.typePrice', 'Price') : undefined}
                        className={cn(
                          'w-24 rounded-lg border px-2 py-1 text-right font-mono text-xs font-bold outline-none',
                          rules.manualPrice && line.unitPrice.trim() === ''
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-300',
                        )}
                      />
                      {rules.carriesDiscount ? (
                        <input
                          aria-label={`${t('sales.dto', 'Dto %')} ${line.article}`}
                          value={line.discount}
                          onChange={(event) => changeLine(line.key, { discount: event.target.value })}
                          className="ml-2 w-14 rounded-lg border border-line bg-card px-2 py-1 text-right font-mono text-xs text-ink outline-none"
                        />
                      ) : null}
                      {rules.carriesTax ? (
                        <span className="ml-2 w-24 shrink-0">
                          <Select
                            compact
                            aria-label={t('sales.iva', '% IVA')}
                            value={line.iva}
                            onChange={(event) => changeLine(line.key, { iva: event.target.value })}
                          >
                            {ivaOptions(taxRates.data ?? [], line.iva).map((option) => (
                              <option key={option} value={option}>
                                {option}%
                              </option>
                            ))}
                          </Select>
                        </span>
                      ) : null}
                      {rules.showsPriceWithTax ? (
                        <>
                          <span className="w-28 text-right font-mono text-sm font-bold text-slate-900">
                            {formatCents(math.base, currency)}
                          </span>
                          <span className="w-28 text-right font-mono text-sm font-bold text-brand-600">
                            {formatCents(math.total, currency)}
                          </span>
                        </>
                      ) : (
                        <span className="w-24 text-right font-mono text-sm font-bold text-slate-900">
                          {formatCents(math.total, currency)}
                        </span>
                      )}
                      <Tooltip content={t('common.delete', 'Delete')} align="end">
                        <button
                          type="button"
                          aria-label={`${t('common.delete', 'Delete')} ${line.article}`}
                          onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                          className="flex w-10 cursor-pointer justify-center text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-t border-slate-100 pt-4 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-[0.06em] text-slate-700 uppercase">
                {t('sales.notes', 'Notes')}
              </span>
              <Link to="/app/printables" className="text-[11px] font-semibold text-brand-600 hover:underline">
                {t('sales.notesEdit', 'Edit in Printables')}
              </Link>
            </span>
            <div className="min-h-[76px] rounded-xl border border-line bg-page px-3 py-2.5">
              {noteText ? (
                <p className="m-0 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">{noteText}</p>
              ) : (
                <p className="m-0 text-xs leading-relaxed text-slate-400">
                  {printTemplates.isPending
                    ? t('common.loading', 'Loading')
                    : t('sales.notesNone', 'No note set for this document type. Add one in Printables.')}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-page p-6 lg:col-span-5">
            <h4 className="border-b border-slate-200 pb-2 text-xs font-bold tracking-[0.06em] text-slate-900 uppercase">
              {t('sales.settlement', 'Settlement')}
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex justify-between text-slate-600">
                <span>
                  {rules.carriesTax && !discountOpen ? t('sales.base', 'Taxable base') : t('sales.subtotal', 'Subtotal')}
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCents(discountOpen ? totals.gross : totals.base, currency)}
                </span>
              </span>
              {rules.carriesDiscount ? (
                <DiscountEditor
                  open={discountOpen}
                  kind={discountKind}
                  value={discountInput}
                  appliedCents={discountError ? 0 : totals.discount}
                  currency={currency}
                  error={discountError}
                  onOpen={() => setDiscountOpen(true)}
                  onClear={() => {
                    setDiscountOpen(false)
                    setDiscountInput('')
                  }}
                  onKind={setDiscountKind}
                  onValue={setDiscountInput}
                />
              ) : null}
              {discountOpen && rules.carriesTax ? (
                <span className="flex justify-between text-slate-600">
                  <span>{t('sales.base', 'Taxable base')}</span>
                  <span className="font-mono font-bold text-slate-800">{formatCents(totals.base, currency)}</span>
                </span>
              ) : null}
              {rules.carriesTax ? (
                <>
                  {totals.groups.map(([rate, group]) => (
                    <span key={rate} className="flex justify-between border-l-2 border-brand-500 pl-2 text-[11px] text-ink-muted">
                      <span>IVA {rate}% ({formatCents(group.base, currency)})</span>
                      <span className="font-mono text-slate-700">{formatCents(group.tax, currency)}</span>
                    </span>
                  ))}
                  <span className="flex justify-between text-slate-600">
                    <span>{t('sales.taxTotal', 'Tax')}</span>
                    <span className="font-mono font-bold text-slate-800">{formatCents(totals.tax, currency)}</span>
                  </span>
                  {rules.showsPriceWithTax ? (
                    <span className="flex justify-between text-slate-600">
                      <span>{t('sales.priceNet', 'Without tax')}</span>
                      <span className="font-mono font-bold text-slate-800">{formatCents(totals.base, currency)}</span>
                    </span>
                  ) : null}
                </>
              ) : null}
              {rules.allowsRecargo ? (
                <RecargoPicker
                  rates={recargoRates.data ?? []}
                  loading={recargoRates.isPending}
                  selectedId={recargo?.id ?? null}
                  onSelect={setRecargoId}
                  amountCents={recargoCents}
                  currency={currency}
                />
              ) : null}
              <span className="mt-1 flex items-baseline justify-between border-t-2 border-slate-200 pt-3">
                <span className="text-sm font-black text-slate-900">{t('sales.grandTotal', 'Total')}</span>
                <span className="font-mono text-2xl font-black text-brand-500">{formatCents(grandTotal, currency)}</span>
              </span>
            </div>
            <button
              type="button"
              disabled={save.isPending}
              onClick={submit}
              className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-brand-on shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {save.isPending
                ? editing
                  ? t('common.saving', 'Saving')
                  : t('sales.issuing', 'Issuing...')
                : issueLabel}
            </button>
          </div>
        </div>
      </div>

      {camera ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div role="dialog" aria-label={t('sales.camera', 'Scan code')} className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-base font-semibold">{t('sales.cameraTitle', 'Find by barcode')}</h3>
              <Tooltip content={t('common.close', 'Close')} align="end" side="bottom">
                <button type="button" aria-label={t('common.close', 'Close')} onClick={() => setCamera(false)} className="cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
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
              <button type="submit" className="cursor-pointer rounded-lg bg-brand-500 px-4 text-xs font-semibold text-brand-on">
                {t('sales.add', 'Add')}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <RecordPaymentModal
        open={methodOpen}
        loading={save.isPending}
        title={t('payments.issuePaidTitle', 'How was this paid?')}
        subtitle={t('payments.issuePaidSubtitle', 'The document will be issued as paid with this method.')}
        confirmLabel={issueLabel}
        onClose={() => setMethodOpen(false)}
        onConfirm={confirmMethod}
      />
    </div>
  )
}

export default InvoiceNew
