import { t } from '../i18n'
import type { LedgerEntry, LedgerStatement, LedgerSupplierRow } from '../types/ledger'
import { centsToExcelAmount, downloadStyledReport, type ReportColumnFormat } from './exportReport'
import { downloadFileName, fileDate } from './fileName'
import { formatDate } from './format'
import { formatCents } from './money'
import { downloadReportPdf, type PdfChart, type PdfTile } from './reportPdf'
import { parseIso } from './reportAnalytics'

export type LedgerExportFormat = 'xlsx' | 'pdf'

type Context = { companyName: string; currency: string; brand: string; filters?: string }

/** One cell: money is kept in cents until it is written (Excel wants a number of euros, a PDF wants text). */
type Cell = string | number | null

type Table = {
  title: string
  filters: string
  summary: { label: string; value: number; format: ReportColumnFormat }[]
  columns: { header: string; format: ReportColumnFormat; align?: 'left' | 'right'; sum?: boolean }[]
  rows: Cell[][]
  /** The same rows' charts for the PDF. */
  charts: PdfChart[]
}

const PALETTE = ['#1e3a8a', '#0369a1', '#b45309', '#6d28d9', '#be123c', '#047857', '#334155']

/** Whole days between a date (YYYY-MM-DD) and today. */
export function daysSince(day: string): number {
  const start = parseIso(day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000))
}

const showDate = (value: string | null) => (value ? formatDate(parseIso(value)) : '')

const statusText = (entry: LedgerEntry) =>
  entry.is_voided ? t('ledger.statusCancelled', 'Cancelled') : entry.payment_status === 'paid' ? t('ledger.payPaid', 'Paid') : entry.payment_status === 'partial' ? t('ledger.payPartial', 'Partly paid') : t('ledger.payUnpaid', 'Unpaid')

function write(format: LedgerExportFormat, table: Table, context: Context): Promise<void> {
  const title = table.title
  const subtitle = [context.companyName, table.filters, `${t('reports.generated', 'Generated')} ${formatDate(new Date())}`].filter(Boolean).join('  ·  ')
  const filename = downloadFileName([context.companyName, title, fileDate()], format)

  if (format === 'xlsx') {
    return downloadStyledReport({
      filename,
      title,
      subtitle,
      currency: context.currency,
      summaryTitle: t('reports.summary', 'Summary'),
      tableTitle: t('reports.details', 'Details'),
      totalLabel: t('reports.total', 'Total'),
      summary: table.summary.map((item) => ({ label: item.label, value: item.format === 'money' ? centsToExcelAmount(item.value) : item.value, format: item.format })),
      columns: table.columns.map((column) => ({ header: column.header, format: column.format, sum: column.sum })),
      rows: table.rows.map((row) => row.map((cell, index) => (table.columns[index]?.format === 'money' && typeof cell === 'number' ? centsToExcelAmount(cell) : cell))),
    })
  }

  const tiles: PdfTile[] = table.summary.map((item) => ({ label: item.label, value: item.format === 'money' ? formatCents(item.value, context.currency) : String(item.value) }))
  const text = (cell: Cell, format: ReportColumnFormat) => (cell === null ? '' : format === 'money' && typeof cell === 'number' ? formatCents(cell, context.currency) : String(cell))
  const total = table.columns.some((column) => column.sum)
    ? table.columns.map((column, index) => {
        if (index === 0) return t('reports.total', 'Total')
        if (!column.sum) return ''
        const sum = table.rows.reduce((acc, row) => acc + (typeof row[index] === 'number' ? (row[index] as number) : 0), 0)
        return text(sum, column.format)
      })
    : undefined

  return downloadReportPdf({
    filename,
    title,
    company: context.companyName,
    periodText: table.filters || t('ledger.allTime', 'All entries'),
    generated: `${t('reports.generated', 'Generated')} ${formatDate(new Date())}`,
    currency: context.currency,
    brand: context.brand,
    tiles,
    chartsTitle: table.charts.length > 0 ? t('reports.analysis', 'Analysis') : undefined,
    charts: table.charts,
    table: {
      title: t('reports.details', 'Details'),
      columns: table.columns.map((column) => ({ header: column.header, align: column.align ?? (column.format === 'text' ? 'left' : 'right') })),
      rows: table.rows.slice(0, 600).map((row) => row.map((cell, index) => text(cell, table.columns[index]!.format))),
      total,
    },
    footer: `${context.companyName} · ${title}`,
    pageLabel: (page, count) => t('reports.pageOf', 'Page {page} of {total}', { page, total: count }),
  })
}

/* ------------------------------------------------------------------------------------------------ the entries */

