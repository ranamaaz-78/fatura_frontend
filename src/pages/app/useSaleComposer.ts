import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { docPermission, usePermissions } from '../../auth/permissions'
import { useResultNav } from '../../lib/useResultNav'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { nowLocal, snapIssueDate, withOffset } from '../../lib/issueDate'
import { allocateDiscount, centsToInput, lineTotals, parseAmountToCents, parseNumber } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { listAllProducts, listRecargoRates, listTaxRates } from '../../services/catalog'
import { getPrintTemplates, loadLogoBlob } from '../../services/printables'
import { createSale, getSale, issueDraft, listActiveCustomers, previewSale, updateSale } from '../../services/sales'
import type { Product } from '../../types/catalog'
import type { Customer, DiscountType, IssuableType, PaymentStatus, SaleDocument, SaleInput } from '../../types/sales'
import { isSaleConverted, isSaleExpired } from '../../types/sales'
import { ISSUABLE_TYPES, celebratesPayment, isIssuable, rulesFor, typeLabel } from './documentTypes'

export type DraftLine = {
  key: string
  product_id: number | null
  article: string
  /** The product's barcode, shown under the article on the line. */
  barcode: string
  description: string
  quantity: number
  unitPrice: string
  discount: string
  iva: string
  stock: number | null
}

export function ivaOptions(rates: { rate: number }[], current: string): string[] {
  const values = rates.map((rate) => String(rate.rate))
  if (current !== '' && !values.includes(current)) values.unshift(current)
  return values
}

export const QUOTE_VALID_DAYS = 7

/** What the counter (POS) starts on when no document kind is asked for: a delivery note. */
const DEFAULT_TYPE: IssuableType = 'albaran'

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return nowLocal()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `held`: pieces of each product this very document already holds, which are available to it again while it is edited. */
function linesFromDocument(document: SaleDocument, products: Product[], held: Record<number, number> = {}): DraftLine[] {
  return (document.lines ?? []).map((line) => {
    const product = line.product_id === null ? undefined : products.find((row) => row.id === line.product_id)
    return {
      key: crypto.randomUUID(),
      product_id: line.product_id,
      article: line.article,
      barcode: product?.barcode ?? line.barcode ?? '',
      description: line.description ?? '',
      quantity: line.quantity,
      unitPrice: centsToInput(line.unit_price),
      discount: String(line.discount_percent),
      iva: String(line.iva_percent),
      stock: product ? product.quantity + (held[product.id] ?? 0) : null,
    }
  })
}

/**
 * What a typed or scanned code is for a new product: a run of digits (6 or more) is a barcode, any other single word is a
 * short code. Text with spaces is a name search, so nothing is prefilled from it.
 */
export function codeFromQuery(query: string): { barcode?: string; short_code?: string } {
  const code = query.trim()
  if (code === '' || /\s/.test(code)) return {}
  return /^\d{6,}$/.test(code) ? { barcode: code } : { short_code: code }
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? 'F').slice(0, 2)
  return letters.toUpperCase()
}


function digits(value: string): string {
  return value.replace(/[\s-]+/g, '')
}

