import { barcodeGeometry } from './barcode'
import { formatCents } from './money'

export type LabelSheet = 'a4-24' | 'a4-40' | 'thermal-58'

export type LabelSheetSpec = {
  id: LabelSheet
  label: string
  columns: number
  /** Millimetres, so the browser prints at the real label size. */
  labelWidth: number
  labelHeight: number
  page: string
  margin: number
  perSheet: number
}

export const LABEL_SHEETS: LabelSheetSpec[] = [
  { id: 'a4-24', label: 'A4 sheet, 24 labels', columns: 3, labelWidth: 64, labelHeight: 33.9, page: 'A4', margin: 8, perSheet: 24 },
  { id: 'a4-40', label: 'A4 sheet, 40 labels', columns: 4, labelWidth: 48.5, labelHeight: 25.4, page: 'A4', margin: 8, perSheet: 40 },
  { id: 'thermal-58', label: 'Thermal roll 58 mm', columns: 1, labelWidth: 54, labelHeight: 30, page: '58mm 30mm', margin: 1, perSheet: 1 },
]

export type LabelProduct = {
  article: string
  sr_number: string | null
  barcode: string
  selling_price: number
}

export type LabelOptions = {
  sheet: LabelSheet
  copies: number
  showName: boolean
  showPrice: boolean
  showSku: boolean
  currency: string
}

export function sheetSpec(id: LabelSheet): LabelSheetSpec {
  return LABEL_SHEETS.find((sheet) => sheet.id === id) ?? LABEL_SHEETS[0]!
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[char]};`)
}

/** Vector bars, so the print stays sharp at any label size. */
function barcodeMarkup(code: string): string {
  const geometry = barcodeGeometry(code)
  if (!geometry) {
    return `<div class="fallback">${escapeHtml(code)}</div>`
  }

  const bars = geometry.bars
    .map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="${bar.height}" />`)
    .join('')
  const digits = geometry.digits
    .map(
      (digit) =>
        `<text x="${digit.x}" y="${digit.y}" text-anchor="${digit.anchor}" font-size="${geometry.fontSize}">${digit.text}</text>`,
    )
    .join('')

  return `<svg class="bars" viewBox="0 0 ${geometry.width} ${geometry.height}" preserveAspectRatio="xMidYMid meet">${bars}${digits}</svg>`
}

export function buildLabelSheet(products: LabelProduct[], options: LabelOptions): string {
  const spec = sheetSpec(options.sheet)
  const copies = Math.max(1, Math.min(200, options.copies))

  const cells = products
    .flatMap((product) => Array.from({ length: copies }, () => product))
    .map((product) => {
      const name = options.showName ? `<div class="name">${escapeHtml(product.article)}</div>` : ''
      const sku = options.showSku && product.sr_number ? `<div class="sku">${escapeHtml(product.sr_number)}</div>` : ''
      const price = options.showPrice
        ? `<div class="price">${escapeHtml(formatCents(product.selling_price, options.currency))}</div>`
        : ''
      return `<div class="label">${name}${barcodeMarkup(product.barcode)}${sku}${price}</div>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Barcode labels</title>
<style>
  @page { size: ${spec.page}; margin: ${spec.margin}mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; color: #0f172a; }
  .sheet { display: grid; grid-template-columns: repeat(${spec.columns}, ${spec.labelWidth}mm); gap: 2mm; }
  .label {
    width: ${spec.labelWidth}mm; height: ${spec.labelHeight}mm;
    padding: 1.5mm; border: 0.2mm dashed #cbd5e1; border-radius: 1mm;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6mm;
    page-break-inside: avoid; overflow: hidden;
  }
  .name { font-size: 6pt; font-weight: 700; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sku, .fallback { font-family: 'JetBrains Mono', monospace; font-size: 5pt; color: #475569; }
  .price { font-family: 'JetBrains Mono', monospace; font-size: 8pt; font-weight: 700; }
  .bars { width: 100%; height: ${spec.labelHeight * 0.45}mm; fill: #0f172a; font-family: 'JetBrains Mono', monospace; }
  @media print { .label { border-color: transparent; } }
</style>
</head>
<body><div class="sheet">${cells}</div></body>
</html>`
}

/** Returns false when the browser blocked the print window. */
export function printLabelSheet(products: LabelProduct[], options: LabelOptions): boolean {
  const target = window.open('', '_blank', 'width=900,height=700')
  if (!target) return false

  target.document.open()
  target.document.write(buildLabelSheet(products, options))
  target.document.close()
  target.focus()
  // Give the layout a tick before the print dialog freezes rendering.
  target.setTimeout(() => target.print(), 300)
  return true
}
