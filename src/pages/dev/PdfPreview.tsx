import { renderReportPages, type ReportPdfSpec } from '../../lib/reportPdf'

/** Development only (never in a build): a sample report, so the PDF layout can be looked at without a server. */
const days = Array.from({ length: 31 }, (_item, index) => `${String(index + 1).padStart(2, '0')}/10`)
const sales = days.map((_day, index) => Math.round(30000 + Math.sin(index / 3) * 18000 + (index % 7 === 5 ? 26000 : 0) + index * 700))
const average = sales.map((_value, index) => Math.round(sales.slice(Math.max(0, index - 6), index + 1).reduce((sum, value) => sum + value, 0) / Math.min(index + 1, 7)))
const running = (values: number[]) => {
  let total = 0
  return values.map((value) => (total += value))
}
const before = sales.map((value, index) => Math.round(value * (0.8 + (index % 5) / 25)))

const spec: ReportPdfSpec = {
  filename: 'preview.pdf',
  title: 'Sales',
  company: 'Tienda Lumen SL',
  periodText: 'This month',
  generated: 'Generated 08/11/2026',
  currency: 'EUR',
  brand: '#1e3a8a',
  tiles: [
    { label: 'Documents', value: '46', hint: '12 clients' },
    { label: 'Paid docs', value: '31', hint: '€12,044.10' },
    { label: 'Open docs', value: '15', hint: '9 pending' },
    { label: 'Total', value: '€18,493.40', hint: 'Sales' },
    { label: 'Outstanding', value: '€6,449.30', hint: '6 partial' },
    { label: 'Clients', value: '12', hint: 'By document' },
  ],
  comparisonTitle: 'Compared with the period before (01/09/2026 – 30/09/2026)',
  comparisonHeaders: { metric: 'Metric', current: 'This period', previous: 'Previous period', change: 'Change' },
  comparison: [
    { label: 'Total', current: '€18,493.40', previous: '€15,210.00', change: 21.6 },
    { label: 'Documents', current: '46', previous: '52', change: -11.5 },
    { label: 'Paid', current: '€12,044.10', previous: '€11,100.00', change: 8.5 },
    { label: 'Outstanding', current: '€6,449.30', previous: '€4,110.00', change: 56.9, goodWhen: 'down' },
    { label: 'Clients', current: '12', previous: '12', change: 0 },
  ],
  chartsTitle: 'Analysis',
  charts: [
    { type: 'bars', title: 'Sales by day', money: true, labels: days, values: sales, color: '#1e3a8a', barName: 'Sales', line: { name: '7-day average', color: '#b45309', values: average }, wide: true },
    { type: 'trend', title: 'Running total: this period vs the one before', money: true, labels: days, series: [{ name: 'This period', color: '#1e3a8a', values: running(sales) }, { name: 'Previous period', color: '#94a3b8', values: running(before) }] },
    { type: 'bars', title: 'Which weekdays sell most', money: true, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [240000, 310000, 290000, 350000, 480000, 520000, 90000], color: '#0369a1', barName: 'Sales' },
    { type: 'donut', title: 'By document', money: true, center: '€18,493.40', slices: [{ name: 'Invoice', value: 1200000, color: '#1e3a8a' }, { name: 'Delivery note', value: 420000, color: '#0369a1' }, { name: 'Quotation', value: 180000, color: '#b45309' }, { name: 'Proforma', value: 49340, color: '#6d28d9' }] },
    { type: 'donut', title: 'By payment status', money: false, center: '46', slices: [{ name: 'Paid', value: 31, color: '#059669' }, { name: 'Pending', value: 9, color: '#d97706' }, { name: 'Partial', value: 6, color: '#0284c7' }] },
    { type: 'rank', title: 'Top clients', money: true, color: '#1e3a8a', items: ['Carlos Ruiz', 'Ana Martín', 'Javier López', 'Marta Sánchez', 'Pedro Gómez', 'Elena Díaz'].map((name, index) => ({ name, value: 420000 - index * 55000 })) },
  ],
  table: {
    title: 'Details',
    columns: [
      { header: 'Document', align: 'left' },
      { header: 'Documents', align: 'right' },
      { header: 'Paid docs', align: 'right' },
      { header: 'Open docs', align: 'right' },
      { header: 'Total', align: 'right' },
    ],
    rows: Array.from({ length: 70 }, (_item, index) => [`Invoice F-202610/${String(index + 1).padStart(5, '0')}`, String(index + 1), String(index % 3), String(index % 2), `€${(index * 137.5 + 99).toFixed(2)}`]),
    total: ['Total', '2,485', '70', '35', '€170,982.50'],
  },
  footer: 'Tienda Lumen SL · Sales',
  pageLabel: (page, total) => `Page ${page} of ${total}`,
}

declare global {
  interface Window {
    __pdfPages?: () => Promise<string[]>
  }
}

export default function PdfPreview() {
  window.__pdfPages = () => renderReportPages(spec)
  return <p className="p-6 text-sm">Sample report ready: call window.__pdfPages().</p>
}
