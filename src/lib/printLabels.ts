import { barcodeGeometry } from './barcode'
import { formatCents } from './money'
import { getLocale, t } from '../i18n'

/** A ready-made size ("a4-24", "roll-40x30") or "custom". */
export type LabelSheet = string

export const CUSTOM_SHEET = 'custom'

export type LabelSheetSpec = {
  id: LabelSheet
  label: string
  columns: number
  /** Millimetres, so the browser prints at the real label size. */
  labelWidth: number
  labelHeight: number
  page: string
  margin: number
  gap: number
  perSheet: number
  /** A roll of single labels: every label is its own page, cut to the label size. */
  roll?: boolean
}

export type PageSize = 'A4' | 'A5' | 'Letter'

export const PAGES: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
}

/** Everything a shop can set for a label that is not in the ready-made list. */
export type CustomLabel = {
  /** roll: one label per page, cut to size. sheet: several labels on a page. */
  layout: 'roll' | 'sheet'
  width: number
  height: number
  page: PageSize
  columns: number
  gap: number
  margin: number
}

export const DEFAULT_CUSTOM: CustomLabel = { layout: 'roll', width: 50, height: 30, page: 'A4', columns: 3, gap: 2, margin: 8 }

export type TextSize = 'small' | 'normal' | 'large'
export type BarHeight = 'short' | 'normal' | 'tall'

const TEXT_FACTOR: Record<TextSize, number> = { small: 0.8, normal: 1, large: 1.25 }
const BAR_FACTOR: Record<BarHeight, number> = { short: 0.75, normal: 1, tall: 1.2 }

function roll(width: number, height: number): LabelSheetSpec {
  return {
    id: `roll-${width}x${height}`,
    label: t('printLabels.roll_label', 'Roll label {width} × {height} mm', { width, height }),
    columns: 1,
    labelWidth: width,
    labelHeight: height,
    page: `${width}mm ${height}mm`,
    margin: 0,
    gap: 0,
    perSheet: 1,
    roll: true,
  }
}

/** Width x height, as it is written on the roll. */
const ROLL_SIZES: [number, number][] = [
  [20, 10], [20, 40], [22.5, 22.5], [25, 15], [25, 25], [30, 15], [30, 20], [30, 30], [30, 50],
  [35, 35], [38, 25], [40, 20], [40, 25], [40, 30], [40, 40], [45, 30], [50, 25], [50, 30], [50, 50],
  [60, 30], [60, 40], [70, 40], [75, 50], [100, 50], [100, 70], [100, 100],
]

export const LABEL_SHEETS: LabelSheetSpec[] = [
  { id: 'a4-24', label: t('printLabels.a4_sheet_24_labels_64_33_9_mm', 'A4 sheet, 24 labels (64 × 33.9 mm)'), columns: 3, labelWidth: 64, labelHeight: 33.9, page: 'A4', margin: 8, gap: 2, perSheet: 24 },
  { id: 'a4-40', label: t('printLabels.a4_sheet_40_labels_48_5_25_4_mm', 'A4 sheet, 40 labels (48.5 × 25.4 mm)'), columns: 4, labelWidth: 48.5, labelHeight: 25.4, page: 'A4', margin: 8, gap: 2, perSheet: 40 },
  { id: 'thermal-58', label: t('printLabels.thermal_roll_58_mm', 'Thermal roll 58 mm'), columns: 1, labelWidth: 54, labelHeight: 30, page: '58mm 30mm', margin: 1, gap: 0, perSheet: 1 },
  ...ROLL_SIZES.map(([width, height]) => roll(width, height)),
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
  /** Roll labels only: turn the label a quarter so width and height swap. */
  turned?: boolean
  /** Used when sheet is "custom". */
  custom?: CustomLabel
  textSize?: TextSize
  barHeight?: BarHeight
  /** Draw a thin border around every label. */
  border?: boolean
}

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min)

/** The custom label with every number kept to something a printer can do. */
export function cleanCustom(custom: CustomLabel): CustomLabel {
  return {
    layout: custom.layout === 'sheet' ? 'sheet' : 'roll',
    width: clamp(custom.width, 8, 300),
    height: clamp(custom.height, 6, 400),
    page: custom.page in PAGES ? custom.page : 'A4',
    columns: Math.round(clamp(custom.columns, 1, 12)),
    gap: clamp(custom.gap, 0, 30),
    margin: clamp(custom.margin, 0, 40),
  }
}

export function sheetSpec(id: LabelSheet): LabelSheetSpec {
  return LABEL_SHEETS.find((sheet) => sheet.id === id) ?? LABEL_SHEETS[0]!
}