/** Every entry that matches the filters, as a ledger list: amount, paid, balance, when it was last paid and how old it is. */
export function exportLedgerEntries(format: LedgerExportFormat, entries: LedgerEntry[], context: Context): Promise<void> {
  const live = entries.filter((entry) => !entry.is_voided)
  const bought = live.reduce((sum, entry) => sum + entry.amount_cents, 0)
  const paid = live.reduce((sum, entry) => sum + entry.paid_cents, 0)

  const owedBySupplier = new Map<string, number>()
  for (const entry of live) owedBySupplier.set(entry.supplier_name, (owedBySupplier.get(entry.supplier_name) ?? 0) + entry.owed_cents)
  const ranked = [...owedBySupplier.entries()].map(([name, value]) => ({ name, value })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)

  const counts = { paid: 0, partial: 0, unpaid: 0 }
  for (const entry of live) counts[entry.payment_status] += 1

  const charts: PdfChart[] = []
  if (ranked.length > 0) {
    charts.push({ type: 'rank', title: t('ledger.owedBySupplier', 'Who you owe the most'), money: true, color: context.brand, items: ranked.slice(0, 8) })
    charts.push({ type: 'donut', title: t('ledger.owedShare', 'Share of what is owed'), money: true, center: formatCents(bought - paid, context.currency), slices: ranked.slice(0, 6).map((item, index) => ({ ...item, color: PALETTE[index % PALETTE.length]! })) })
  }
  const statusSlices = [
    { name: t('ledger.payPaid', 'Paid'), value: counts.paid, color: '#059669' },
    { name: t('ledger.payPartial', 'Partly paid'), value: counts.partial, color: '#d97706' },
    { name: t('ledger.payUnpaid', 'Unpaid'), value: counts.unpaid, color: '#be123c' },
  ].filter((slice) => slice.value > 0)
  if (statusSlices.length > 0) charts.push({ type: 'donut', title: t('ledger.byPayment', 'By payment status'), money: false, center: String(live.length), slices: statusSlices })

  return write(
    format,
    {
      title: t('nav.ledger', 'Supplier Payments'),
      filters: context.filters ?? '',
      summary: [
        { label: t('ledger.statEntries', 'Entries'), value: live.length, format: 'count' },
        { label: t('ledger.bought', 'Bought'), value: bought, format: 'money' },
        { label: t('ledger.paid', 'Paid'), value: paid, format: 'money' },
        { label: t('ledger.owed', 'Still owed'), value: bought - paid, format: 'money' },
      ],
      columns: [
        { header: t('ledger.date', 'Date'), format: 'text' },
        { header: t('ledger.number', 'Number'), format: 'text' },
        { header: t('ledger.supplier', 'Supplier'), format: 'text' },
        { header: t('ledger.description', 'What came from the supplier'), format: 'text' },
        { header: t('ledger.refShort', 'Invoice no.'), format: 'text' },
        { header: t('ledger.amount', 'Amount'), format: 'money', sum: true },
        { header: t('ledger.paid', 'Paid'), format: 'money', sum: true },
        { header: t('ledger.balance', 'Balance'), format: 'money', sum: true },
        { header: t('ledger.lastPaid', 'Last payment'), format: 'text' },
        { header: t('ledger.payments', 'Payments'), format: 'count' },
        { header: t('ledger.age', 'Days open'), format: 'count' },
        { header: t('sales.status', 'Status'), format: 'text' },
      ],
      rows: entries.map((entry) => [
        showDate(entry.bill_date),
        entry.number,
        entry.supplier_name,
        entry.description,
        entry.reference ?? '',
        entry.is_voided ? 0 : entry.amount_cents,
        entry.is_voided ? 0 : entry.paid_cents,
        entry.is_voided ? 0 : entry.owed_cents,
        showDate(entry.last_paid_on ?? null),
        entry.payments_count ?? 0,
        !entry.is_voided && entry.owed_cents > 0 ? daysSince(entry.bill_date) : null,
        statusText(entry),
      ]),
      charts,
    },
    context,
  )
}

/* ------------------------------------------------------------------------------------------------ by supplier */

