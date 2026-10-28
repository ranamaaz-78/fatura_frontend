import { t } from '../i18n'
import { centsToExcelAmount, downloadStyledReport } from './exportReport'
import { downloadFileName, fileDate } from './fileName'
import type { Purchase } from '../types/purchases'

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
      { header: t('purchases.rate', 'Rate (each)'), format: 'money' },
      { header: t('purchases.lineTotal', 'Total'), format: 'money', sum: true },
      { header: t('sales.status', 'Status'), format: 'text' },
    ],
    rows,
  })
}