function customSpec(raw: CustomLabel): LabelSheetSpec {
  const custom = cleanCustom(raw)

  if (custom.layout === 'roll') {
    return { ...roll(custom.width, custom.height), id: CUSTOM_SHEET, label: t('printLabels.custom_roll', 'Custom {width} × {height} mm', { width: custom.width, height: custom.height }) }
  }

  const page = PAGES[custom.page]
  const rows = Math.max(1, Math.floor((page.height - custom.margin * 2 + custom.gap) / (custom.height + custom.gap)))

  return {
    id: CUSTOM_SHEET,
    label: t('printLabels.custom_sheet', 'Custom {width} × {height} mm on {page}', { width: custom.width, height: custom.height, page: custom.page }),
    columns: custom.columns,
    labelWidth: custom.width,
    labelHeight: custom.height,
    page: custom.page,
    margin: custom.margin,
    gap: custom.gap,
    perSheet: custom.columns * rows,
  }
}

/** The spec as it will print: a roll label turned sideways swaps its width and height. */
export function resolvedSpec(id: LabelSheet, turned = false, custom: CustomLabel = DEFAULT_CUSTOM): LabelSheetSpec {
  const spec = id === CUSTOM_SHEET ? customSpec(custom) : sheetSpec(id)
  if (!spec.roll || !turned || spec.labelWidth === spec.labelHeight) return spec

  return {
    ...spec,
    labelWidth: spec.labelHeight,
    labelHeight: spec.labelWidth,
    page: `${spec.labelHeight}mm ${spec.labelWidth}mm`,
  }
}

/** Why this layout cannot print as asked, or null when it fits. */
export function layoutProblem(spec: LabelSheetSpec, custom: CustomLabel, usingCustom: boolean): string | null {
  if (!usingCustom || spec.roll) return null

  const page = PAGES[cleanCustom(custom).page]
  const across = spec.columns * spec.labelWidth + (spec.columns - 1) * spec.gap + spec.margin * 2

  if (across > page.width + 0.01) {
    return t('printLabels.too_wide', '{columns} labels of {width} mm are {across} mm wide, but the page is {page} mm. Use fewer labels per row, smaller labels or smaller margins.', { columns: spec.columns, width: spec.labelWidth, across: Math.round(across), page: page.width })
  }
  if (spec.labelHeight + spec.margin * 2 > page.height + 0.01) {
    return t('printLabels.too_tall', 'A label {height} mm tall does not fit on the page.', { height: spec.labelHeight })
  }

  return null
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
  const spec = resolvedSpec(options.sheet, options.turned, options.custom)
  const copies = Math.max(1, Math.min(200, options.copies))

  // Small labels get smaller type and a bigger share of the height for the bars.
  const base = spec.roll ? Math.min(1.15, Math.max(0.8, Math.min(spec.labelWidth, spec.labelHeight) / 30)) : 1
  const scale = base * TEXT_FACTOR[options.textSize ?? 'normal']
  const rows = Number(options.showName) + Number(options.showPrice) + Number(options.showSku)
  const share = (spec.roll ? [0.8, 0.6, 0.46, 0.36][rows]! : 0.45) * BAR_FACTOR[options.barHeight ?? 'normal']
  const barShare = Math.min(0.85, share)
  const padding = spec.roll ? 1 : 1.5

  const border = options.border
    ? 'border: 0.25mm solid #64748b; border-radius: 0.8mm;'
    : spec.roll
      ? 'border: 0; border-radius: 0;'
      : 'border: 0.2mm dashed #cbd5e1; border-radius: 1mm;'

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
<html lang="${getLocale()}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t('printLabels.title', 'Barcode labels'))}</title>
<style>
  @page { size: ${spec.page}; margin: ${spec.margin}mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; color: #0f172a; }
  .sheet { display: grid; grid-template-columns: repeat(${spec.columns}, ${spec.labelWidth}mm); gap: ${spec.gap}mm; }
  .label {
    width: ${spec.labelWidth}mm; height: ${spec.labelHeight}mm;
    padding: ${padding}mm; ${border}${spec.roll ? ' page-break-after: always;' : ''}
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${(0.6 * scale).toFixed(2)}mm;
    page-break-inside: avoid; overflow: hidden;
  }
  .label:last-child { page-break-after: auto; }
  .name { font-size: ${(6 * scale).toFixed(2)}pt; font-weight: 700; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sku, .fallback { font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; font-size: ${(5 * scale).toFixed(2)}pt; color: #475569; }
  .price { font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; font-size: ${(8 * scale).toFixed(2)}pt; font-weight: 700; }
  .bars { width: 100%; height: ${(spec.labelHeight * barShare).toFixed(2)}mm; fill: #0f172a; font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; }
  @media print { .label { ${options.border ? '' : 'border-color: transparent;'} } }
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