/** A name as it is searched: lower case, accents off, so "garcia" finds "García". */
function plain(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export function productRank(product: Product, query: string): number {
  const barcode = product.barcode.toLowerCase()
  const article = product.article.toLowerCase()
  const brand = (product.brand ?? '').toLowerCase()
  const shortCode = (product.short_code ?? '').toLowerCase()
  // A scanned barcode or a typed short code that is exactly the product's comes first.
  if (barcode === query || (shortCode !== '' && shortCode === query)) return 0
  if (barcode.startsWith(query) || article.startsWith(query) || (shortCode !== '' && shortCode.startsWith(query))) return 1
  if (article.includes(query) || barcode.includes(query) || brand.includes(query) || (shortCode !== '' && shortCode.includes(query))) return 2
  return 99
}

/**
 * Everything the new-sale screen (the POS) does: the kind of document, the client, the lines, the discount and recargo,
 * the totals, and issuing or saving it. The website's InvoiceNew and the Windows app's counter screen both draw from
 * it, so a sale is made exactly the same way on both.
 */
export function useSaleComposer(fixedType?: IssuableType) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const { push } = useToast()
  const [params] = useSearchParams()
  const currency = session?.company?.currency ?? 'EUR'
  const company = session?.company
  const editingId = Number(id)
  const editing = Number.isFinite(editingId)

  const { can } = usePermissions()
  const requested = params.get('type')
  // A screen made for one kind (the delivery receipt's own page) passes it here, and the kind cannot be switched.
  const [type, setType] = useState<IssuableType>(fixedType ?? (editing ? 'quotation' : isIssuable(requested) ? requested : DEFAULT_TYPE))
  const [hydrated, setHydrated] = useState(false)
  const [recargoRestored, setRecargoRestored] = useState(false)
  // Editing a delivery note: what it already took out of stock (it is put back when saved), so it can keep those pieces.
  const [held, setHeld] = useState<Record<number, number>>({})
  const rules = rulesFor(type)
  const [issuedAt, setIssuedAt] = useState(nowLocal)
  // Invoices, delivery notes and proformas are dated by month (see lib/issueDate); a quotation is free.
  const datedByMonth = type !== 'quotation'
  // Switching from a quotation (any date) to another kind brings a date it cannot have back to the nearest allowed one.
  useEffect(() => {
    if (datedByMonth) setIssuedAt((current) => snapIssueDate(current))
  }, [datedByMonth])
  // A quotation stays open for a week from the date written on it; the server applies the same rule.
  const quoteEnd = (() => {
    const start = new Date(issuedAt)
    if (Number.isNaN(start.getTime())) return null
    const end = new Date(start)
    end.setDate(end.getDate() + QUOTE_VALID_DAYS)
    end.setHours(23, 59, 59, 999)
    return end
  })()
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
  const [clientAddress, setClientAddress] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const [productQuery, setProductQuery] = useState('')
  // The "Add product" window opened from the counter, and what it starts with (the code that was not found).
  const [newProduct, setNewProduct] = useState<{ barcode?: string; short_code?: string } | null>(null)
  const [dropdown, setDropdown] = useState(false)
  const [camera, setCamera] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])

  // The note on a document comes from Printables. A new document is stamped with the one for its
  // type when it is issued; a saved quotation shows the note it was issued with.
  const printTemplates = useQuery({ queryKey: ['app', 'print-templates'], queryFn: getPrintTemplates })

  // The uploaded company logo (trimmed, same cache as the printables) stands in for the initials.
  const logoUrl = company?.logo_url ?? printTemplates.data?.logo_url ?? null
  const companyLogo = useQuery({
    queryKey: ['app', 'print-logo', logoUrl],
    queryFn: () => loadLogoBlob(logoUrl),
    enabled: Boolean(logoUrl),
  })


  // Each list opens this screen with its own ?type=, and the route is shared,
  // so the screen is not remounted when one list sends us to another.
  useEffect(() => {
    // Editing: the document being edited decides the type (it is set once the document has loaded).
    if (editing) return
    if (fixedType) {
      setType(fixedType)
      return
    }
    if (isIssuable(requested) && can(docPermission(requested, 'create'))) {
      setType(requested)
      return
    }
    // Nothing asked for (the counter opened from the menu): a delivery note, when this person may issue one;
    // otherwise the first kind of document they may issue.
    const allowed = [DEFAULT_TYPE, ...ISSUABLE_TYPES].find((option) => can(docPermission(option, 'create')))
    if (allowed) setType(allowed)
  }, [editing, requested, can, fixedType])

  const existing = useQuery({
    queryKey: ['app', 'sale', editingId],
    queryFn: () => getSale(editingId),
    enabled: editing,
  })

  const preview = useQuery({
    // The number carries the month, so it follows the month of the date (F-202610/... or F-202609/...).
    queryKey: ['app', 'sales', 'preview', type, issuedAt.slice(0, 7)],
    queryFn: () => previewSale(type, withOffset(issuedAt)),
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
    [clientPhone, clientName, clientCompany, clientNif, clientAddress, clientEmail].some((value) => value.trim() !== '')

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

  // The same saved clients, found by their name or their company's name as it is typed in the Name field.
  const nameNeedle = plain(clientName)
  const nameMatches = useMemo(() => {
    if (nameNeedle.length < 2) return []
    const rank = (customer: Customer) => {
      const name = plain(customer.name)
      const company = plain(customer.company_name ?? '')
      if (name === nameNeedle || company === nameNeedle) return 0
      if (name.startsWith(nameNeedle) || company.startsWith(nameNeedle)) return 1
      // A word inside the name: "lopez" finds "Ana López".
      if (name.split(/\s+/).some((word) => word.startsWith(nameNeedle))) return 2
      if (name.includes(nameNeedle) || company.includes(nameNeedle)) return 3
      return 99
    }
    return (customers.data ?? [])
      .map((customer) => ({ customer, rank: rank(customer) }))
      .filter((row) => row.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.customer.name.localeCompare(b.customer.name))
      .slice(0, 8)
      .map((row) => row.customer)
  }, [customers.data, nameNeedle])

  const productMatches = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (query === '') return []
    return (catalog.data ?? [])
      .map((product) => ({ product, rank: productRank(product, query) }))
      .filter((row) => row.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.product.article.localeCompare(b.product.article))
      .slice(0, 40)
      .map((row) => row.product)
  }, [catalog.data, productQuery])

  // Up and Down walk the results; Enter takes the highlighted one.
  const matchNav = useResultNav(productMatches.length, productQuery)
  // The saved-client lists (by phone and by name) move the same way: arrow keys and the mouse change the highlighted row.
  const phoneNav = useResultNav(phoneMatches.length, phoneNeedle)
  const nameNav = useResultNav(nameMatches.length, nameNeedle)

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
    if (document.type === 'quotation') {
      if (isSaleConverted(document) && document.converted_to) {
        navigate(`${rulesFor(document.converted_to.type).listPath}/${document.converted_to.id}`, { replace: true })
        return
      }
      if (isSaleExpired(document)) {
        push({ tone: 'danger', title: t('sales.quoteExpiredEdit', 'This quotation has expired and can no longer be edited.') })
        navigate(`${rulesFor('quotation').listPath}/${document.id}`, { replace: true })
        return
      }
    } else if (!(document.type === 'albaran' || (document.type === 'factura' && document.is_draft)) || document.can_edit === false) {
      // Only a quotation, an unpaid delivery note or a draft invoice can be opened for editing.
      push({
        tone: 'danger',
        title:
          document.type === 'albaran'
            ? t('sales.deliveryNotNotEditable', 'This delivery note can no longer be edited: it is paid, voided or already invoiced.')
            : document.is_draft
              ? t('sales.draftNotEditable', 'This draft was deleted and can no longer be edited.')
              : t('sales.notEditable', 'This document cannot be edited.'),
      })
      navigate(`${rulesFor(document.type).listPath}/${document.id}`, { replace: true })
      return
    }
    setType(document.type as IssuableType)
    const heldNow: Record<number, number> = {}
    if (document.type === 'albaran') {
      for (const line of document.lines ?? []) {
        if (line.product_id !== null) heldNow[line.product_id] = (heldNow[line.product_id] ?? 0) + line.quantity
      }
      setHeld(heldNow)
    }
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
    setClientAddress(document.client_address ?? '')
    setClientEmail(document.client_email ?? '')
    setLines(linesFromDocument(document, catalog.data ?? [], heldNow))
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

  // Editing a draft invoice: it is saved again as a draft, or issued (the stock is checked and taken then).
  const editingDraft = editing && existing.data?.is_draft === true

  const openDocument = (document: SaleDocument) => navigate(`${rulesFor(document.type).listPath}/${document.id}`)

  const draftSave = useMutation({
    mutationFn: (input: SaleInput) =>
      editing ? updateSale(editingId, input) : createSale({ ...input, draft: true, payment_status: 'pending', payment_method_id: null }),
    onSuccess: (document) => {
      push({ tone: 'success', title: t('sales.draftSaved', 'Saved as a draft. Its number is kept; the stock is taken when you issue it.') })
      openDocument(document)
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const draftIssue = useMutation({
    mutationFn: async ({ input, status, methodId }: { input: SaleInput; status: PaymentStatus; methodId?: number | null }) => {
      // The lines as they are on screen first, then the issue (which checks the stock).
      await updateSale(editingId, input)
      return issueDraft(editingId, status, methodId)
    },
    onSuccess: (document) => {
      setMethodOpen(false)
      navigate(`${rulesFor(document.type).listPath}/${document.id}`, {
        state: document.payment_status === 'paid' ? { celebrate: true } : undefined,
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  /** Keeps the invoice as a draft: the number is held, no stock moves. */
  function saveDraft() {
    if (draftSave.isPending || draftIssue.isPending || save.isPending) return
    const payload = buildPayload()
    if (payload) draftSave.mutate(payload)
  }

  const save = useMutation({
    mutationFn: (input: SaleInput) => (editing ? updateSale(editingId, input) : createSale(input)),
    onSuccess: (document) => {
      setMethodOpen(false)

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
    setClientAddress(customer.address ?? '')
    setClientEmail(customer.email ?? '')
  }

  function onPhoneChange(value: string) {
    setClientPhone(value)
    if (customerId !== null) setCustomerId(null)
  }

  function onPhoneKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (customerId !== null || phoneMatches.length === 0) return
    if (phoneNav.onNavKey(event)) return
    if (event.key !== 'Enter') return
    event.preventDefault()
    pickCustomer(phoneMatches[phoneNav.active] ?? phoneMatches[0]!)
  }

  function onNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (customerId !== null || nameMatches.length === 0) return
    if (nameNav.onNavKey(event)) return
    if (event.key !== 'Enter') return
    event.preventDefault()
    pickCustomer(nameMatches[nameNav.active] ?? nameMatches[0]!)
  }

  function openNewProduct() {
    setDropdown(false)
    setNewProduct(codeFromQuery(productQuery))
  }

  /** A product made at the counter goes straight onto the sale when it can be sold. */
  function onProductCreated(product: Product) {
    setNewProduct(null)
    if (rules.movesStock && product.quantity <= 0) {
      setProductQuery('')
      return
    }
    addProduct(product)
  }

  function onProductKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (matchNav.onNavKey(event)) return
    if (event.key !== 'Enter' || productMatches.length === 0) return
    event.preventDefault()
    addProduct(productMatches[matchNav.active] ?? productMatches[0]!)
  }

  function clearCustomer() {
    setCustomerId(null)
    setClientName('')
    setClientCompany('')
    setClientPhone('')
    setClientNif('')
    setClientAddress('')
    setClientEmail('')
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
              article: product.article,
              barcode: product.barcode ?? '',
              description: product.description ?? '',
              quantity: 1,
              // A proforma starts at the catalog price too; the agreed price is typed over it when it differs.
              unitPrice: centsToInput(product.selling_price),
              discount: '0',
              iva: String(product.iva_percent),
              stock: product.quantity + (held[product.id] ?? 0),
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

  /** How many pieces the shelf has for this line when it asks for more than that, or null when it is covered. */
  function lineShortage(line: DraftLine): number | null {
    if (line.product_id === null || line.stock === null || !rules.movesStock) return null
    // Several lines of one product share its stock.
    const asked = lines.filter((other) => other.product_id === line.product_id).reduce((sum, other) => sum + other.quantity, 0)
    return asked > line.stock ? Math.max(0, line.stock) : null
  }
  const hasShortage = lines.some((line) => lineShortage(line) !== null)

  function changeQuantity(line: DraftLine, next: number) {
    const capped = line.stock !== null && rules.movesStock ? Math.min(next, line.stock) : next
    if (capped < 1) return
    changeLine(line.key, { quantity: capped })
  }

  function buildPayload(): SaleInput | null {
    if (rules.hasClient && clientName.trim() === '') {
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
    if (rules.hasClient && customerId === null && typedPhone.length >= 3) {
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
      issued_at: withOffset(issuedAt),
      payment_status: rules.settlesPayment ? payment : 'pending',
      // A delivery receipt names nobody: no client is sent or saved.
      ...(rules.hasClient
        ? {
            customer_id: customerId,
            save_customer: customerId === null,
            client_name: clientName.trim(),
            client_company: clientCompany.trim() || null,
            client_phone: clientPhone.trim() || null,
            client_nif: clientNif.trim() || null,
            client_nie: null,
            client_address: clientAddress.trim() || null,
            client_email: clientEmail.trim() || null,
          }
        : {
            customer_id: null,
            save_customer: false,
            client_name: '',
            client_company: null,
            client_phone: null,
            client_nif: null,
            client_nie: null,
            client_address: null,
            client_email: null,
          }),
      discount_type: discountCents > 0 ? discountKind : null,
      discount_value:
        discountCents > 0 ? (discountKind === 'amount' ? Math.round(typedDiscount * 100) : typedDiscount) : null,
      recargo_rate_id: recargo ? recargo.id : null,
      lines: prepared,
    }
  }

  function submit() {
    if (save.isPending || draftIssue.isPending || draftSave.isPending) return
    const payload = buildPayload()
    if (!payload) return
    if (editingDraft) {
      // Issuing the draft: a paid one asks how it was paid first.
      if (payment === 'paid') {
        setMethodOpen(true)
        return
      }
      draftIssue.mutate({ input: payload, status: 'pending' })
      return
    }
    if (!editing && rules.settlesPayment && payment === 'paid') {
      setMethodOpen(true)
      return
    }
    save.mutate(payload)
  }

  function confirmMethod(methodId: number) {
    const payload = buildPayload()
    if (!payload) return
    if (editingDraft) {
      draftIssue.mutate({ input: payload, status: 'paid', methodId })
      return
    }
    save.mutate({ ...payload, payment_status: 'paid', payment_method_id: methodId })
  }

  const issueLabel = editing && !editingDraft
    ? type === 'albaran'
      ? t('sales.saveDeliveryNote', 'Save delivery note')
      : t('sales.saveQuote', 'Save quotation')
    : rules.movesStock
      ? t('sales.issueAndDeduct', 'Issue :type and deduct stock').replace(':type', typeLabel(type).toLowerCase())
      : t('sales.issueOnly', 'Issue :type').replace(':type', typeLabel(type).toLowerCase())

  return {
    editingDraft,
    draftSave,
    draftIssue,
    saveDraft,
    lineShortage,
    hasShortage,
    session,
    navigate,
    id,
    push,
    params,
    currency,
    company,
    editingId,
    editing,
    can,
    requested,
    type,
    setType,
    hydrated,
    setHydrated,
    recargoRestored,
    setRecargoRestored,
    held,
    setHeld,
    rules,
    issuedAt,
    setIssuedAt,
    datedByMonth,
    quoteEnd,
    payment,
    setPayment,
    methodOpen,
    setMethodOpen,
    recargoId,
    setRecargoId,
    discountOpen,
    setDiscountOpen,
    discountKind,
    setDiscountKind,
    discountInput,
    setDiscountInput,
    customerId,
    setCustomerId,
    clientName,
    setClientName,
    clientCompany,
    setClientCompany,
    clientPhone,
    setClientPhone,
    clientNif,
    setClientNif,
    clientAddress,
    setClientAddress,
    clientEmail,
    setClientEmail,
    productQuery,
    setProductQuery,
    dropdown,
    setDropdown,
    camera,
    setCamera,
    lines,
    setLines,
    printTemplates,
    logoUrl,
    companyLogo,
    existing,
    preview,
    customers,
    catalog,
    taxRates,
    recargoRates,
    selectedCustomer,
    hasClientData,
    phoneNeedle,
    phoneMatches,
    phoneActive: phoneNav.active,
    setPhoneActive: phoneNav.setActive,
    nameMatches,
    nameActive: nameNav.active,
    setNameActive: nameNav.setActive,
    productMatches,
    lineMath,
    grossBase,
    typedDiscount,
    discountCents,
    discountError,
    totals,
    recargo,
    recargoCents,
    grandTotal,
    noteText,
    save,
    pickCustomer,
    onPhoneChange,
    onPhoneKeyDown,
    onNameKeyDown,
    onProductKeyDown,
    activeMatch: matchNav.active,
    setActiveMatch: matchNav.setActive,
    newProduct,
    setNewProduct,
    openNewProduct,
    onProductCreated,
    clearCustomer,
    piecesLeft,
    addProduct,
    changeLine,
    changeQuantity,
    buildPayload,
    submit,
    confirmMethod,
    issueLabel,
  }
}

export type SaleComposer = ReturnType<typeof useSaleComposer>