export function exportLedgerSuppliers(format: LedgerExportFormat, rows: LedgerSupplierRow[], context: Context): Promise<void> {
  const bought = rows.reduce((sum, row) => sum + row.bought_cents, 0)
  const paid = rows.reduce((sum, row) => sum + row.paid_cents, 0)
  const owing = rows.filter((row) => row.owed_cents > 0).sort((a, b) => b.owed_cents - a.owed_cents)

  const charts: PdfChart[] = []
  if (owing.length > 0) {
    charts.push({ type: 'rank', title: t('ledger.owedBySupplier', 'Who you owe the most'), money: true, color: context.brand, items: owing.slice(0, 8).map((row) => ({ name: row.supplier_name, value: row.owed_cents })) })
    charts.push({ type: 'donut', title: t('ledger.owedShare', 'Share of what is owed'), money: true, center: formatCents(bought - paid, context.currency), slices: owing.slice(0, 6).map((row, index) => ({ name: row.supplier_name, value: row.owed_cents, color: PALETTE[index % PALETTE.length]! })) })
  }
  const boughtSlices = [...rows].sort((a, b) => b.bought_cents - a.bought_cents).slice(0, 6).map((row, index) => ({ name: row.supplier_name, value: row.bought_cents, color: PALETTE[index % PALETTE.length]! })).filter((slice) => slice.value > 0)
  if (boughtSlices.length > 0) charts.push({ type: 'donut', title: t('ledger.boughtShare', 'Share of what was bought'), money: true, center: formatCents(bought, context.currency), slices: boughtSlices })

  return write(
    format,
    {
      title: `${t('nav.ledger', 'Supplier Payments')} · ${t('ledger.viewSuppliers', 'By supplier')}`,
      filters: context.filters ?? '',
      summary: [
        { label: t('ledger.suppliers', 'Suppliers'), value: rows.length, format: 'count' },
        { label: t('ledger.bought', 'Bought'), value: bought, format: 'money' },
        { label: t('ledger.paid', 'Paid'), value: paid, format: 'money' },
        { label: t('ledger.owed', 'Still owed'), value: bought - paid, format: 'money' },
      ],
      columns: [
        { header: t('ledger.supplier', 'Supplier'), format: 'text' },
        { header: t('ledger.entries', 'Entries'), format: 'count', sum: true },
        { header: t('ledger.bought', 'Bought'), format: 'money', sum: true },
        { header: t('ledger.paid', 'Paid'), format: 'money', sum: true },
        { header: t('ledger.balance', 'Balance'), format: 'money', sum: true },
        { header: t('ledger.lastBought', 'Last purchase'), format: 'text' },
        { header: t('ledger.lastPaid', 'Last payment'), format: 'text' },
        { header: t('ledger.oldestOpen', 'Oldest open (days)'), format: 'count' },
      ],
      rows: rows.map((row) => [
        row.supplier_name,
        row.entries_count,
        row.bought_cents,
        row.paid_cents,
        row.owed_cents,
        showDate(row.last_bill_date),
        showDate(row.last_paid_on),
        row.oldest_open_on ? daysSince(row.oldest_open_on) : null,
      ]),
      charts,
    },
    context,
  )
}

/* ------------------------------------------------------------------------------------------------ one supplier's account */

/** A supplier's account as a ledger page: opening balance, each purchase and payment with the running balance, closing balance. */
export function exportLedgerStatement(format: LedgerExportFormat, statement: LedgerStatement, context: Context): Promise<void> {
  const period = statement.from || statement.to ? `${statement.from ? showDate(statement.from) : '…'} → ${statement.to ? showDate(statement.to) : '…'}` : t('ledger.allTime', 'All entries')

  const rows: Cell[][] = [
    ...(statement.from ? [[showDate(statement.from), t('ledger.opening', 'Opening balance'), '', '', null, null, statement.opening_cents]] : []),
    ...statement.transactions.map((move): Cell[] => [
      showDate(move.date),
      move.type === 'bill' ? t('ledger.typeBill', 'Purchase') : t('ledger.typePayment', 'Payment'),
      move.number,
      [move.details, move.reference ? `(${move.reference})` : ''].filter(Boolean).join(' '),
      move.bought_cents > 0 ? move.bought_cents : null,
      move.paid_cents > 0 ? move.paid_cents : null,
      move.balance_cents,
    ]),
  ]

  const labels = statement.transactions.map((move) => showDate(move.date).slice(0, 5))
  const charts: PdfChart[] = statement.transactions.length > 1
    ? [{ type: 'trend', title: t('ledger.balanceOverTime', 'What was owed, over time'), money: true, labels, series: [{ name: t('ledger.balance', 'Balance'), color: context.brand, values: statement.transactions.map((move) => move.balance_cents) }], wide: true }]
    : []

  return write(
    format,
    {
      title: `${statement.supplier.name} · ${t('ledger.account', 'Account')}`,
      filters: period,
      summary: [
        { label: t('ledger.opening', 'Opening balance'), value: statement.opening_cents, format: 'money' },
        { label: t('ledger.bought', 'Bought'), value: statement.bought_cents, format: 'money' },
        { label: t('ledger.paid', 'Paid'), value: statement.paid_cents, format: 'money' },
        { label: t('ledger.closing', 'Closing balance'), value: statement.closing_cents, format: 'money' },
      ],
      columns: [
        { header: t('ledger.date', 'Date'), format: 'text' },
        { header: t('ledger.type', 'Type'), format: 'text' },
        { header: t('ledger.number', 'Number'), format: 'text' },
        { header: t('ledger.details', 'Details'), format: 'text' },
        { header: t('ledger.bought', 'Bought'), format: 'money', sum: true },
        { header: t('ledger.paid', 'Paid'), format: 'money', sum: true },
        { header: t('ledger.balance', 'Balance'), format: 'money' },
      ],
      rows,
      charts,
    },
    context,
  )
}
