import { t } from '../i18n'
import { centsToExcelAmount, downloadStyledReport } from './exportReport'
import { downloadFileName, fileDate } from './fileName'
import type { Purchase } from '../types/purchases'
import { formatDate } from './format'
import { formatCents } from './money'
import { downloadReportPdf, type PdfChart } from './reportPdf'

/** "2026-10-28" as dd/mm/yyyy, without going through a time zone. */
function day(value: string): string {
  const [year, month, date] = value.split('-')
  return `${date}/${month}/${year}`
}

/**
 * The purchases as an Excel sheet: one row for each product bought (date, number, supplier, product, how many, the
 * rate and the line total), cancelled purchases marked as such and left out of the totals.
 */
export async function downloadPurchases(purchases: Purchase[], context: { companyName: string; currency: string; filters: string }): Promise<void> {
  const rows: Array<Array<string | number | null>> = []
  let pieces = 0
  let spent = 0
  let counted = 0
  let cancelled = 0

  for (const purchase of purchases) {
    if (purchase.is_voided) cancelled += 1
    else counted += 1

    for (const line of purchase.lines ?? []) {
      // A cancelled purchase is listed but adds nothing: its stock was taken back.
      const live = !purchase.is_voided
      if (live) {
        pieces += line.quantity
        spent += line.total_cents
      }
      rows.push([
        day(purchase.purchased_on),
        purchase.number,
        purchase.supplier_name,
        purchase.supplier_invoice_no ?? '',
        line.article,
        line.quantity,
        centsToExcelAmount(line.unit_cost),
        live ? centsToExcelAmount(line.total_cents) : 0,
        purchase.is_voided ? t('purchases.statusCancelled', 'Cancelled') : '',
      ])
    }
  }

  const title = t('nav.purchases', 'Purchases')

  await downloadStyledReport({
    filename: downloadFileName([context.companyName, title, fileDate()], 'xlsx'),
    title,
    subtitle: [context.companyName, context.filters, `${t('reports.generated', 'Generated')} ${day(fileDate())}`].filter(Boolean).join('  ·  '),
    currency: context.currency,
    summaryTitle: t('reports.summary', 'Summary'),
    tableTitle: t('reports.details', 'Details'),
    totalLabel: t('reports.total', 'Total'),
    summary: [
      { label: t('purchases.exportPurchases', 'Purchases'), value: counted, format: 'count' },
      { label: t('purchases.pieces', 'pieces'), value: pieces, format: 'count' },
      { label: t('purchases.exportSpent', 'Spent'), value: centsToExcelAmount(spent), format: 'money' },
      ...(cancelled > 0 ? [{ label: t('purchases.statusCancelled', 'Cancelled'), value: cancelled, format: 'count' as const }] : []),
    ],
    columns: [
      { header: t('purchases.date', 'Purchase date'), format: 'text' },
      { header: t('purchases.number', 'Number'), format: 'text' },
      { header: t('purchases.supplier', 'Supplier'), format: 'text' },
      { header: t('purchases.invoiceNoShort', 'Supplier invoice no.'), format: 'text' },
      { header: t('sales.article', 'Article'), format: 'text' },
      // Not added up here: a cancelled purchase still shows its pieces, but they are not in stock. The summary has the pieces.
      { header: t('purchases.quantity', 'Quantity'), format: 'count' },
      { header: t('purchases.rate', 'Buying price'), format: 'money' },
      { header: t('purchases.lineTotal', 'Total'), format: 'money', sum: true },
      { header: t('sales.status', 'Status'), format: 'text' },
    ],
    rows,
  })
}

const PALETTE = ['#1e3a8a', '#0369a1', '#b45309', '#6d28d9', '#be123c', '#047857', '#334155']

/**
 * The purchases as a PDF: the headline numbers, who was bought from and what was bought most, and a table with one line
 * for each purchase (cancelled ones are listed and marked, and left out of every total).
 */
