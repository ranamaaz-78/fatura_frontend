import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, CalendarX2, FileDown, ImageDown, FileText, MessageCircle, Pencil, Printer, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ConfettiBurst } from '../../components/ui/ConfettiBurst'
import { IconButton } from '../../components/ui/IconButton'
import { useToast } from '../../components/ui/Toast'
import { t, tp, intlLocale } from '../../i18n'
import { cn } from '../../lib/cn'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { cancelSaleReturn, convertSale, getSale, invoiceAlbaran, invoiceSettlement, returnSalePieces, settleSale, updateSalePayment, updateSaleSettlement, voidSale } from '../../services/sales'
import {
  isSaleConverted,
  isSaleExpired,
  isSaleVoided,
  quoteDaysLeft,
  saleDisplayStatus,
  type PaymentStatus,
  type SaleDisplayStatus,
  type SaleReturn,
  type SaleReturnInput,
  type SaleSettlement,
  type SaleType,
} from '../../types/sales'
import { docPermission, usePermissions } from '../../auth/permissions'
import { canVoidType, celebratesPayment, rulesFor, typeLabel } from './documentTypes'
import { ConvertQuoteModal } from './ConvertQuoteModal'
import { PrintSheet } from './printSheets'
import { RecordPaymentModal } from './RecordPaymentModal'
import { EditProformaSettlementModal } from './EditProformaSettlementModal'
import { InvoiceFromAlbaranModal } from './InvoiceFromAlbaranModal'
import { InvoiceFromPaymentModal } from './InvoiceFromPaymentModal'
import { ReturnProformaModal } from './ReturnProformaModal'
import { SettleProformaModal } from './SettleProformaModal'
import { VoidSaleModal } from './VoidSaleModal'
import { SendWhatsAppModal } from './SendWhatsAppModal'

function paymentClass(status: SaleDisplayStatus): string {
  if (status === 'voided') return 'bg-rose-50 text-rose-700 border border-rose-200'
  if (status === 'returned') return 'bg-slate-100 text-slate-700 border border-slate-200'
  if (status === 'partial') return 'bg-sky-50 text-sky-800 border border-sky-200'
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200'
}

function paymentLabel(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'returned') return t('sales.returned', 'Returned')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

function InvoiceDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const currency = session?.company?.currency ?? 'EUR'
  const company = session?.company
  const documentId = Number(id)
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [invoicing, setInvoicing] = useState<SaleSettlement | null>(null)
  const [albaranInvoiceOpen, setAlbaranInvoiceOpen] = useState(false)
  const [cancelling, setCancelling] = useState<SaleReturn | null>(null)
  const [editingSettlement, setEditingSettlement] = useState<SaleSettlement | null>(null)
  const [voidOpen, setVoidOpen] = useState(false)
  const [whatsAppOpen, setWhatsAppOpen] = useState(false)
  const [convertTarget, setConvertTarget] = useState<SaleType | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [celebrateKey, setCelebrateKey] = useState(0)

  const startCelebrate = useCallback(() => {
    setCelebrateKey((key) => key + 1)
    setCelebrate(true)
  }, [])

  const query = useQuery({
    queryKey: ['app', 'sale', documentId],
    queryFn: () => getSale(documentId),
    enabled: Number.isFinite(documentId),
  })

  useEffect(() => {
    const state = location.state as { celebrate?: boolean } | null
    if (!state?.celebrate) return
    startCelebrate()
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate, startCelebrate])

  const printAsked = useRef<number | null>(null)
  useEffect(() => {
    const state = location.state as { print?: boolean } | null
    if (!state?.print || !query.data || printAsked.current === documentId) return
    printAsked.current = documentId
    const path = location.pathname
    // Give the sheet a moment to draw before the print dialog freezes the page.
    window.setTimeout(() => {
      if (window.location.pathname === path) window.print()
    }, 700)
    navigate(path, { replace: true, state: {} })
  }, [documentId, location.pathname, location.state, navigate, query.data])

  useEffect(() => {
    const document = query.data
    // A quotation hands over to the document made from it. A delivery note stays itself, with a link to its invoice.
    if (!document || document.type !== 'quotation' || !isSaleConverted(document) || !document.converted_to) return
    navigate(`${rulesFor(document.converted_to.type).listPath}/${document.converted_to.id}`, { replace: true })
  }, [navigate, query.data])

  const payment = useMutation({
    mutationFn: ({ status, methodId }: { status: PaymentStatus; methodId?: number }) =>
      updateSalePayment(documentId, status, methodId),
    onSuccess: (document) => {
      setMethodOpen(false)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      if (celebratesPayment(document.type) && document.payment_status === 'paid' && !isSaleVoided(document)) {
        startCelebrate()
      }
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const settling = useMutation({
    mutationFn: (input: { payment_method_id: number; lines: { line_id: number; quantity: number; unit_price: number }[] }) =>
      settleSale(documentId, input),
    onSuccess: (document) => {
      setSettleOpen(false)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      startCelebrate()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const returning = useMutation({
    mutationFn: (input: SaleReturnInput) => returnSalePieces(documentId, input),
    onSuccess: (document) => {
      setReturnOpen(false)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      push({ tone: 'success', title: t('sales.returnDone', 'Return recorded. The pieces are back in stock.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const makeInvoice = useMutation({
    mutationFn: (input: { settlementId: number; iva: Record<number, number>; recargoRateId: number | null }) =>
      invoiceSettlement(documentId, input.settlementId, { iva: input.iva, recargo_rate_id: input.recargoRateId }),
    onSuccess: (invoice) => {
      setInvoicing(null)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sale', documentId] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      push({ tone: 'success', title: t('sales.invoiceFromPaymentDone', 'Invoice {number} created.', { number: invoice.number }) })
      navigate(`/app/invoices/${invoice.id}`, { state: { print: true } })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const invoiceFromAlbaran = useMutation({
    mutationFn: (input: { iva: Record<number, number>; recargoRateId: number | null }) =>
      invoiceAlbaran(documentId, { iva: input.iva, recargo_rate_id: input.recargoRateId }),
    onSuccess: (invoice) => {
      setAlbaranInvoiceOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sale', documentId] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      push({ tone: 'success', title: t('sales.invoiceFromAlbaranDone', 'Invoice {number} created.', { number: invoice.number }) })
      navigate(`/app/invoices/${invoice.id}`, { state: { print: true } })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const cancelReturn = useMutation({
    mutationFn: (returnId: number) => cancelSaleReturn(documentId, returnId),
    onSuccess: (document) => {
      setCancelling(null)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
    },
    onError: (error) => {
      setCancelling(null)
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const editingQty = useMutation({
    mutationFn: (input: { settlementId: number; lines: { line_id: number; quantity: number }[] }) =>
      updateSaleSettlement(documentId, input.settlementId, { lines: input.lines }),
    onSuccess: (document) => {
      setEditingSettlement(null)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'dashboard'] })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const voiding = useMutation({
    mutationFn: (reason: string) => voidSale(documentId, reason),
    onSuccess: (document) => {
      setVoidOpen(false)
      queryClient.setQueryData(['app', 'sale', documentId], document)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const converting = useMutation({
    mutationFn: ({
      target,
      status,
      methodId,
    }: {
      target: 'factura' | 'albaran'
      status: PaymentStatus
      methodId?: number
    }) => convertSale(documentId, target, status, methodId),
    onSuccess: (document) => {
      setConvertTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['app', 'sales'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      navigate(`${rulesFor(document.type).listPath}/${document.id}`, {
        state:
          celebratesPayment(document.type) && document.payment_status === 'paid' ? { celebrate: true } : undefined,
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const document = query.data

  if (query.isPending || !document) {
    return <div className="h-64 animate-pulse rounded-2xl bg-page" />
  }

  const issued = new Date(document.issued_at)
  const rules = rulesFor(document.type)
  const display = saleDisplayStatus(document)
  const voided = isSaleVoided(document)
  const canVoid = canVoidType(document.type) && document.payment_status === 'paid' && !voided && can(docPermission(document.type, 'void'))
  // Only a quotation can still be edited; every other document is paid, returned or voided, not changed.
  const canUpdate = can(docPermission(document.type, 'update'))
  const canPay = can(docPermission(document.type, 'pay'))
  const quoteExpired = document.type === 'quotation' && !isSaleConverted(document) && isSaleExpired(document)
  const openQuote = document.type === 'quotation' && !isSaleConverted(document) && !quoteExpired
  const quoteDays = openQuote && document.expires_at ? quoteDaysLeft(document.expires_at) : null
  const canSettle = rules.settlesLines && document.payment_status !== 'paid' && canPay
  const settlements = document.settlements ?? []
  const returns = document.returns ?? []

  return (
    <div className="flex flex-col gap-6 print:contents">
      <ConfettiBurst key={celebrateKey} play={celebrate} onDone={() => setCelebrate(false)} />
      <div className="no-print flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-5 shadow-xs lg:flex-row lg:items-center">
        <div>
          <Link to={rules.listPath} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" />
            {typeLabel(document.type)}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">{document.number}</h1>
            {rules.settlesPayment || rules.settlesLines || voided ? (
              <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold', paymentClass(display))}>
                {paymentLabel(display)}
              </span>
            ) : null}
            {!voided && document.payment_status === 'paid' && document.payment_method ? (
              <span className="rounded-full bg-brand-50 px-3 py-0.5 text-xs font-semibold text-brand-600">
                {document.payment_method.name}
              </span>
            ) : null}
            {quoteExpired ? (
              <span className="rounded-full bg-rose-50 px-3 py-0.5 text-xs font-semibold text-rose-700 app-dark:bg-rose-500/15 app-dark:text-rose-300">
                {t('sales.expired', 'Expired')}
              </span>
            ) : null}
            <span className="text-xs text-slate-500">
              {issued.toLocaleString(intlLocale())} · {document.client_name}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-700"
          >
            <Printer className="h-4 w-4" />
            {t('sales.print', 'Print')}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => {
              setExporting('pdf')
              void downloadSaleDocumentSheet(document, company ?? null, currency, 'pdf')
                .catch((error) => push({ tone: 'danger', title: getErrorMessage(error) }))
                .finally(() => setExporting(null))
            }}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {exporting === 'pdf'
              ? t('sales.savingPdf', 'Saving PDF...')
              : t('sales.downloadPdf', 'Download PDF')}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => {
              setExporting('png')
              void downloadSaleDocumentSheet(document, company ?? null, currency, 'png')
                .catch((error) => push({ tone: 'danger', title: getErrorMessage(error) }))
                .finally(() => setExporting(null))
            }}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            <ImageDown className="h-4 w-4" />
            {exporting === 'png'
              ? t('sales.savingImage', 'Saving image...')
              : t('sales.downloadImage', 'Download as image')}
          </button>
          <button
            type="button"
            onClick={() => setWhatsAppOpen(true)}
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            {t('whatsapp.sendBtn', 'WhatsApp')}
          </button>
          {openQuote ? (
            <>
              {canUpdate ? (
              <Link
                to={`/app/quotes/${document.id}/edit`}
                className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-700"
              >
                {t('common.edit', 'Edit')}
              </Link>
              ) : null}
              {can('invoices.create') ? (
              <button
                type="button"
                disabled={converting.isPending}
                onClick={() => setConvertTarget('factura')}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on disabled:opacity-60"
              >
                {t('sales.convertInvoice', 'Convert to invoice')}
              </button>
              ) : null}
              {can('delivery_notes.create') ? (
              <button
                type="button"
                disabled={converting.isPending}
                onClick={() => setConvertTarget('albaran')}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-brand-600 bg-card px-4 text-xs font-semibold text-brand-600 disabled:opacity-60"
              >
                {t('sales.convertAlbaran', 'Convert to delivery note')}
              </button>
              ) : null}
            </>
          ) : null}
          {document.can_invoice && can('invoices.create') ? (
            <button
              type="button"
              disabled={invoiceFromAlbaran.isPending}
              onClick={() => setAlbaranInvoiceOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on disabled:opacity-60"
            >
              {t('sales.convertInvoice', 'Convert to invoice')}
            </button>
          ) : null}
          {canVoid ? (
            <button
              type="button"
              disabled={voiding.isPending}
              onClick={() => setVoidOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white disabled:opacity-60"
            >
              {t('sales.void', 'Void')}
            </button>
          ) : null}
          {canSettle ? (
            <button
              type="button"
              disabled={settling.isPending}
              onClick={() => setSettleOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on disabled:opacity-60"
            >
              {settling.isPending
                ? t('sales.savingPayment', 'Saving...')
                : t('sales.recordPayment', 'Record payment')}
            </button>
          ) : null}
          {canSettle && !voided ? (
            <button
              type="button"
              disabled={returning.isPending}
              onClick={() => setReturnOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-card px-4 text-xs font-semibold text-ink hover:bg-page disabled:opacity-60"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t('sales.returnPieces', 'Return pieces')}
            </button>
          ) : null}
          {rules.settlesPayment && !voided && document.payment_status !== 'paid' && canPay ? (
            <button
              type="button"
              disabled={payment.isPending}
              onClick={() => setMethodOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on disabled:opacity-60"
            >
              {payment.isPending
                ? t('sales.savingPayment', 'Saving...')
                : t('sales.recordPayment', 'Record payment')}
            </button>
          ) : null}
        </div>
      </div>

      {quoteExpired && document.expires_at ? (
        <div className="no-print flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 app-dark:border-rose-500/30 app-dark:bg-rose-500/10">
          <CalendarX2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {t('sales.quoteExpiredTitle', 'This quotation expired on')} {formatDate(document.expires_at)}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              {t(
                'sales.quoteExpiredBody',
                'A quotation is open for one week. It can no longer be edited or turned into an invoice or delivery note, but you can still view, print and send it. Make a new quotation if the customer is still interested.',
              )}
            </p>
          </div>
          <Link
            to="/app/invoices/new?type=quotation"
            className="inline-flex h-9 shrink-0 items-center rounded-xl bg-brand-600 px-3.5 text-xs font-semibold text-brand-on"
          >
            {t('sales.newQuotation', 'New quotation')}
          </Link>
        </div>
      ) : null}

      {quoteDays !== null && document.expires_at ? (
        <div
          className={cn(
            'no-print flex items-center gap-3 rounded-2xl border px-5 py-3.5',
            quoteDays <= 2
              ? 'border-amber-200 bg-amber-50 app-dark:border-amber-500/30 app-dark:bg-amber-500/10'
              : 'border-line/80 bg-card shadow-xs',
          )}
        >
          <CalendarClock className={cn('h-5 w-5 shrink-0', quoteDays <= 2 ? 'text-amber-600' : 'text-brand-600')} />
          <p className="text-sm text-slate-700">
            {t('sales.validUntil', 'Valid until')} <strong className="text-slate-900">{formatDate(document.expires_at)}</strong>
            {' · '}
            {quoteDays <= 0
              ? t('sales.lastDay', 'last day to edit or convert')
              : `${quoteDays} ${quoteDays === 1 ? t('sales.dayLeft', 'day left') : t('sales.daysLeft', 'days left')}`}
          </p>
        </div>
      ) : null}

      {settlements.length > 0 ? (
        <div className="no-print rounded-2xl border border-line/80 bg-card px-5 py-4 shadow-xs">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
            {t('sales.settlements', 'Settlements')}
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {settlements.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">
                    {row.payment_method?.name ?? t('sales.payment', 'Payment')}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(row.created_at).toLocaleString(intlLocale())}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {formatCents(row.total_cents, currency)}
                  </span>
                  {rules.settlesLines && row.invoice && !row.invoice.is_voided ? (
                    <Link
                      to={`/app/invoices/${row.invoice.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {row.invoice.number}
                    </Link>
                  ) : rules.settlesLines && can('invoices.create') ? (
                    <button
                      type="button"
                      disabled={makeInvoice.isPending}
                      onClick={() => setInvoicing(row)}
                      className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-2.5 text-[11px] font-semibold text-ink hover:bg-page disabled:opacity-60"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t('sales.invoiceFromPayment', 'Create invoice')}
                    </button>
                  ) : null}
                  {rules.settlesLines && canPay && !(row.invoice && !row.invoice.is_voided) ? (
                    <IconButton
                      label={t('sales.editQuantity', 'Edit quantity')}
                      tooltipAlign="end"
                      disabled={editingQty.isPending}
                      onClick={() => setEditingSettlement(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {document.from_document ? (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-line/80 bg-card px-5 py-3 text-sm text-ink-muted shadow-xs">
          <FileText className="h-4 w-4" />
          {t('sales.fromAlbaran', 'Made from delivery note')}
          <Link to={`/app/delivery-notes/${document.from_document.id}`} className="font-semibold text-brand-600">
            {document.from_document.number}
          </Link>
          <span className="text-xs">{t('sales.fromAlbaranNote', '· stock was already taken out by the delivery note')}</span>
        </div>
      ) : null}

      {document.type === 'albaran' && document.converted_to && !document.can_invoice ? (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-line/80 bg-card px-5 py-3 text-sm text-ink-muted shadow-xs">
          <FileText className="h-4 w-4" />
          {t('sales.albaranInvoiced', 'Invoiced as')}
          <Link to={`/app/invoices/${document.converted_to.id}`} className="font-semibold text-brand-600">
            {document.converted_to.number}
          </Link>
        </div>
      ) : null}

      {document.from_proforma ? (
        <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-line/80 bg-card px-5 py-3 text-sm text-ink-muted shadow-xs">
          <FileText className="h-4 w-4" />
          {t('sales.fromProforma', 'Made from a payment on proforma')}
          <Link to={`/app/proformas/${document.from_proforma.id}`} className="font-semibold text-brand-600">
            {document.from_proforma.number}
          </Link>
          <span className="text-xs">{t('sales.fromProformaNote', '· stock was already taken out by the proforma')}</span>
        </div>
      ) : null}

      {returns.length > 0 ? (
        <div className="no-print rounded-2xl border border-line/80 bg-card px-5 py-4 shadow-xs">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
            {t('sales.returns', 'Returns')}
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {returns.map((row) => {
              const pieces = (row.lines ?? []).reduce((sum, line) => sum + line.quantity, 0)
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">
                      {tp('sales.returnPieceCount', '{count} piece returned|{count} pieces returned', pieces)}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {new Date(row.created_at).toLocaleString(intlLocale())}
                    </span>
                    {row.note ? <span className="block truncate text-xs text-slate-500">{row.note}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-bold text-slate-900">{formatCents(row.total_cents, currency)}</span>
                    {canPay ? (
                    <IconButton
                      label={t('sales.returnCancel', 'Cancel return')}
                      tooltipAlign="end"
                      disabled={cancelReturn.isPending}
                      onClick={() => setCancelling(row)}
                    >
                      <Undo2 className="h-4 w-4" />
                    </IconButton>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {voided && document.void_reason ? (
        <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-900">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-rose-700 uppercase">
            {t('sales.voidReason', 'Reason')}
          </p>
          <p className="mt-1">{document.void_reason}</p>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto print:contents">
        <PrintSheet document={document} company={company ?? null} currency={currency} />
      </div>

      <RecordPaymentModal
        open={methodOpen}
        loading={payment.isPending}
        onClose={() => setMethodOpen(false)}
        onConfirm={(methodId) => payment.mutate({ status: 'paid', methodId })}
      />
      <SettleProformaModal
        open={settleOpen}
        loading={settling.isPending}
        lines={document.lines ?? []}
        currency={currency}
        onClose={() => setSettleOpen(false)}
        onConfirm={(input) => settling.mutate(input)}
      />
      <InvoiceFromPaymentModal
        open={invoicing !== null}
        loading={makeInvoice.isPending}
        settlement={invoicing}
        lines={document.lines ?? []}
        currency={currency}
        onClose={() => setInvoicing(null)}
        onConfirm={(iva, recargoRateId) => {
          if (invoicing !== null) makeInvoice.mutate({ settlementId: invoicing.id, iva, recargoRateId })
        }}
      />
      <InvoiceFromAlbaranModal
        open={albaranInvoiceOpen}
        loading={invoiceFromAlbaran.isPending}
        lines={document.lines ?? []}
        currency={currency}
        onClose={() => setAlbaranInvoiceOpen(false)}
        onConfirm={(iva, recargoRateId) => invoiceFromAlbaran.mutate({ iva, recargoRateId })}
      />
      <ReturnProformaModal
        open={returnOpen}
        loading={returning.isPending}
        lines={document.lines ?? []}
        currency={currency}
        onClose={() => setReturnOpen(false)}
        onConfirm={(input) => returning.mutate(input)}
      />
      <ConfirmDialog
        open={cancelling !== null}
        loading={cancelReturn.isPending}
        tone="warning"
        title={t('sales.returnCancelTitle', 'Cancel this return?')}
        description={t('sales.returnCancelBody', 'The pieces leave stock again and count as owed on this proforma.')}
        confirmLabel={t('sales.returnCancel', 'Cancel return')}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling !== null) cancelReturn.mutate(cancelling.id)
        }}
      />
      <EditProformaSettlementModal
        open={editingSettlement !== null}
        loading={editingQty.isPending}
        settlement={editingSettlement}
        lines={document.lines ?? []}
        currency={currency}
        onClose={() => setEditingSettlement(null)}
        onConfirm={(lines) => {
          if (editingSettlement === null) return
          editingQty.mutate({ settlementId: editingSettlement.id, lines })
        }}
      />
      <VoidSaleModal
        open={voidOpen}
        loading={voiding.isPending}
        onClose={() => setVoidOpen(false)}
        onConfirm={(reason) => voiding.mutate(reason)}
      />
      <ConvertQuoteModal
        open={convertTarget !== null}
        loading={converting.isPending}
        target={convertTarget}
        onClose={() => setConvertTarget(null)}
        onPending={() => {
          if (convertTarget !== 'factura' && convertTarget !== 'albaran') return
          converting.mutate({ target: convertTarget, status: 'pending' })
        }}
        onPaid={(methodId) => {
          if (convertTarget !== 'factura' && convertTarget !== 'albaran') return
          converting.mutate({ target: convertTarget, status: 'paid', methodId })
        }}
      />
      <SendWhatsAppModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        document={document}
        company={company ?? null}
        currency={currency}
      />
    </div>
  )
}

export default InvoiceDetail
