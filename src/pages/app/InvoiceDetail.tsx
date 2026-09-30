import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown, ImageDown, MessageCircle, Pencil, Printer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ConfettiBurst } from '../../components/ui/ConfettiBurst'
import { IconButton } from '../../components/ui/IconButton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { convertSale, getSale, settleSale, updateSalePayment, updateSaleSettlement, voidSale } from '../../services/sales'
import {
  isSaleConverted,
  isSaleVoided,
  saleDisplayStatus,
  type PaymentStatus,
  type SaleDisplayStatus,
  type SaleSettlement,
  type SaleType,
} from '../../types/sales'
import { canVoidType, celebratesPayment, rulesFor, typeLabel } from './documentTypes'
import { ConvertQuoteModal } from './ConvertQuoteModal'
import { PrintSheet } from './printSheets'
import { RecordPaymentModal } from './RecordPaymentModal'
import { EditProformaSettlementModal } from './EditProformaSettlementModal'
import { SettleProformaModal } from './SettleProformaModal'
import { VoidSaleModal } from './VoidSaleModal'
import { SendWhatsAppModal } from './SendWhatsAppModal'

function paymentClass(status: SaleDisplayStatus): string {
  if (status === 'voided') return 'bg-rose-50 text-rose-700 border border-rose-200'
  if (status === 'partial') return 'bg-sky-50 text-sky-800 border border-sky-200'
  return status === 'paid'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-amber-50 text-amber-700 border border-amber-200'
}

function paymentLabel(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
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
  const currency = session?.company?.currency ?? 'USD'
  const company = session?.company
  const documentId = Number(id)
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
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

  useEffect(() => {
    const document = query.data
    if (!document || !isSaleConverted(document) || !document.converted_to) return
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
  const canVoid = canVoidType(document.type) && document.payment_status === 'paid' && !voided
  const openQuote = document.type === 'quotation' && !isSaleConverted(document)
  const canSettle = rules.settlesLines && document.payment_status !== 'paid'
  const settlements = document.settlements ?? []

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
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-slate-900">{document.number}</h1>
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
            <span className="text-xs text-slate-500">
              {issued.toLocaleString()} · {document.client_name}
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
              <Link
                to={`/app/quotes/${document.id}/edit`}
                className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-4 text-xs font-semibold text-slate-700"
              >
                {t('common.edit', 'Edit')}
              </Link>
              <button
                type="button"
                disabled={converting.isPending}
                onClick={() => setConvertTarget('factura')}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on disabled:opacity-60"
              >
                {t('sales.convertInvoice', 'Convert to invoice')}
              </button>
              <button
                type="button"
                disabled={converting.isPending}
                onClick={() => setConvertTarget('albaran')}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-brand-600 bg-card px-4 text-xs font-semibold text-brand-600 disabled:opacity-60"
              >
                {t('sales.convertAlbaran', 'Convert to delivery note')}
              </button>
            </>
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
          {rules.settlesPayment && !voided && document.payment_status !== 'paid' ? (
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
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {formatCents(row.total_cents, currency)}
                  </span>
                  {rules.settlesLines ? (
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
