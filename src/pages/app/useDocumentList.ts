import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { getErrorMessage } from '../../services/api'
import { getSale, listSales } from '../../services/sales'
import type { IssuableType, SaleDisplayStatus, SaleDocument } from '../../types/sales'
import { rulesFor } from './documentTypes'

export type PaymentFilter = SaleDisplayStatus | 'all'

export const PER_PAGE = 8

const emptyCounts = { all: 0, pending: 0, paid: 0, partial: 0, voided: 0 }
const emptyStats = {
  total_cents: 0,
  paid_count: 0,
  paid_cents: 0,
  pending_count: 0,
  pending_cents: 0,
  settled_cents: 0,
  month_count: 0,
  month_cents: 0,
  client_count: 0,
}

export function listHint(type: IssuableType): string {
  switch (type) {
    case 'albaran':
      return t('sales.listAlbaranHint', 'Goods handed over. This is not a tax invoice.')
    case 'quotation':
      return t('sales.listQuoteHint', 'Prices with and without tax. Stock is not reserved.')
    case 'proforma':
      return t('sales.listProformaHint', 'Agreed price only. No tax and no discount.')
    default:
      return t('sales.listInvoiceHint', 'Tax invoices. Mark paid when the money arrives.')
  }
}

export function paymentChipLabel(status: SaleDisplayStatus): string {
  if (status === 'voided') return t('sales.voided', 'Voided')
  if (status === 'returned') return t('sales.returned', 'Returned')
  if (status === 'partial') return t('sales.partial', 'Partial')
  return status === 'paid' ? t('sales.paid', 'Paid') : t('sales.pending', 'Pending')
}

/**
 * Everything a list of one kind of document does: the filter, the search, the page, the request, and the PNG / PDF
 * downloads. The website's DocumentList and the Windows app's list both draw from it, so they behave the same.
 */
export function useDocumentList(type: IssuableType) {
  const { session } = useAuth()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'EUR'
  const company = session?.company ?? null
  const rules = rulesFor(type)
  const [payment, setPayment] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<{ id: number; format: 'png' | 'pdf' } | null>(null)

  const showsPaymentFilters = rules.settlesPayment || rules.settlesLines
  const displayStatus = showsPaymentFilters && payment !== 'all' ? payment : undefined

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debounced])

  const query = useQuery({
    queryKey: ['app', 'sales', { type, search: debounced, display_status: displayStatus, page }],
    queryFn: () =>
      listSales({
        type,
        search: debounced || undefined,
        display_status: displayStatus,
        page,
        per_page: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const counts = query.data?.counts ?? emptyCounts
  const stats = query.data?.stats ?? emptyStats

  const chips: { id: PaymentFilter; label: string; count: number }[] = rules.settlesLines
    ? [
        { id: 'all', label: t('sales.anyPayment', 'Any payment'), count: counts.all },
        { id: 'pending', label: t('sales.pending', 'Pending'), count: counts.pending },
        { id: 'partial', label: t('sales.partial', 'Partial'), count: counts.partial },
        { id: 'paid', label: t('sales.paid', 'Paid'), count: counts.paid },
      ]
    : [
        { id: 'all', label: t('sales.anyPayment', 'Any payment'), count: counts.all },
        { id: 'pending', label: t('sales.pending', 'Pending'), count: counts.pending },
        { id: 'paid', label: t('sales.paid', 'Paid'), count: counts.paid },
        { id: 'voided', label: t('sales.voided', 'Voided'), count: counts.voided },
      ]

  const firstOnPage = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const lastOnPage = meta ? firstOnPage + rows.length - 1 : 0
  const pageNumbers = useMemo(() => {
    if (!meta) return []
    const start = Math.max(1, Math.min(meta.current_page - 1, meta.last_page - 2))
    return Array.from({ length: Math.min(3, meta.last_page) }, (_, index) => start + index)
  }, [meta])

  async function exportRow(document: SaleDocument, format: 'png' | 'pdf') {
    setExporting({ id: document.id, format })
    try {
      const full = await getSale(document.id)
      await downloadSaleDocumentSheet(full, company, currency, format)
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      setExporting(null)
    }
  }

  const emptyBecauseSearch = Boolean(debounced)
  const emptyBecauseFilter = showsPaymentFilters && payment !== 'all'

  return {
    currency,
    rules,
    payment,
    setPayment,
    search,
    setSearch,
    debounced,
    setPage,
    exporting,
    exportRow,
    showsPaymentFilters,
    query,
    rows,
    meta,
    counts,
    stats,
    chips,
    firstOnPage,
    lastOnPage,
    pageNumbers,
    emptyBecauseSearch,
    emptyBecauseFilter,
  }
}
