import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  FileClock,
  FileDown,
  FileSpreadsheet,
  Layers,
  PackageCheck,
  Package,
  Percent,
  ReceiptEuro as Receipt,
  TrendingUp,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Select } from '../../components/ui/Select'
import { Skeleton, SkeletonStatGrid } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { intlLocale, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { TONE_AMBER, TONE_GREEN } from '../../lib/status'
import { centsToExcelAmount, downloadStyledReport, type ReportColumnFormat } from '../../lib/exportReport'
import { downloadFileName, fileDate } from '../../lib/fileName'
import { formatDate } from '../../lib/format'
import { formatCents } from '../../lib/money'
import { downloadReportPdf, type PdfChart, type PdfComparison, type PdfTable, type ReportPdfSpec } from '../../lib/reportPdf'
import { agingBuckets, cumulative, fillDays, movingAverage, pctChange, periodRange, previousRange, weekdayTotals } from '../../lib/reportAnalytics'
import { getErrorMessage } from '../../services/api'
import { getReport } from '../../services/reports'
import type { PaymentPeriod, SaleType } from '../../types/sales'
import {
  REPORT_KINDS,
  SNAPSHOT_KINDS,
  type ReportBreakdownRow,
  type ReportKind,
  type ReportKpis,
  type ReportPayload,
  type ReportRow,
  type ReportSeriesPoint,
} from '../../types/reports'
import { typeLabel } from './documentTypes'

const headerButton =
  'inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer'

const dateInputClass =
  'h-8 rounded-[10px] border border-line bg-card px-2 text-[12px] text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'

const CHART = ['var(--app-primary)', 'var(--app-secondary)', '#b45309', '#0369a1', '#6d28d9', '#be123c', '#334155', '#047857']

const KIND_META: Record<ReportKind, { icon: LucideIcon }> = {
  sales: { icon: TrendingUp },
  tax: { icon: Percent },
  products: { icon: Package },
  sold: { icon: PackageCheck },
  outstanding: { icon: FileClock },
  payments: { icon: Banknote },
  stock: { icon: Layers },
  clients: { icon: Users },
  suppliers: { icon: Truck },
  receipts: { icon: ClipboardList },
}

type Column = {
  key: string
  header: string
  align?: 'left' | 'right'
  hideOnPhone?: boolean
  text: (row: ReportRow) => string
  excel: (row: ReportRow) => string | number | null
  node?: (row: ReportRow) => ReactNode
  /** How the cell is written in Excel: a number with its own format, so it can be summed, sorted and filtered. */
  format?: ReportColumnFormat
  /** Added up in the total row of the Excel sheet. */
  sum?: boolean
}

type Tile = { label: string; value: string; hint: string; tile: string; icon: ReactNode }

type Slice = { name: string; value: number; color: string; money?: boolean }

let currentCurrency = 'EUR'

function localIso(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthStartIso(): string {
  const date = new Date()
  date.setDate(1)
  return localIso(date)
}

function usesPeriod(kind: ReportKind): boolean {
  return !SNAPSHOT_KINDS.includes(kind)
}

function kindLabel(kind: ReportKind): string {
  const labels: Record<ReportKind, string> = {
    sales: t('reports.sales', 'Sales'),
    tax: t('reports.tax', 'Tax (IVA)'),
    products: t('reports.products', 'Best sellers'),
    sold: t('reports.sold', 'Products sold'),
    outstanding: t('reports.outstanding', 'Outstanding'),
    payments: t('reports.payments', 'Payments by method'),
    stock: t('reports.stock', 'Stock value'),
    clients: t('reports.clients', 'Clients'),
    suppliers: t('reports.suppliers', 'Suppliers'),
    receipts: t('nav.deliveryReceipts', 'Delivery receipts'),
  }
  return labels[kind]
}

function asNumber(value: ReportRow[string]): number {
  return typeof value === 'number' ? value : 0
}

function asText(value: ReportRow[string]): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function moneyCol(key: string, header: string): Column {
  return {
    key,
    header,
    align: 'right',
    text: (row) => formatCents(asNumber(row[key]), currentCurrency),
    excel: (row) => centsToExcelAmount(asNumber(row[key])),
    format: 'money',
    sum: true,
  }
}

/** `sum` is false where adding the column up would mislead (a document with two tax rates counts under both). */
function countCol(key: string, header: string, sum = true): Column {
  return {
    key,
    header,
    align: 'right',
    text: (row) => String(asNumber(row[key])),
    excel: (row) => asNumber(row[key]),
    format: 'count',
    sum,
  }
}

function shareCol(key: string, total: number, header: string): Column {
  return {
    key: `${key}_share`,
    header,
    align: 'right',
    text: (row) => formatShare(asNumber(row[key]), total),
    excel: (row) => shareValue(asNumber(row[key]), total),
    node: (row) => <ShareBar value={asNumber(row[key])} total={total} />,
    format: 'percent',
  }
}

function formatDay(day: string): string {
  const parts = day.split('-')
  if (parts.length !== 3) return day
  return `${parts[2]}/${parts[1]}`
}

function shareValue(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

function formatShare(part: number, total: number): string {
  return `${shareValue(part, total).toFixed(1)}%`
}

function docTypeLabel(key: string): string {
  if (key === 'factura' || key === 'albaran' || key === 'proforma' || key === 'quotation' || key === 'nota_entrega') {
    return typeLabel(key as SaleType)
  }
  return key
}

function paymentLabel(status: string): string {
  if (status === 'paid') return t('reports.paid', 'Paid')
  if (status === 'partial') return t('reports.partial', 'Partial')
  return t('reports.pending', 'Pending')
}

function paymentTone(status: string): string {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
  if (status === 'partial') return 'bg-sky-50 text-sky-800 ring-1 ring-sky-200'
  return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
}

function stockLabel(band: string): string {
  if (band === 'out') return t('reports.outOfStock', 'Out of stock')
  if (band === 'low') return t('reports.lowStock', 'Low stock')
  return t('reports.healthy', 'In stock')
}

function stockTone(band: string): string {
  if (band === 'out') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
  if (band === 'low') return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
}

function stockColor(band: string): string {
  if (band === 'out') return '#be123c'
  if (band === 'low') return '#d97706'
  return '#0f766e'
}

function statusColor(status: string): string {
  if (status === 'paid') return '#059669'
  if (status === 'partial') return '#0284c7'
  return '#d97706'
}

function tableRows(data: ReportPayload): ReportRow[] {
  if (data.kind === 'sales') {
    return (data.breakdown ?? []).map((row: ReportBreakdownRow) => ({
      key: row.key,
      label: row.label ?? row.key,
      count: row.count,
      paid_count: row.paid_count ?? 0,
      open_count: row.open_count ?? 0,
      total_cents: row.total_cents,
    }))
  }
  return data.rows ?? []
}

function columnsFor(kind: ReportKind, currency: string, data: ReportPayload): Column[] {
  currentCurrency = currency
  const money = (key: string, header: string) => moneyCol(key, header)
  const kpis = data.kpis

  switch (kind) {
    case 'sales':
      return [
        {
          key: 'label',
          header: t('sales.document', 'Document'),
          text: (row) => docTypeLabel(asText(row.key)),
          excel: (row) => docTypeLabel(asText(row.key)),
          node: (row) => <TypeChip type={asText(row.key)} />,
        },
        countCol('count', t('reports.documents', 'Documents')),
        countCol('paid_count', t('reports.paidCount', 'Paid docs')),
        countCol('open_count', t('reports.openCount', 'Open docs')),
        money('total_cents', t('reports.total', 'Total')),
        shareCol('total_cents', kpis.total_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'tax':
      return [
        {
          key: 'rate',
          header: t('reports.rate', 'Rate'),
          text: (row) => `${asNumber(row.rate)}%`,
          excel: (row) => `${asNumber(row.rate)}%`,
        },
        countCol('line_count', t('reports.lines', 'Lines')),
        countCol('document_count', t('reports.documents', 'Documents'), false),
        money('base_cents', t('reports.base', 'Base')),
        money('tax_cents', t('reports.taxAmount', 'Tax')),
        money('total_cents', t('reports.total', 'Total')),
        shareCol('tax_cents', kpis.tax_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'products':
      return [
        {
          key: 'article',
          header: t('sales.article', 'Article'),
          text: (row) => asText(row.article),
          excel: (row) => asText(row.article),
          node: (row) => (
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{asText(row.article)}</span>
              {row.description ? (
                <span className="block truncate text-[11px] text-slate-400">{asText(row.description)}</span>
              ) : null}
            </span>
          ),
        },
        countCol('quantity', t('reports.quantity', 'Quantity')),
        countCol('document_count', t('reports.onDocuments', 'On documents'), false),
        money('base_cents', t('reports.base', 'Base')),
        money('total_cents', t('reports.total', 'Total')),
        shareCol('quantity', kpis.quantity ?? 0, t('reports.share', 'Share')),
      ]
    case 'sold':
      return [
        {
          key: 'barcode',
          header: t('products.barcode', 'Bar code'),
          text: (row) => asText(row.barcode),
          excel: (row) => asText(row.barcode),
          node: (row) => <span className="tabular-nums text-slate-600">{asText(row.barcode) || '—'}</span>,
        },
        {
          key: 'article',
          header: t('sales.article', 'Article'),
          text: (row) => asText(row.article),
          excel: (row) => asText(row.article),
          node: (row) => <span className="block truncate font-semibold text-slate-900">{asText(row.article)}</span>,
        },
        {
          key: 'brand',
          header: t('products.brand', 'Brand'),
          hideOnPhone: true,
          text: (row) => asText(row.brand),
          excel: (row) => asText(row.brand),
        },
        countCol('quantity', t('reports.quantitySold', 'Sold')),
        countCol('document_count', t('reports.onDocuments', 'On documents'), false),
        {
          key: 'avg_price_cents',
          header: t('reports.avgPrice', 'Average price'),
          align: 'right',
          text: (row) => formatCents(asNumber(row.avg_price_cents), currentCurrency),
          excel: (row) => centsToExcelAmount(asNumber(row.avg_price_cents)),
          format: 'money',
        },
        money('base_cents', t('reports.base', 'Base')),
        money('total_cents', t('reports.total', 'Total')),
        {
          key: 'stock',
          header: t('reports.stockLeft', 'Stock left'),
          align: 'right',
          text: (row) => (row.stock === null ? '—' : String(asNumber(row.stock))),
          excel: (row) => (row.stock === null ? null : asNumber(row.stock)),
          format: 'count',
        },
      ]
    case 'outstanding':
      return [
        {
          key: 'client_name',
          header: t('sales.client', 'Client'),
          text: (row) => asText(row.client_name),
          excel: (row) => asText(row.client_name),
          node: (row) => (
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{asText(row.client_name)}</span>
              {row.client_company ? (
                <span className="block truncate text-[11px] text-slate-400">{asText(row.client_company)}</span>
              ) : null}
            </span>
          ),
        },
        {
          key: 'number',
          header: t('sales.document', 'Document'),
          text: (row) => `${docTypeLabel(asText(row.type))} ${asText(row.number)}`,
          excel: (row) => asText(row.number),
        },
        {
          key: 'issued_at',
          header: t('sales.date', 'Date'),
          hideOnPhone: true,
          text: (row) => (row.issued_at ? formatDate(String(row.issued_at)) : '—'),
          excel: (row) => (row.issued_at ? formatDate(String(row.issued_at)) : null),
        },
        {
          key: 'days_open',
          header: t('reports.daysOpen', 'Days open'),
          align: 'right',
          text: (row) => String(asNumber(row.days_open)),
          excel: (row) => asNumber(row.days_open),
          format: 'count',
          node: (row) => <DaysChip days={asNumber(row.days_open)} />,
        },
        {
          key: 'payment_status',
          header: t('payments.status', 'Status'),
          text: (row) => paymentLabel(asText(row.payment_status)),
          excel: (row) => paymentLabel(asText(row.payment_status)),
          node: (row) => <StatusChip status={asText(row.payment_status)} />,
        },
        money('outstanding_cents', t('payments.outstanding', 'Outstanding')),
        shareCol('outstanding_cents', kpis.outstanding_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'payments':
      return [
        {
          key: 'method_name',
          header: t('payments.method', 'Method'),
          text: (row) =>
            row.method_name ? asText(row.method_name) : t('payments.noMethod', 'No method'),
          excel: (row) =>
            row.method_name ? asText(row.method_name) : t('payments.noMethod', 'No method'),
        },
        countCol('document_count', t('reports.documents', 'Documents')),
        countCol('open_count', t('reports.openCount', 'Open docs')),
        money('received_cents', t('payments.received', 'Received')),
        money('outstanding_cents', t('payments.outstanding', 'Outstanding')),
        shareCol('received_cents', kpis.received_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'stock':
      return [
        {
          key: 'article',
          header: t('sales.article', 'Article'),
          text: (row) => asText(row.article),
          excel: (row) => asText(row.article),
        },
        {
          key: 'band',
          header: t('payments.status', 'Status'),
          text: (row) => stockLabel(asText(row.band)),
          excel: (row) => stockLabel(asText(row.band)),
          node: (row) => <StockChip band={asText(row.band)} />,
        },
        countCol('quantity', t('reports.quantity', 'Quantity')),
        countCol('minimum_stock', t('reports.lowStock', 'Low stock'), false),
        money('stock_value_cents', t('reports.stockValue', 'Stock value')),
        shareCol('stock_value_cents', kpis.stock_value_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'clients':
      return [
        {
          key: 'client_name',
          header: t('sales.client', 'Client'),
          text: (row) => asText(row.client_name),
          excel: (row) => asText(row.client_name),
          node: (row) => (
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{asText(row.client_name)}</span>
              {row.client_company ? (
                <span className="block truncate text-[11px] text-slate-400">{asText(row.client_company)}</span>
              ) : null}
            </span>
          ),
        },
        countCol('document_count', t('reports.documents', 'Documents')),
        countCol('paid_count', t('reports.paidCount', 'Paid docs')),
        countCol('open_count', t('reports.openCount', 'Open docs')),
        money('total_cents', t('reports.total', 'Total')),
        money('paid_cents', t('reports.paid', 'Paid')),
        money('outstanding_cents', t('payments.outstanding', 'Outstanding')),
        shareCol('total_cents', kpis.total_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'suppliers':
      return [
        {
          key: 'supplier_name',
          header: t('nav.suppliers', 'Suppliers'),
          text: (row) =>
            row.supplier_name ? asText(row.supplier_name) : t('reports.noSupplier', 'No supplier'),
          excel: (row) =>
            row.supplier_name ? asText(row.supplier_name) : t('reports.noSupplier', 'No supplier'),
        },
        countCol('product_count', t('reports.productsCount', 'Products')),
        countCol('quantity', t('reports.units', 'Units')),
        countCol('low_count', t('reports.lowStock', 'Low stock')),
        countCol('out_count', t('reports.outOfStock', 'Out of stock')),
        money('stock_value_cents', t('reports.stockValue', 'Stock value')),
        shareCol('stock_value_cents', kpis.stock_value_cents ?? 0, t('reports.share', 'Share')),
      ]
    case 'receipts':
      return [
        {
          key: 'number',
          header: t('sales.document', 'Document'),
          text: (row) => asText(row.number),
          excel: (row) => asText(row.number),
          node: (row) => <span className="block truncate font-semibold text-slate-900">{asText(row.number)}</span>,
        },
        {
          key: 'issued_at',
          header: t('sales.date', 'Date'),
          text: (row) => (row.issued_at ? formatDate(String(row.issued_at)) : '—'),
          excel: (row) => (row.issued_at ? formatDate(String(row.issued_at)) : null),
        },
        countCol('line_count', t('reports.lines', 'Lines')),
        countCol('quantity', t('reports.units', 'Units')),
        money('total_cents', t('reports.total', 'Total')),
        shareCol('total_cents', kpis.total_cents ?? 0, t('reports.share', 'Share')),
      ]
  }
}

/** The second table of the delivery receipts report: what those receipts handed over, by product. */
function receiptProductColumns(currency: string, data: ReportPayload): Column[] {
  currentCurrency = currency
  return [
    {
      key: 'article',
      header: t('sales.article', 'Article'),
      text: (row) => asText(row.article),
      excel: (row) => asText(row.article),
      node: (row) => <span className="block truncate font-semibold text-slate-900">{asText(row.article)}</span>,
    },
    {
      key: 'barcode',
      header: t('products.barcode', 'Bar code'),
      hideOnPhone: true,
      text: (row) => asText(row.barcode),
      excel: (row) => asText(row.barcode),
    },
    countCol('quantity', t('reports.quantity', 'Quantity')),
    countCol('document_count', t('reports.onDocuments', 'On documents'), false),
    moneyCol('total_cents', t('reports.total', 'Total')),
    shareCol('quantity', data.kpis.quantity ?? 0, t('reports.share', 'Share')),
  ]
}

function kpisFor(kind: ReportKind, kpis: ReportKpis, currency: string): Tile[] {
  const money = (key: string) => formatCents(kpis[key] ?? 0, currency)
  const count = (key: string) => String(kpis[key] ?? 0)
  switch (kind) {
    case 'sales':
      return [
        tile(t('reports.documents', 'Documents'), count('document_count'), `${kpis.client_count ?? 0} ${t('reports.clients', 'Clients').toLowerCase()}`, 'slate', <Receipt className="h-5 w-5" />),
        tile(t('reports.paidCount', 'Paid docs'), count('paid_count'), money('paid_cents'), 'green', <Banknote className="h-5 w-5" />),
        tile(t('reports.openCount', 'Open docs'), String((kpis.partial_count ?? 0) + (kpis.pending_count ?? 0)), `${kpis.pending_count ?? 0} ${t('reports.pending', 'Pending').toLowerCase()}`, 'amber', <FileClock className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('reports.sales', 'Sales'), 'blue', <TrendingUp className="h-5 w-5" />),
        tile(t('payments.outstanding', 'Outstanding'), money('outstanding_cents'), `${kpis.partial_count ?? 0} ${t('reports.partial', 'Partial').toLowerCase()}`, 'amber', <FileClock className="h-5 w-5" />),
        tile(t('reports.clients', 'Clients'), count('client_count'), t('reports.byType', 'By document'), 'slate', <Users className="h-5 w-5" />),
      ]
    case 'tax':
      return [
        tile(t('reports.rate', 'Rate'), count('rate_count'), t('reports.byRate', 'By tax rate'), 'slate', <Percent className="h-5 w-5" />),
        tile(t('reports.lines', 'Lines'), count('line_count'), t('reports.tax', 'Tax (IVA)'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.base', 'Base'), money('base_cents'), t('reports.rate', 'Rate'), 'slate', <Receipt className="h-5 w-5" />),
        tile(t('reports.taxAmount', 'Tax'), money('tax_cents'), t('reports.tax', 'Tax (IVA)'), 'blue', <Percent className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('reports.documents', 'Documents'), 'green', <Banknote className="h-5 w-5" />),
      ]
    case 'products':
      return [
        tile(t('reports.productsCount', 'Products'), count('product_count'), t('reports.products', 'Best sellers'), 'slate', <Package className="h-5 w-5" />),
        tile(t('reports.quantity', 'Quantity'), count('quantity'), t('reports.units', 'Units'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('reports.sales', 'Sales'), 'green', <Banknote className="h-5 w-5" />),
      ]
    case 'sold':
      return [
        tile(t('reports.productsCount', 'Products'), count('product_count'), t('reports.sold', 'Products sold'), 'slate', <PackageCheck className="h-5 w-5" />),
        tile(t('reports.quantitySold', 'Sold'), count('quantity'), t('reports.units', 'Units'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.base', 'Base'), money('base_cents'), t('reports.sales', 'Sales'), 'slate', <Receipt className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('reports.sales', 'Sales'), 'green', <Banknote className="h-5 w-5" />),
      ]
    case 'outstanding':
      return [
        tile(t('reports.documents', 'Documents'), count('document_count'), t('sales.stillOpen', 'still open'), 'slate', <Receipt className="h-5 w-5" />),
        tile(t('reports.clients', 'Clients'), count('client_count'), t('reports.outstanding', 'Outstanding'), 'blue', <Users className="h-5 w-5" />),
        tile(t('reports.pending', 'Pending'), count('pending_count'), t('reports.statusMix', 'Status mix'), 'amber', <FileClock className="h-5 w-5" />),
        tile(t('reports.partial', 'Partial'), count('partial_count'), t('reports.statusMix', 'Status mix'), 'blue', <Banknote className="h-5 w-5" />),
        tile(t('reports.oldest', 'Oldest open'), `${kpis.oldest_days ?? 0} ${t('reports.days', 'days')}`, t('reports.daysOpen', 'Days open'), 'amber', <FileClock className="h-5 w-5" />),
        tile(t('payments.outstanding', 'Outstanding'), money('outstanding_cents'), t('reports.outstanding', 'Outstanding'), 'amber', <FileClock className="h-5 w-5" />),
      ]
    case 'payments':
      return [
        tile(t('reports.documents', 'Documents'), count('document_count'), t('payments.method', 'Method'), 'slate', <Receipt className="h-5 w-5" />),
        tile(t('reports.methods', 'Methods'), count('method_count'), t('reports.byMethod', 'By method'), 'blue', <Banknote className="h-5 w-5" />),
        tile(t('reports.openCount', 'Open docs'), count('open_count'), t('sales.stillOpen', 'still open'), 'amber', <FileClock className="h-5 w-5" />),
        tile(t('payments.received', 'Received'), money('received_cents'), t('reports.paid', 'Paid'), 'green', <Banknote className="h-5 w-5" />),
        tile(t('payments.outstanding', 'Outstanding'), money('outstanding_cents'), t('sales.stillOpen', 'still open'), 'amber', <FileClock className="h-5 w-5" />),
      ]
    case 'stock':
      return [
        tile(t('reports.productsCount', 'Products'), count('product_count'), t('reports.stock', 'Stock value'), 'slate', <Package className="h-5 w-5" />),
        tile(t('reports.units', 'Units'), count('units'), t('reports.quantity', 'Quantity'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.healthy', 'In stock'), count('ok_count'), t('reports.stockBands', 'Stock health'), 'green', <Package className="h-5 w-5" />),
        tile(t('reports.lowStock', 'Low stock'), count('low_count'), t('reports.stockBands', 'Stock health'), 'amber', <FileClock className="h-5 w-5" />),
        tile(t('reports.outOfStock', 'Out of stock'), count('out_count'), t('reports.stockBands', 'Stock health'), 'amber', <AlertTriangle className="h-5 w-5" />),
        tile(t('reports.stockValue', 'Stock value'), money('stock_value_cents'), t('reports.stock', 'Stock value'), 'blue', <Layers className="h-5 w-5" />),
      ]
    case 'clients':
      return [
        tile(t('reports.clients', 'Clients'), count('client_count'), t('reports.sales', 'Sales'), 'slate', <Users className="h-5 w-5" />),
        tile(t('reports.documents', 'Documents'), count('document_count'), t('reports.byType', 'By document'), 'blue', <Receipt className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('reports.sales', 'Sales'), 'blue', <TrendingUp className="h-5 w-5" />),
        tile(t('reports.paid', 'Paid'), money('paid_cents'), t('payments.received', 'Received'), 'green', <Banknote className="h-5 w-5" />),
        tile(t('payments.outstanding', 'Outstanding'), money('outstanding_cents'), t('sales.stillOpen', 'still open'), 'amber', <FileClock className="h-5 w-5" />),
      ]
    case 'suppliers':
      return [
        tile(t('reports.suppliers', 'Suppliers'), count('supplier_count'), t('reports.productsCount', 'Products'), 'slate', <Truck className="h-5 w-5" />),
        tile(t('reports.productsCount', 'Products'), count('product_count'), t('reports.stock', 'Stock value'), 'blue', <Package className="h-5 w-5" />),
        tile(t('reports.units', 'Units'), count('quantity'), t('reports.quantity', 'Quantity'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.stockValue', 'Stock value'), money('stock_value_cents'), t('reports.stock', 'Stock value'), 'green', <Layers className="h-5 w-5" />),
      ]
    case 'receipts':
      return [
        tile(t('reports.documents', 'Documents'), count('document_count'), t('nav.deliveryReceipts', 'Delivery receipts'), 'slate', <ClipboardList className="h-5 w-5" />),
        tile(t('reports.units', 'Units'), count('quantity'), t('reports.quantity', 'Quantity'), 'blue', <Layers className="h-5 w-5" />),
        tile(t('reports.productsCount', 'Products'), count('product_count'), t('nav.deliveryReceipts', 'Delivery receipts'), 'slate', <Package className="h-5 w-5" />),
        tile(t('reports.total', 'Total'), money('total_cents'), t('nav.deliveryReceipts', 'Delivery receipts'), 'green', <Banknote className="h-5 w-5" />),
      ]
  }
}

function tile(label: string, value: string, hint: string, tone: 'slate' | 'blue' | 'green' | 'amber', icon: ReactNode): Tile {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-brand-50 text-brand-600',
    green: TONE_GREEN,
    amber: TONE_AMBER,
  }
  return { label, value, hint, tile: tones[tone], icon }
}

function isEmpty(data: ReportPayload): boolean {
  if (data.kind === 'sales') return (data.kpis.document_count ?? 0) === 0
  if (data.kind === 'stock') return (data.kpis.product_count ?? 0) === 0
  if (data.kind === 'suppliers') return (data.kpis.product_count ?? 0) === 0
  return tableRows(data).length === 0
}

/** The period as a person reads it, for the line under the title of the Excel sheet. */
function periodText(kind: ReportKind, period: PaymentPeriod, from: string, to: string): string {
  if (!usesPeriod(kind)) return t('reports.snapshotHint', 'Live snapshot — date range does not apply.')
  if (period === 'custom') return `${formatDate(from)} – ${formatDate(to)}`
  if (period === 'month') return t('sales.thisMonth', 'This month')
  if (period === 'week') return t('payments.thisWeek', 'This week')
  if (period === 'day') return t('payments.thisDay', 'Today')
  return t('common.all', 'All')
}

/** The summary tiles as Excel lines: the same labels, with real numbers where the value is one. */
function summaryRows(kind: ReportKind, data: ReportPayload, currency: string) {
  return kpisFor(kind, data.kpis, currency).map((tileItem) => {
    for (const [key, value] of Object.entries(data.kpis)) {
      if (key.endsWith('_cents') && formatCents(value, currency) === tileItem.value) {
        return { label: tileItem.label, value: centsToExcelAmount(value), format: 'money' as const }
      }
      if (!key.endsWith('_cents') && String(value) === tileItem.value) {
        return { label: tileItem.label, value, format: 'count' as const }
      }
    }
    return { label: tileItem.label, value: tileItem.value, format: 'text' as const }
  })
}

/** How wide each column of the Products sold PDF is: the article gets the room, the numbers only what they need. */
const SOLD_PDF_WEIGHTS: Record<string, number> = { barcode: 1.5, article: 3, brand: 1.4, quantity: 0.9, document_count: 1, avg_price_cents: 1.2, base_cents: 1.2, total_cents: 1.2, stock: 0.9 }

async function exportPayload(
  kind: ReportKind,
  data: ReportPayload,
  currency: string,
  companyName: string,
  period: PaymentPeriod,
  from: string,
  to: string,
): Promise<void> {
  const cols = columnsFor(kind, currency, data)
  const rows = tableRows(data)

  await downloadStyledReport({
    // Company - Sales - 2026-10-19 (or the dates of a custom period)
    filename: downloadFileName([companyName, kindLabel(kind), period === 'custom' && usesPeriod(kind) ? `${from} ${t('reportDownloads.to', 'to')} ${to}` : fileDate()], 'xlsx'),
    title: kindLabel(kind),
    subtitle: [companyName, periodText(kind, period, from, to), `${t('reports.generated', 'Generated')} ${formatDate(new Date())}`]
      .filter(Boolean)
      .join('  ·  '),
    currency,
    summaryTitle: t('reports.summary', 'Summary'),
    tableTitle: t('reports.details', 'Details'),
    totalLabel: t('reports.total', 'Total'),
    summary: summaryRows(kind, data, currency),
    columns: cols.map((col) => ({ header: col.header, format: col.format ?? 'text', sum: col.sum })),
    rows: rows.map((row) => cols.map((col) => col.excel(row))),
    extra:
      kind === 'receipts'
        ? [productSheet(currency, data)]
        : data.series && data.series.length > 0
        ? [
            {
              name: t('reports.byDay', 'Sales by day'),
              columns: [
                { header: t('sales.date', 'Date'), format: 'text' as const },
                { header: t('reports.documents', 'Documents'), format: 'count' as const },
                { header: t('reports.total', 'Total'), format: 'money' as const },
              ],
              rows: data.series.map((point: ReportSeriesPoint) => [
                formatDay(point.day),
                point.document_count,
                centsToExcelAmount(point.total_cents),
              ]),
            },
          ]
        : undefined,
  })
}

function productSheet(currency: string, data: ReportPayload) {
  const cols = receiptProductColumns(currency, data)
  return {
    name: t('reports.productsCount', 'Products'),
    columns: cols.map((col) => ({ header: col.header, format: col.format ?? ('text' as const) })),
    rows: (data.products ?? []).map((row) => cols.map((col) => col.excel(row))),
  }
}

/* ---------------------------------------------------------------------------------------------- the PDF of a report */

/** A colour of the theme as #rrggbb (the PDF is drawn off screen, where theme variables are not known). */
function themeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

type CompareMetric = { key: string; label: () => string; money: boolean; goodWhen?: 'up' | 'down' }

/** The headline numbers each report is compared on, this period against the one before it. */
const COMPARE: Partial<Record<ReportKind, CompareMetric[]>> = {
  sales: [
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
    { key: 'document_count', label: () => t('reports.documents', 'Documents'), money: false },
    { key: 'paid_cents', label: () => t('reports.paid', 'Paid'), money: true },
    { key: 'outstanding_cents', label: () => t('payments.outstanding', 'Outstanding'), money: true, goodWhen: 'down' },
    { key: 'client_count', label: () => t('reports.clients', 'Clients'), money: false },
  ],
  tax: [
    { key: 'base_cents', label: () => t('reports.base', 'Base'), money: true },
    { key: 'tax_cents', label: () => t('reports.taxAmount', 'Tax'), money: true },
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
  ],
  products: [
    { key: 'quantity', label: () => t('reports.quantity', 'Quantity'), money: false },
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
  ],
  sold: [
    { key: 'quantity', label: () => t('reports.quantitySold', 'Sold'), money: false },
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
    { key: 'product_count', label: () => t('reports.productsCount', 'Products'), money: false },
  ],
  outstanding: [
    { key: 'outstanding_cents', label: () => t('payments.outstanding', 'Outstanding'), money: true, goodWhen: 'down' },
    { key: 'document_count', label: () => t('reports.documents', 'Documents'), money: false, goodWhen: 'down' },
  ],
  payments: [
    { key: 'received_cents', label: () => t('payments.received', 'Received'), money: true },
    { key: 'outstanding_cents', label: () => t('payments.outstanding', 'Outstanding'), money: true, goodWhen: 'down' },
    { key: 'document_count', label: () => t('reports.documents', 'Documents'), money: false },
  ],
  receipts: [
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
    { key: 'document_count', label: () => t('reports.documents', 'Documents'), money: false },
    { key: 'quantity', label: () => t('reports.units', 'Units'), money: false },
  ],
  clients: [
    { key: 'total_cents', label: () => t('reports.total', 'Total'), money: true },
    { key: 'paid_cents', label: () => t('reports.paid', 'Paid'), money: true },
    { key: 'outstanding_cents', label: () => t('payments.outstanding', 'Outstanding'), money: true, goodWhen: 'down' },
    { key: 'client_count', label: () => t('reports.clients', 'Clients'), money: false },
  ],
}

function weekdayNames(): string[] {
  // 1 January 2024 was a Monday.
  const format = new Intl.DateTimeFormat(intlLocale(), { weekday: 'short' })
  return Array.from({ length: 7 }, (_item, index) => format.format(new Date(2024, 0, 1 + index)))
}

function pdfCharts(
  kind: ReportKind,
  data: ReportPayload,
  previous: ReportPayload | null,
  ranges: { current: ReturnType<typeof periodRange>; previous: ReturnType<typeof previousRange> },
  palette: string[],
): PdfChart[] {
  const [brand, second, ...others] = palette as [string, string, ...string[]]
  const colorAt = (index: number) => palette[index % palette.length]!
  const charts: PdfChart[] = []

  const slices = (rows: { name: string; value: number }[], limit = 6) => {
    const sorted = rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value)
    const top = sorted.slice(0, limit)
    const rest = sorted.slice(limit).reduce((sum, row) => sum + row.value, 0)
    if (rest > 0) top.push({ name: t('reports.otherSlice', 'Other'), value: rest })
    return top.map((row, index) => ({ ...row, color: colorAt(index) }))
  }
  const ranking = (rows: { name: string; value: number }[]) => rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value).slice(0, 8)

  if (kind === 'sales') {
    const points = (data.series ?? []).map((point) => ({ day: point.day, value: point.total_cents }))
    const days = ranges.current ? fillDays(ranges.current, points) : points
    if (days.length > 0) {
      const values = days.map((day) => day.value)
      charts.push({
        type: 'bars',
        title: t('reports.byDay', 'Sales by day'),
        money: true,
        labels: days.map((day) => formatDay(day.day)),
        values,
        color: brand,
        barName: t('reports.sales', 'Sales'),
        line: values.length > 2 ? { name: t('reports.movingAverage', '7-day average'), color: '#b45309', values: movingAverage(values, 7) } : undefined,
        wide: true,
      })

      if (previous && ranges.previous) {
        const before = fillDays(ranges.previous, (previous.series ?? []).map((point) => ({ day: point.day, value: point.total_cents })))
        const now = cumulative(values)
        const then = cumulative(before.map((day) => day.value))
        charts.push({
          type: 'trend',
          title: t('reports.cumulative', 'Running total: this period vs the one before'),
          money: true,
          labels: days.map((day) => formatDay(day.day)),
          series: [
            { name: t('reports.thisPeriod', 'This period'), color: brand, values: now },
            { name: t('reports.previousPeriod', 'Previous period'), color: '#94a3b8', values: now.map((_value, index) => then[Math.min(index, then.length - 1)] ?? 0) },
          ],
        })
      }

      const weekdays = weekdayTotals(days)
      if (weekdays.some((value) => value > 0)) {
        charts.push({ type: 'bars', title: t('reports.byWeekday', 'Which weekdays sell most'), money: true, labels: weekdayNames(), values: weekdays, color: second, barName: t('reports.sales', 'Sales') })
      }
    }
    const types = slices((data.breakdown ?? []).map((row) => ({ name: docTypeLabel(row.key), value: row.total_cents })))
    if (types.length > 0) charts.push({ type: 'donut', title: t('reports.byType', 'By document'), money: true, center: formatCents(data.kpis.total_cents ?? 0, currentCurrency), slices: types })
    const status = slices((data.status ?? []).map((row) => ({ name: paymentLabel(row.key), value: row.count })))
      .map((slice, index) => ({ ...slice, color: statusColor((data.status ?? []).find((row) => paymentLabel(row.key) === slice.name)?.key ?? '') || colorAt(index) }))
    if (status.length > 0) charts.push({ type: 'donut', title: t('reports.byStatus', 'By payment status'), money: false, center: String(data.kpis.document_count ?? 0), slices: status })
  } else if (kind === 'tax') {
    const rows = data.rows ?? []
    if (rows.length > 0) {
      charts.push({
        type: 'groups',
        title: t('reports.byRate', 'By tax rate'),
        money: true,
        labels: rows.map((row) => `${asNumber(row.rate)}%`),
        series: [
          { name: t('reports.base', 'Base'), color: second, values: rows.map((row) => asNumber(row.base_cents)) },
          { name: t('reports.taxAmount', 'Tax'), color: brand, values: rows.map((row) => asNumber(row.tax_cents)) },
        ],
      })
      charts.push({ type: 'donut', title: t('reports.taxAmount', 'Tax'), money: true, center: formatCents(data.kpis.tax_cents ?? 0, currentCurrency), slices: slices(rows.map((row) => ({ name: `${asNumber(row.rate)}%`, value: asNumber(row.tax_cents) }))) })
    }
  } else if (kind === 'products' || kind === 'sold') {
    const rows = data.rows ?? []
    charts.push({ type: 'rank', title: t('reports.topByQuantity', 'Top products by units sold'), money: false, color: brand, items: ranking(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.quantity) }))) })
    charts.push({ type: 'rank', title: t('reports.topByRevenue', 'Top products by revenue'), money: true, color: second, items: ranking(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.total_cents) }))) })
    charts.push({ type: 'donut', title: t('reports.share', 'Share'), money: true, center: formatCents(data.kpis.total_cents ?? 0, currentCurrency), slices: slices(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.total_cents) }))) })
  } else if (kind === 'receipts') {
    const rows = data.products ?? []
    charts.push({ type: 'rank', title: t('reports.topByQuantity', 'Top products by units sold'), money: false, color: brand, items: ranking(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.quantity) }))) })
    charts.push({ type: 'rank', title: t('reports.topByRevenue', 'Top products by revenue'), money: true, color: second, items: ranking(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.total_cents) }))) })
  } else if (kind === 'outstanding') {
    const rows = data.rows ?? []
    const aging = agingBuckets(rows.map((row) => ({ days: asNumber(row.days_open), cents: asNumber(row.outstanding_cents) })))
    charts.push({
      type: 'bars',
      title: t('reports.aging', 'How long it has been open'),
      money: true,
      labels: ['0-30', '31-60', '61-90', '90+'].map((label) => `${label} ${t('reports.days', 'days')}`),
      values: aging,
      color: '#d97706',
      barName: t('payments.outstanding', 'Outstanding'),
    })
    charts.push({ type: 'rank', title: t('reports.topClients', 'Top clients'), money: true, color: brand, items: ranking(rows.reduce<{ name: string; value: number }[]>((list, row) => {
      const name = asText(row.client_name)
      const found = list.find((item) => item.name === name)
      if (found) found.value += asNumber(row.outstanding_cents)
      else list.push({ name, value: asNumber(row.outstanding_cents) })
      return list
    }, [])) })
    charts.push({ type: 'donut', title: t('reports.byStatus', 'By payment status'), money: false, center: String(data.kpis.document_count ?? 0), slices: [
      { name: t('reports.pending', 'Pending'), value: data.kpis.pending_count ?? 0, color: '#d97706' },
      { name: t('reports.partial', 'Partial'), value: data.kpis.partial_count ?? 0, color: '#0284c7' },
    ].filter((slice) => slice.value > 0) })
  } else if (kind === 'payments') {
    const rows = data.rows ?? []
    const named = rows.map((row) => ({ name: row.method_name ? asText(row.method_name) : t('payments.noMethod', 'No method'), received: asNumber(row.received_cents), count: asNumber(row.document_count) }))
    charts.push({ type: 'donut', title: t('reports.byMethod', 'By method'), money: true, center: formatCents(data.kpis.received_cents ?? 0, currentCurrency), slices: slices(named.map((row) => ({ name: row.name, value: row.received }))) })
    charts.push({ type: 'rank', title: t('payments.received', 'Received'), money: true, color: brand, items: ranking(named.map((row) => ({ name: row.name, value: row.received }))) })
    charts.push({ type: 'rank', title: t('reports.documents', 'Documents'), money: false, color: second, items: ranking(named.map((row) => ({ name: row.name, value: row.count }))) })
  } else if (kind === 'stock') {
    const rows = data.rows ?? []
    charts.push({ type: 'donut', title: t('reports.stockBands', 'Stock health'), money: false, center: String(data.kpis.product_count ?? 0), slices: (data.breakdown ?? []).map((row) => ({ name: stockLabel(row.key), value: row.count, color: stockColor(row.key) })).filter((slice) => slice.value > 0) })
    charts.push({ type: 'rank', title: t('reports.units', 'Units'), money: false, color: brand, items: ranking(rows.map((row) => ({ name: asText(row.article), value: asNumber(row.quantity) }))) })
  } else if (kind === 'clients') {
    const rows = data.rows ?? []
    charts.push({ type: 'rank', title: t('reports.topClients', 'Top clients'), money: true, color: brand, items: ranking(rows.map((row) => ({ name: asText(row.client_name), value: asNumber(row.total_cents) }))) })
    charts.push({ type: 'donut', title: t('reports.statusMix', 'Status mix'), money: true, center: formatCents(data.kpis.total_cents ?? 0, currentCurrency), slices: [
      { name: t('reports.paid', 'Paid'), value: data.kpis.paid_cents ?? 0, color: '#059669' },
      { name: t('payments.outstanding', 'Outstanding'), value: data.kpis.outstanding_cents ?? 0, color: '#d97706' },
    ].filter((slice) => slice.value > 0) })
  } else {
    const rows = data.rows ?? []
    const named = rows.map((row) => ({ name: row.supplier_name ? asText(row.supplier_name) : t('reports.noSupplier', 'No supplier'), value: asNumber(row.stock_value_cents), products: asNumber(row.product_count) }))
    charts.push({ type: 'rank', title: t('reports.stockValue', 'Stock value'), money: true, color: brand, items: ranking(named.map((row) => ({ name: row.name, value: row.value }))) })
    charts.push({ type: 'rank', title: t('reports.productsCount', 'Products'), money: false, color: second, items: ranking(named.map((row) => ({ name: row.name, value: row.products }))) })
    charts.push({ type: 'donut', title: t('reports.share', 'Share'), money: true, center: formatCents(data.kpis.stock_value_cents ?? 0, currentCurrency), slices: slices(named.map((row) => ({ name: row.name, value: row.value }))) })
  }

  void others
  return charts.filter((chart) => chart.type !== 'donut' || chart.slices.length > 0).filter((chart) => chart.type !== 'rank' || chart.items.length > 0)
}

/** The last line of a PDF table: the columns marked `sum`, added up. */
function totalRow(cols: Column[], rows: ReportRow[], currency: string): string[] | undefined {
  if (!cols.some((col) => col.sum)) return undefined
  return cols.map((col, index) => {
    if (index === 0) return t('reports.total', 'Total')
    if (!col.sum) return ''
    // money cells are in euros here, counts are plain numbers
    const sum = rows.reduce((acc, row) => acc + (Number(col.excel(row)) || 0), 0)
    return col.format === 'money' ? formatCents(Math.round(sum * 100), currency) : String(Math.round(sum * 100) / 100)
  })
}

/** The report as a PDF: headline numbers, the change against the period before, analytical charts and the full table. */
async function exportPdfPayload(
  kind: ReportKind,
  data: ReportPayload,
  currency: string,
  companyName: string,
  period: PaymentPeriod,
  from: string,
  to: string,
): Promise<void> {
  const cols = columnsFor(kind, currency, data)
  const rows = tableRows(data)

  const dated = usesPeriod(kind)
  const current = dated ? periodRange(period, from, to) : null
  // Products sold is the Excel file as a PDF: its summary and its table, with no graphs and no comparison.
  const plain = kind === 'sold'
  const before = dated && !plain ? previousRange(period, from, to) : null

  // The period before, asked from the server like the report itself. If it cannot be had, the PDF is made without it.
  let previous: ReportPayload | null = null
  if (before) {
    try {
      previous = await getReport(kind, { period: 'custom', from: before.from, to: before.to })
    } catch {
      previous = null
    }
  }

  const brand = themeColor('--app-primary', '#1e3a8a')
  const second = themeColor('--app-secondary', '#0369a1')
  const palette = [brand, second, '#b45309', '#0369a1', '#6d28d9', '#be123c', '#334155', '#047857']

  const metrics = COMPARE[kind] ?? []
  const comparison: PdfComparison[] =
    previous && before
      ? metrics.map((metric) => {
          const now = data.kpis[metric.key] ?? 0
          const then = previous.kpis[metric.key] ?? 0
          const write = (value: number) => (metric.money ? formatCents(value, currency) : String(value))
          return { label: metric.label(), current: write(now), previous: write(then), change: pctChange(now, then), goodWhen: metric.goodWhen }
        })
      : []

  // Products sold is the full list, exactly as in the Excel file: every product, no cap.
  const capped = kind === 'sold' ? rows : rows.slice(0, 400)
  const total = totalRow(cols, capped, currency)

  const moreTables: PdfTable[] = []
  if (kind === 'receipts') {
    const productCols = receiptProductColumns(currency, data)
    const products = data.products ?? []
    moreTables.push({
      title: t('reports.productsCount', 'Products'),
      columns: productCols.map((col) => ({ header: col.header, align: col.align === 'right' ? 'right' : 'left' })),
      rows: products.map((row) => productCols.map((col) => col.text(row))),
      total: totalRow(productCols, products, currency),
    })
  }

  const spec: ReportPdfSpec = {
    filename: downloadFileName([companyName, kindLabel(kind), period === 'custom' && dated ? `${from} ${t('reportDownloads.to', 'to')} ${to}` : fileDate()], 'pdf'),
    title: kindLabel(kind),
    company: companyName,
    periodText: periodText(kind, period, from, to),
    generated: `${t('reports.generated', 'Generated')} ${formatDate(new Date())}`,
    currency,
    brand,
    tiles: kpisFor(kind, data.kpis, currency).map((item) => ({ label: item.label, value: item.value, hint: item.hint })),
    comparisonTitle: previous && before ? `${t('reports.vsPrevious', 'Compared with the period before')} (${formatDate(before.from)} – ${formatDate(before.to)})` : undefined,
    comparisonHeaders: { metric: t('reports.metric', 'Metric'), current: t('reports.thisPeriod', 'This period'), previous: t('reports.previousPeriod', 'Previous period'), change: t('reports.change', 'Change') },
    comparison,
    chartsTitle: t('reports.analysis', 'Analysis'),
    charts: plain ? [] : pdfCharts(kind, data, previous, { current, previous: before }, palette),
    table: {
      title: rows.length > capped.length ? `${t('reports.details', 'Details')} (${capped.length}/${rows.length})` : t('reports.details', 'Details'),
      columns: cols.map((col) => ({ header: col.header, align: col.align === 'right' ? 'right' : 'left', weight: kind === 'sold' ? SOLD_PDF_WEIGHTS[col.key] : undefined })),
      rows: capped.map((row) => cols.map((col) => col.text(row))),
      total,
    },
    moreTables,
    footer: `${companyName} · ${kindLabel(kind)}`,
    pageLabel: (page, count) => t('reports.pageOf', 'Page {page} of {total}', { page, total: count }),
  }

  await downloadReportPdf(spec)
}

function Reports() {
  const { session } = useAuth()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'EUR'
  const [kind, setKind] = useState<ReportKind>('sales')
  const [period, setPeriod] = useState<PaymentPeriod>('month')
  const [from, setFrom] = useState(monthStartIso)
  const [to, setTo] = useState(localIso)
  const [pdfBusy, setPdfBusy] = useState(false)

  const dated = usesPeriod(kind)
  const customReady = period !== 'custom' || (from !== '' && to !== '' && from <= to)

  const query = useQuery({
    queryKey: ['app', 'reports', { kind, period: dated ? period : 'all', from, to }],
    queryFn: () =>
      getReport(kind, dated && customReady
        ? {
            period,
            from: period === 'custom' ? from : undefined,
            to: period === 'custom' ? to : undefined,
          }
        : {}),
    enabled: !dated || customReady,
  })

  const data = query.data
  const cols = useMemo(() => (data ? columnsFor(kind, currency, data) : []), [kind, currency, data])
  const tiles = data ? kpisFor(kind, data.kpis, currency) : []
  const rows = data ? tableRows(data) : []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">{t('nav.reports', 'Reports')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('reports.subtitle', 'Sales, tax, unpaid invoices, stock and clients for this company.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!data || isEmpty(data)}
          className={cn(headerButton, 'bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50')}
          onClick={() => {
            if (!data) return
            exportPayload(kind, data, currency, session?.company?.name ?? '', period, from, to).catch((error) =>
              push({ tone: 'danger', title: getErrorMessage(error) }),
            )
          }}
        >
          <FileSpreadsheet className="h-4 w-4 text-brand-600" />
          {t('reports.export', 'Export Excel')}
        </button>
        <button
          type="button"
          disabled={!data || isEmpty(data) || pdfBusy}
          className={cn(headerButton, 'bg-brand-600 text-brand-on hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50')}
          onClick={() => {
            if (!data) return
            setPdfBusy(true)
            exportPdfPayload(kind, data, currency, session?.company?.name ?? '', period, from, to)
              .catch((error) => push({ tone: 'danger', title: getErrorMessage(error) }))
              .finally(() => setPdfBusy(false))
          }}
        >
          <FileDown className="h-4 w-4" />
          {pdfBusy ? t('reports.makingPdf', 'Making the PDF…') : t('reports.exportPdf', 'Export PDF')}
        </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div
          role="tablist"
          aria-label={t('reports.kind', 'Report')}
          className="flex gap-1 overflow-x-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {REPORT_KINDS.map((option) => {
            const Icon = KIND_META[option].icon
            const active = kind === option
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                  active ? 'bg-brand-600 text-brand-on shadow-xs' : 'text-slate-600 hover:bg-slate-100',
                )}
                onClick={() => setKind(option)}
              >
                <Icon className="h-3.5 w-3.5" />
                {kindLabel(option)}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          {dated ? (
            <>
              <Select
                aria-label={t('payments.period', 'Period')}
                value={period}
                className="w-[11.5rem] shrink-0"
                onChange={(event) => setPeriod(event.target.value as PaymentPeriod)}
              >
                <option value="all">{t('common.all', 'All')}</option>
                <option value="month">{t('sales.thisMonth', 'This month')}</option>
                <option value="week">{t('payments.thisWeek', 'This week')}</option>
                <option value="day">{t('payments.thisDay', 'Today')}</option>
                <option value="custom">{t('payments.custom', 'Custom')}</option>
              </Select>
              {period === 'custom' ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  <label className="sr-only" htmlFor="reports-from">
                    {t('payments.from', 'From')}
                  </label>
                  <input
                    id="reports-from"
                    type="date"
                    value={from}
                    max={to}
                    onChange={(event) => setFrom(event.target.value)}
                    className={dateInputClass}
                  />
                  <span className="text-[11px] text-slate-400">–</span>
                  <label className="sr-only" htmlFor="reports-to">
                    {t('payments.to', 'To')}
                  </label>
                  <input
                    id="reports-to"
                    type="date"
                    value={to}
                    min={from}
                    onChange={(event) => setTo(event.target.value)}
                    className={dateInputClass}
                  />
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-[12px] text-slate-500">{t('reports.snapshotHint', 'Live snapshot — date range does not apply.')}</p>
          )}
        </div>
      </div>

      {query.isPending && data === undefined ? (
        <>
          <SkeletonStatGrid />
          <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
            {Array.from({ length: 4 }).map((_item, index) => (
              <Skeleton key={index} className="mb-2 h-12 w-full" />
            ))}
          </div>
        </>
      ) : query.isError ? (
        <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
          <EmptyState
            icon={AlertTriangle}
            title={t('common.error', 'Something went wrong')}
            description={getErrorMessage(query.error)}
            primaryAction={<Button onClick={() => void query.refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
        </div>
      ) : data && isEmpty(data) ? (
        <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
          <EmptyState
            icon={KIND_META[kind].icon}
            title={
              dated
                ? t('reports.emptyTitle', 'Nothing in this period')
                : t('reports.snapshotEmpty', 'Nothing to show yet')
            }
            description={
              kind === 'receipts'
                ? t('reports.emptyReceipts', 'Try another date range, or issue a delivery receipt.')
                : dated
                ? t('reports.emptyBody', 'Try another date range, or issue invoices, delivery notes or proformas.')
                : t('reports.snapshotEmptyBody', 'Add products and suppliers, then come back.')
            }
          />
        </div>
      ) : data ? (
        <>
          <div className={cn('grid grid-cols-2 gap-3', tiles.length > 4 ? 'xl:grid-cols-6 lg:grid-cols-3' : tiles.length > 3 ? 'lg:grid-cols-5' : 'lg:grid-cols-3')}>
            {tiles.map((item) => (
              <Stat key={item.label} {...item} />
            ))}
          </div>

          <Charts kind={kind} data={data} currency={currency} />

          <ReportTable cols={cols} rows={rows} />

          {kind === 'receipts' ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{t('reports.productsCount', 'Products')}</h2>
              <ReportTable cols={receiptProductColumns(currency, data)} rows={data.products ?? []} />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function ReportTable({ cols, rows }: { cols: Column[]; rows: ReportRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
      <div className="hidden overflow-x-auto md:block">
        <div className="flex items-center bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
          <span className="w-8 shrink-0">{t('reports.rank', '#')}</span>
          {cols.map((col) => (
            <span key={col.key} className={cn('min-w-0 flex-1', col.align === 'right' ? 'text-right' : '')}>
              {col.header}
            </span>
          ))}
        </div>
        {rows.map((row, index) => (
          <div key={index} className="flex items-center border-t border-slate-100 px-4 py-3 text-[13px]">
            <span className="w-8 shrink-0 text-[11px] text-slate-400">{index + 1}</span>
            {cols.map((col) => (
              <span
                key={col.key}
                className={cn(
                  'min-w-0 flex-1',
                  col.align === 'right' ? 'text-right' : 'text-slate-800',
                )}
              >
                {col.node ? col.node(row) : col.text(row)}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[13px] font-semibold text-slate-900">
                {cols[0]?.node ? cols[0].node(row) : cols[0] ? cols[0].text(row) : ''}
              </p>
              <span className="text-[11px] text-slate-400">{index + 1}</span>
            </div>
            {cols.slice(1).map((col) =>
              col.hideOnPhone ? null : (
                <p key={col.key} className="flex items-center justify-between gap-3 text-[12px] text-slate-500">
                  <span>{col.header}</span>
                  <span className={cn(col.align === 'right' ? 'text-slate-800' : 'text-slate-800')}>
                    {col.node ? col.node(row) : col.text(row)}
                  </span>
                </p>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Charts({ kind, data, currency }: { kind: ReportKind; data: ReportPayload; currency: string }) {
  const series = (data.series ?? []).map((point) => ({
    name: formatDay(point.day),
    cents: point.total_cents,
    count: point.document_count,
  }))

  const typeSlices: Slice[] = (data.breakdown ?? []).map((row, index) => ({
    name: kind === 'stock' ? stockLabel(row.key) : kind === 'sales' ? docTypeLabel(row.key) : row.label ?? row.key,
    value: kind === 'stock' ? row.count : row.total_cents,
    color: kind === 'stock' ? stockColor(row.key) : CHART[index % CHART.length]!,
    money: kind !== 'stock',
  })).filter((slice) => slice.value > 0)

  const statusSlices: Slice[] = (data.status ?? []).map((row) => ({
    name: paymentLabel(row.key),
    value: row.count,
    color: statusColor(row.key),
  })).filter((slice) => slice.value > 0)

  const rowSlices = (label: (row: ReportRow) => string, valueKey: string, money = true): Slice[] =>
    (data.rows ?? []).slice(0, 8).map((row, index) => ({
      name: label(row),
      value: asNumber(row[valueKey]),
      color: CHART[index % CHART.length]!,
      money,
    })).filter((slice) => slice.value > 0)

  if (kind === 'sales') {
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {series.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.byDay', 'Sales by day')}>
            <MoneyBars data={series} currency={currency} />
          </ChartCard>
        ) : null}
        {typeSlices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.byType', 'By document')}>
            <Donut data={typeSlices} currency={currency} center={formatCents(data.kpis.total_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
        {statusSlices.length > 0 ? (
          <ChartCard className="lg:col-span-5" title={t('reports.byStatus', 'By payment status')}>
            <CountBars data={statusSlices.map((slice) => ({ name: slice.name, count: slice.value, fill: slice.color }))} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'tax') {
    const bars = (data.rows ?? []).map((row) => ({
      name: `${asNumber(row.rate)}%`,
      base: asNumber(row.base_cents),
      tax: asNumber(row.tax_cents),
    }))
    const slices: Slice[] = (data.rows ?? []).map((row, index) => ({
      name: `${asNumber(row.rate)}%`,
      value: asNumber(row.tax_cents),
      color: CHART[index % CHART.length]!,
      money: true,
    })).filter((slice) => slice.value > 0)
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.byRate', 'By tax rate')}>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgb(241 245 249)' }} formatter={(value, name) => [formatCents(Number(value), currency), name === 'tax' ? t('reports.taxAmount', 'Tax') : t('reports.base', 'Base')]} />
                  <Bar dataKey="base" fill="var(--app-secondary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="tax" fill="var(--app-primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.taxAmount', 'Tax')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.tax_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'products' || kind === 'sold') {
    const bars = (data.rows ?? []).slice(0, 8).map((row) => ({
      name: asText(row.article),
      count: asNumber(row.quantity),
      fill: 'var(--app-primary)',
    }))
    const slices = rowSlices((row) => asText(row.article), 'total_cents')
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.topProducts', 'Top products')}>
            <CountBars data={bars} />
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.share', 'Share')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.total_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'outstanding') {
    const status = [
      { name: t('reports.pending', 'Pending'), count: data.kpis.pending_count ?? 0, fill: '#d97706' },
      { name: t('reports.partial', 'Partial'), count: data.kpis.partial_count ?? 0, fill: '#0284c7' },
    ].filter((row) => row.count > 0)
    const slices: Slice[] = (data.rows ?? []).slice(0, 6).map((row, index) => ({
      name: asText(row.client_name),
      value: asNumber(row.outstanding_cents),
      color: CHART[index % CHART.length]!,
      money: true,
    })).filter((slice) => slice.value > 0)
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {status.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.byStatus', 'By payment status')}>
            <CountBars data={status} />
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.topClients', 'Top clients')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.outstanding_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'payments') {
    const bars = (data.rows ?? []).map((row) => ({
      name: row.method_name ? asText(row.method_name) : t('payments.noMethod', 'No method'),
      count: asNumber(row.document_count),
      fill: 'var(--app-primary)',
    }))
    const slices: Slice[] = (data.rows ?? []).map((row, index) => ({
      name: row.method_name ? asText(row.method_name) : t('payments.noMethod', 'No method'),
      value: asNumber(row.received_cents),
      color: CHART[index % CHART.length]!,
      money: true,
    })).filter((slice) => slice.value > 0)
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.documents', 'Documents')}>
            <CountBars data={bars} />
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.byMethod', 'By method')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.received_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'stock') {
    const bars = (data.rows ?? []).slice(0, 8).map((row) => ({
      name: asText(row.article),
      count: asNumber(row.quantity),
      fill: stockColor(asText(row.band)),
    }))
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.units', 'Units')}>
            <CountBars data={bars} />
          </ChartCard>
        ) : null}
        {typeSlices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.stockBands', 'Stock health')}>
            <Donut data={typeSlices} currency={currency} center={String(data.kpis.product_count ?? 0)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'receipts') {
    const products = (data.products ?? []).slice(0, 8)
    const bars = products.map((row) => ({ name: asText(row.article), count: asNumber(row.quantity), fill: 'var(--app-primary)' }))
    const slices: Slice[] = products.map((row, index) => ({
      name: asText(row.article),
      value: asNumber(row.total_cents),
      color: CHART[index % CHART.length]!,
      money: true,
    })).filter((slice) => slice.value > 0)
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.topProducts', 'Top products')}>
            <CountBars data={bars} />
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.share', 'Share')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.total_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  if (kind === 'clients') {
    const bars = (data.rows ?? []).slice(0, 8).map((row) => ({
      name: asText(row.client_name),
      cents: asNumber(row.total_cents),
    }))
    const slices: Slice[] = [
      { name: t('reports.paid', 'Paid'), value: data.kpis.paid_cents ?? 0, color: '#059669', money: true },
      { name: t('payments.outstanding', 'Outstanding'), value: data.kpis.outstanding_cents ?? 0, color: '#d97706', money: true },
    ].filter((slice) => slice.value > 0)
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {bars.length > 0 ? (
          <ChartCard className="lg:col-span-3" title={t('reports.topClients', 'Top clients')}>
            <MoneyBars data={bars} currency={currency} />
          </ChartCard>
        ) : null}
        {slices.length > 0 ? (
          <ChartCard className="lg:col-span-2" title={t('reports.statusMix', 'Status mix')}>
            <Donut data={slices} currency={currency} center={formatCents(data.kpis.total_cents ?? 0, currency)} />
          </ChartCard>
        ) : null}
      </div>
    )
  }

  const bars = (data.rows ?? []).map((row) => ({
    name: row.supplier_name ? asText(row.supplier_name) : t('reports.noSupplier', 'No supplier'),
    count: asNumber(row.product_count),
    fill: 'var(--app-primary)',
  }))
  const slices = rowSlices((row) => (row.supplier_name ? asText(row.supplier_name) : t('reports.noSupplier', 'No supplier')), 'stock_value_cents')
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {bars.length > 0 ? (
        <ChartCard className="lg:col-span-3" title={t('reports.productsCount', 'Products')}>
          <CountBars data={bars} />
        </ChartCard>
      ) : null}
      {slices.length > 0 ? (
        <ChartCard className="lg:col-span-2" title={t('reports.stockValue', 'Stock value')}>
          <Donut data={slices} currency={currency} center={formatCents(data.kpis.stock_value_cents ?? 0, currency)} />
        </ChartCard>
      ) : null}
    </div>
  )
}

function ChartCard({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line/80 bg-card p-4 shadow-xs', className)}>
      <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{title}</p>
      {children}
    </div>
  )
}

function MoneyBars({ data, currency }: { data: Array<{ name: string; cents: number }>; currency: string }) {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={shortTick} />
          <Tooltip
            cursor={{ fill: 'rgb(241 245 249)' }}
            formatter={(value) => [formatCents(Number(value), currency), t('reports.total', 'Total')]}
          />
          <Bar dataKey="cents" fill="var(--app-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function shortTick(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value
}

function CountBars({ data }: { data: Array<{ name: string; count: number; fill?: string }> }) {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" tickFormatter={shortTick} />
          <Tooltip cursor={{ fill: 'rgb(241 245 249)' }} formatter={(value) => [String(value), t('reports.quantity', 'Quantity')]} />
          <Bar dataKey="count" fill="var(--app-primary)" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((row, index) => (
              <Cell key={row.name} fill={row.fill ?? CHART[index % CHART.length]!} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Donut({ data, currency, center }: { data: Slice[]; currency: string; center: string }) {
  return (
    <div>
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={3} strokeWidth={0}>
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, item) => {
                const money = Boolean((item?.payload as Slice | undefined)?.money)
                return [money ? formatCents(Number(value), currency) : String(value), String(name)]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-[13px] font-bold text-slate-900">{center}</p>
        </div>
      </div>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ background: slice.color }} />
            {slice.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShareBar({ value, total }: { value: number; total: number }) {
  const pct = shareValue(value, total)
  return (
    <span className="inline-flex w-full min-w-0 items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.min(pct, 100)}%` }} />
      </span>
      <span className="w-10 text-right text-[11px] text-slate-500">{pct.toFixed(0)}%</span>
    </span>
  )
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[10px] font-bold tracking-[0.04em] text-brand-600 uppercase ring-1 ring-brand-200">
      {docTypeLabel(type)}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase', paymentTone(status))}>
      {paymentLabel(status)}
    </span>
  )
}

function StockChip({ band }: { band: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold tracking-[0.04em] uppercase', stockTone(band))}>
      {stockLabel(band)}
    </span>
  )
}

function DaysChip({ days }: { days: number }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold', days >= 30 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600')}>
      {days}
    </span>
  )
}

function Stat({ label, value, hint, tile, icon }: Tile) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tile)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">{label}</p>
        <p className="text-[15px] font-bold leading-tight text-slate-900 sm:truncate sm:text-lg">{value}</p>
        <p className="truncate text-[11px] leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

export default Reports
