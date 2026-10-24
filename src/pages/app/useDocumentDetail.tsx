import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
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
  type SaleDocument,
  type SaleReturn,
  type SaleReturnInput,
  type SaleSettlement,
  type SaleType,
} from '../../types/sales'
import { docPermission, usePermissions } from '../../auth/permissions'
import { canVoidType, celebratesPayment, rulesFor } from './documentTypes'
import { ConvertQuoteModal } from './ConvertQuoteModal'
import { RecordPaymentModal } from './RecordPaymentModal'
import { EditProformaSettlementModal } from './EditProformaSettlementModal'
import { InvoiceFromAlbaranModal } from './InvoiceFromAlbaranModal'
import { InvoiceFromPaymentModal } from './InvoiceFromPaymentModal'
import { ReturnProformaModal } from './ReturnProformaModal'
import { SettleProformaModal } from './SettleProformaModal'
import { VoidSaleModal } from './VoidSaleModal'
import { SendWhatsAppModal } from './SendWhatsAppModal'

export function paymentLabel(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'returned') return t('sales.returned', 'Returned')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

/**
 * Everything one document's screen does: loading it, printing when asked, the confetti, and every action on it
 * (payment, settle, return, invoice, void, convert). The website's InvoiceDetail and the Windows app's detail screen
 * both draw from it, so the two behave the same.
 */
export function useDocumentDetail() {
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

  return {
    documentId,
    currency,
    company,
    can,
    push,
    query,
    exporting,
    setExporting,
    methodOpen,
    setMethodOpen,
    settleOpen,
    setSettleOpen,
    returnOpen,
    setReturnOpen,
    invoicing,
    setInvoicing,
    albaranInvoiceOpen,
    setAlbaranInvoiceOpen,
    cancelling,
    setCancelling,
    editingSettlement,
    setEditingSettlement,
    voidOpen,
    setVoidOpen,
    whatsAppOpen,
    setWhatsAppOpen,
    convertTarget,
    setConvertTarget,
    celebrate,
    setCelebrate,
    celebrateKey,
    payment,
    settling,
    returning,
    makeInvoice,
    invoiceFromAlbaran,
    cancelReturn,
    editingQty,
    voiding,
    converting,
  }
}

export type DocumentDetail = ReturnType<typeof useDocumentDetail>

/** What this person may do with this document right now. */
export function documentFlags(document: SaleDocument, can: (needed: string) => boolean) {
  const issued = new Date(document.issued_at)
  const rules = rulesFor(document.type)
  const display = saleDisplayStatus(document)
  const voided = isSaleVoided(document)
  const canVoid = canVoidType(document.type) && document.payment_status === 'paid' && !voided && can(docPermission(document.type, 'void'))
  // A quotation can be edited while it is open, and a delivery note while it is unpaid; the rest are paid, returned or voided, not changed.
  const canUpdate = can(docPermission(document.type, 'update'))
  const canPay = can(docPermission(document.type, 'pay'))
  const quoteExpired = document.type === 'quotation' && !isSaleConverted(document) && isSaleExpired(document)
  const openQuote = document.type === 'quotation' && !isSaleConverted(document) && !quoteExpired
  const quoteDays = openQuote && document.expires_at ? quoteDaysLeft(document.expires_at) : null
  const canSettle = rules.settlesLines && document.payment_status !== 'paid' && canPay
  const settlements = document.settlements ?? []
  const returns = document.returns ?? []

  return { issued, rules, display, voided, canVoid, canUpdate, canPay, quoteExpired, openQuote, quoteDays, canSettle, settlements, returns }
}

/** Every dialog the document screen opens. Both the website and the Windows app show these same ones. */
export function DocumentDialogs({ detail, document }: { detail: DocumentDetail; document: SaleDocument }) {
  const {
    currency,
    company,
    methodOpen,
    setMethodOpen,
    settleOpen,
    setSettleOpen,
    returnOpen,
    setReturnOpen,
    invoicing,
    setInvoicing,
    albaranInvoiceOpen,
    setAlbaranInvoiceOpen,
    cancelling,
    setCancelling,
    editingSettlement,
    setEditingSettlement,
    voidOpen,
    setVoidOpen,
    whatsAppOpen,
    setWhatsAppOpen,
    convertTarget,
    setConvertTarget,
    payment,
    settling,
    returning,
    makeInvoice,
    invoiceFromAlbaran,
    cancelReturn,
    editingQty,
    voiding,
    converting,
  } = detail

  return (
    <>
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
    </>
  )
}