export async function downloadPurchasesPdf(purchases: Purchase[], context: { companyName: string; currency: string; filters: string; brand: string }): Promise<void> {
  const live = purchases.filter((purchase) => !purchase.is_voided)
  const spent = live.reduce((sum, purchase) => sum + purchase.total_cents, 0)
  const pieces = live.reduce((sum, purchase) => sum + (purchase.lines ?? []).reduce((count, line) => count + line.quantity, 0), 0)
  const cancelled = purchases.length - live.length

  const bySupplier = new Map<string, number>()
  const byProduct = new Map<string, number>()
  const byDay = new Map<string, number>()
  for (const purchase of live) {
    bySupplier.set(purchase.supplier_name, (bySupplier.get(purchase.supplier_name) ?? 0) + purchase.total_cents)
    byDay.set(purchase.purchased_on, (byDay.get(purchase.purchased_on) ?? 0) + purchase.total_cents)
    for (const line of purchase.lines ?? []) byProduct.set(line.article, (byProduct.get(line.article) ?? 0) + line.quantity)
  }
  const ranked = (source: Map<string, number>) => [...source.entries()].map(([name, value]) => ({ name, value })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
  const suppliers = ranked(bySupplier)
  const products = ranked(byProduct)
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))

  const charts: PdfChart[] = []
  if (days.length > 1) {
    charts.push({ type: 'bars', title: t('purchases.pdfByDay', 'Spent by day'), money: true, labels: days.map(([key]) => day(key).slice(0, 5)), values: days.map(([, value]) => value), color: context.brand, barName: t('purchases.exportSpent', 'Spent'), wide: true })
  }
  if (suppliers.length > 0) {
    charts.push({ type: 'rank', title: t('purchases.pdfBySupplier', 'Who you bought from'), money: true, color: context.brand, items: suppliers.slice(0, 8) })
    charts.push({ type: 'donut', title: t('purchases.pdfShare', 'Share of what was spent'), money: true, center: formatCents(spent, context.currency), slices: suppliers.slice(0, 6).map((item, index) => ({ ...item, color: PALETTE[index % PALETTE.length]! })) })
  }
  if (products.length > 0) {
    charts.push({ type: 'rank', title: t('purchases.pdfTopProducts', 'Most bought products (pieces)'), money: false, color: '#0369a1', items: products.slice(0, 8) })
  }

  const items = (purchase: Purchase) => {
    const text = (purchase.lines ?? []).map((line) => `${line.article} x${line.quantity}`).join(', ')
    return text.length > 70 ? `${text.slice(0, 69)}…` : text
  }

  await downloadReportPdf({
    filename: downloadFileName([context.companyName, t('nav.purchases', 'Purchases'), fileDate()], 'pdf'),
    title: t('nav.purchases', 'Purchases'),
    company: context.companyName,
    periodText: context.filters || t('purchases.pdfAll', 'All purchases'),
    generated: `${t('reports.generated', 'Generated')} ${formatDate(new Date())}`,
    currency: context.currency,
    brand: context.brand,
    tiles: [
      { label: t('purchases.exportPurchases', 'Purchases'), value: String(live.length), hint: cancelled > 0 ? `${cancelled} ${t('purchases.statusCancelled', 'Cancelled').toLowerCase()}` : undefined },
      { label: t('purchases.pieces', 'pieces'), value: String(pieces) },
      { label: t('purchases.exportSpent', 'Spent'), value: formatCents(spent, context.currency) },
    ],
    chartsTitle: charts.length > 0 ? t('reports.analysis', 'Analysis') : undefined,
    charts,
    table: {
      title: t('reports.details', 'Details'),
      columns: [
        { header: t('purchases.date', 'Purchase date'), align: 'left' },
        { header: t('purchases.number', 'Number'), align: 'left' },
        { header: t('purchases.supplier', 'Supplier'), align: 'left' },
        { header: t('purchases.invoiceNoShort', 'Supplier invoice no.'), align: 'left' },
        { header: t('purchases.items', 'Products'), align: 'left' },
        { header: t('purchases.total', 'Total'), align: 'right' },
        { header: t('sales.status', 'Status'), align: 'left' },
      ],
      rows: purchases.slice(0, 600).map((purchase) => [
        day(purchase.purchased_on),
        purchase.number,
        purchase.supplier_name,
        purchase.supplier_invoice_no ?? '',
        items(purchase),
        formatCents(purchase.total_cents, context.currency),
        purchase.is_voided ? t('purchases.statusCancelled', 'Cancelled') : '',
      ]),
      total: ['', '', '', '', t('reports.total', 'Total'), formatCents(spent, context.currency), ''],
    },
    footer: `${context.companyName} · ${t('nav.purchases', 'Purchases')}`,
    pageLabel: (page, count) => t('reports.pageOf', 'Page {page} of {total}', { page, total: count }),
  })
}
