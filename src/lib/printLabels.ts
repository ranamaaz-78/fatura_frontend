import { BAR_HEIGHT, barcodeGeometry } from './barcode'
import { labelBitmap } from './labelBitmap'
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

/**
 * How finely the label printer draws: a thermal roll printer is usually 203 dpi, some are 300. Bars are placed on
 * whole dots, because a bar that falls between two dots is drawn a dot wider or thinner and neighbouring bars run
 * together. 0 is a laser or inkjet printer, which needs no such care.
 */
export type PrinterDpi = 203 | 300 | 0
export const DEFAULT_DPI: PrinterDpi = 203

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

/**
 * Width x height, as it is written on the roll. Only the sizes shops use most, and on which an EAN-13 prints with
 * bars a scanner reads. Any other roll is a "Custom size".
 */
const ROLL_SIZES: [number, number][] = [
  [40, 30], [50, 30], [50, 25], [40, 25], [30, 20], [60, 40],
]

export const LABEL_SHEETS: LabelSheetSpec[] = [
  { id: 'a4-24', label: t('printLabels.a4_sheet_24_labels_64_33_9_mm', 'A4 sheet, 24 labels (64 × 33.9 mm)'), columns: 3, labelWidth: 64, labelHeight: 33.9, page: 'A4', margin: 8, gap: 2, perSheet: 24 },
  { id: 'a4-40', label: t('printLabels.a4_sheet_40_labels_48_5_25_4_mm', 'A4 sheet, 40 labels (48.5 × 25.4 mm)'), columns: 4, labelWidth: 48.5, labelHeight: 25.4, page: 'A4', margin: 8, gap: 2, perSheet: 40 },
  { id: 'thermal-58', label: t('printLabels.thermal_roll_58_mm', 'Thermal roll 58 mm'), columns: 1, labelWidth: 54, labelHeight: 30, page: '58mm 30mm', margin: 1, gap: 0, perSheet: 1 },
  ...ROLL_SIZES.map(([width, height]) => roll(width, height)),
]

export type LabelProduct = {
  article: string
  barcode: string
  selling_price: number
}

export type LabelOptions = {
  sheet: LabelSheet
  copies: number
  showName: boolean
  showPrice: boolean
  currency: string
  /** Roll labels only: turn the label a quarter so width and height swap. */
  turned?: boolean
  /** Used when sheet is "custom". */
  custom?: CustomLabel
  textSize?: TextSize
  barHeight?: BarHeight
  /** Draw a thin border around every label. */
  border?: boolean
  dpi?: PrinterDpi
  /** Millimetres to move the content right and down, to line it up on the roll. */
  offsetX?: number
  offsetY?: number
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

const MM_PER_PT = 0.3528
/** The smallest barcode (bars and digits) worth printing: shorter than this and a scanner struggles. */
export const MIN_BARCODE_MM = 5.2
/** A bar thinner than this is hard for cheap scanners. Still printed, but the screen says so. */
export const GOOD_MODULE_MM = 0.19
/** An EAN-13 with its quiet zones, in bar widths: what a typical label has to fit. */
const SAMPLE_UNITS = 109
const BAR_SHARE: Record<BarHeight, number> = { short: 0.7, normal: 0.9, tall: 1 }

export type LabelWanted = { showName: boolean; showPrice: boolean; textSize: TextSize; barHeight: BarHeight }

/** How the parts of a roll label share its height, in millimetres and points. */
export type RollMetrics = {
  /** Top and bottom. */
  padding: number
  /** Left and right: a thermal head does not reach the very edge of the label. */
  paddingX: number
  gap: number
  innerWidth: number
  innerHeight: number
  namePt: number
  pricePt: number
  nameHeight: number
  priceHeight: number
  /** Bars and digits together. */
  block: number
}

/** One dot of the printer in millimetres. A laser or inkjet is taken as 600 dpi, which is where its bars land evenly. */
export function dotMm(dpi: PrinterDpi): number {
  return 25.4 / (dpi === 0 ? 600 : dpi)
}

/** Sheets of labels (A4) print on an office printer; only a roll is drawn for a thermal printer's own dots. */
function dpiFor(spec: LabelSheetSpec, dpi: PrinterDpi): PrinterDpi {
  return spec.roll ? dpi : 0
}

/** The widest a bar is drawn on a sheet label: a bigger one gains nothing and only crowds the label. */
const SHEET_MAX_MODULE_MM = 0.4
/** The tallest a barcode block is drawn on a sheet label. */
const SHEET_MAX_BLOCK_MM = 18

/** The label as drawn: a little shorter than the paper it is cut from. */
export function rollHeight(spec: LabelSheetSpec): number {
  return spec.roll ? spec.labelHeight - ROLL_SLACK_MM : spec.labelHeight
}

const ROLL_SLACK_MM = 0.3

/** The parts of a roll label for these choices, or null when the barcode would end up too short to scan. */
export function rollMetrics(spec: LabelSheetSpec, wanted: LabelWanted): RollMetrics | null {
  const padding = Math.min(spec.labelWidth, spec.labelHeight) <= 15 ? 0.8 : 1
  const paddingX = 1.4
  const innerWidth = spec.labelWidth - paddingX * 2
  // A hair short of the paper, so a label never spills onto the next page and feeds a blank one.
  const innerHeight = rollHeight(spec) - padding * 2
  const scale = Math.min(1.15, Math.max(0.8, Math.min(spec.labelWidth, spec.labelHeight) / 30)) * TEXT_FACTOR[wanted.textSize]

  // The type shrinks a little before the barcode is allowed to get too short.
  for (const shrink of [1, 0.9, 0.8, 0.7, 0.62]) {
    const namePt = Math.max(3.6, 6 * scale * shrink)
    const pricePt = Math.max(4.4, 8 * scale * shrink)
    const gap = 0.4 * Math.min(1, scale) * shrink
    const nameHeight = wanted.showName ? namePt * MM_PER_PT * 1.2 : 0
    const priceHeight = wanted.showPrice ? pricePt * MM_PER_PT * 1.2 : 0
    const rows = Number(wanted.showName) + Number(wanted.showPrice)
    const available = innerHeight - nameHeight - priceHeight - rows * gap
    const block = Math.min(available * BAR_SHARE[wanted.barHeight], spec.roll ? Infinity : SHEET_MAX_BLOCK_MM)

    if (block >= MIN_BARCODE_MM) {
      return { padding, paddingX, gap, innerWidth, innerHeight, namePt, pricePt, nameHeight, priceHeight, block }
    }
  }

  return null
}

/** Bar width in millimetres for a barcode of `units` bar widths: a whole number of printer dots when it can be. */
export function moduleMm(innerWidth: number, units: number, dpi: PrinterDpi, max = Infinity): number {
  const raw = Math.min(innerWidth / units, max)
  const dot = dotMm(dpi)
  if (raw < dot) return raw
  // A hair under a whole number of dots (a 30 mm label is 1.994 dots per bar for an EAN-13) counts as the whole
  // number: the bars run a fraction of a millimetre into the margin instead of dropping to half the width.
  return Math.floor(raw / dot + 0.05) * dot
}

export type LabelFit = {
  /** What will really print: the choices, with whatever did not fit taken off. */
  options: LabelWanted
  /** Which choices were taken off to make it fit. */
  changed: (keyof LabelWanted)[]
  /** False when not even the barcode alone fits the height of this label. */
  fits: boolean
  /** Width of the thinnest bar for a normal EAN-13, in millimetres. */
  module: number
}

/** Asks for what the shop wants, gives back what fits this label (roll labels only). */
export function fitLabelOptions(spec: LabelSheetSpec, wanted: LabelWanted, dpi: PrinterDpi = DEFAULT_DPI): LabelFit {
  let options = { ...wanted }
  const changed: (keyof LabelWanted)[] = []
  const note = (key: keyof LabelWanted) => {
    if (!changed.includes(key)) changed.push(key)
  }

  if (spec.roll) {
    const relax: (() => boolean)[] = [
      () => options.barHeight === 'tall' && ((options = { ...options, barHeight: 'normal' }), note('barHeight'), true),
      () => options.textSize === 'large' && ((options = { ...options, textSize: 'normal' }), note('textSize'), true),
      () => options.showPrice && ((options = { ...options, showPrice: false }), note('showPrice'), true),
      () => options.showName && ((options = { ...options, showName: false }), note('showName'), true),
      () => options.textSize === 'normal' && ((options = { ...options, textSize: 'small' }), note('textSize'), true),
      () => options.barHeight === 'normal' && ((options = { ...options, barHeight: 'short' }), note('barHeight'), true),
    ]

    let step = 0
    while (rollMetrics(spec, options) === null && step < relax.length) {
      relax[step]!()
      step += 1
    }
  }

  const metrics = spec.roll ? rollMetrics(spec, options) : null
  const innerWidth = metrics?.innerWidth ?? spec.labelWidth

  return {
    options,
    changed,
    fits: !spec.roll || metrics !== null,
    module: moduleMm(innerWidth, SAMPLE_UNITS, dpiFor(spec, dpi), spec.roll ? Infinity : SHEET_MAX_MODULE_MM),
  }
}

/** Which choices this label cannot take on top of what is already chosen, so the screen can switch them off. */
export function unavailableChoices(spec: LabelSheetSpec, current: LabelWanted): Record<'showName' | 'showPrice' | 'tall' | 'large', boolean> {
  if (!spec.roll) return { showName: false, showPrice: false, tall: false, large: false }

  const fitsWith = (patch: Partial<LabelWanted>) => rollMetrics(spec, { ...current, ...patch }) !== null

  return {
    showName: !current.showName && !fitsWith({ showName: true }),
    showPrice: !current.showPrice && !fitsWith({ showPrice: true }),
    tall: current.barHeight !== 'tall' && !fitsWith({ barHeight: 'tall' }),
    large: current.textSize !== 'large' && !fitsWith({ textSize: 'large' }),
  }
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

/**
 * A roll label's barcode drawn in millimetres: bar widths a whole number of printer dots, the digits in a strip of
 * their own under the bars (the guard bars of an EAN-13 reach down beside them), so lines and digits never run into
 * each other however small the label is.
 */
function rollBarcodeMarkup(code: string, metrics: RollMetrics, dpi: PrinterDpi, maxModule: number): string {
  const geometry = barcodeGeometry(code)
  if (!geometry) {
    return `<div class="fallback">${escapeHtml(code)}</div>`
  }

  const module = moduleMm(metrics.innerWidth, geometry.width, dpi, maxModule)
  const width = geometry.width * module
  const digit = Math.min(2.4, Math.max(1.0, metrics.block * 0.2))
  const strip = digit * 1.15
  const barsHeight = metrics.block - strip
  const baseline = metrics.block - digit * 0.18
  const num = (value: number) => value.toFixed(3)

  const bars = geometry.bars
    .map((bar) => {
      const guard = bar.height > BAR_HEIGHT
      return `<rect x="${num(bar.x * module)}" y="0" width="${num(bar.width * module)}" height="${num(guard ? barsHeight + digit * 0.55 : barsHeight)}" />`
    })
    .join('')

  // A long code printed as one line has to fit under its own bars.
  const single = geometry.digits.length === 1
  const fontSize = single ? Math.min(digit, (width * 0.92) / (Math.max(1, geometry.digits[0]!.text.length) * 0.56)) : digit
  const digits = geometry.digits
    .map(
      (item) =>
        `<text x="${num(item.x * module)}" y="${num(baseline)}" text-anchor="${item.anchor}" font-size="${num(fontSize)}">${escapeHtml(item.text)}</text>`,
    )
    .join('')

  return `<svg class="bars" width="${num(width)}mm" height="${num(metrics.block)}mm" viewBox="0 0 ${num(width)} ${num(metrics.block)}" shape-rendering="crispEdges">${bars}${digits}</svg>`
}

export function buildLabelSheet(products: LabelProduct[], options: LabelOptions): string {
  const spec = resolvedSpec(options.sheet, options.turned, options.custom)
  const copies = Math.max(1, Math.min(200, options.copies))
  const dpi = options.dpi ?? DEFAULT_DPI

  // A roll label only prints what fits it: a name or price that would squeeze the barcode is left off.
  const fit = fitLabelOptions(spec, {
    showName: options.showName,
    showPrice: options.showPrice,
    textSize: options.textSize ?? 'normal',
    barHeight: options.barHeight ?? 'normal',
  }, dpi)
  const showName = fit.options.showName
  const showPrice = fit.options.showPrice
  // Both rolls and sheets use the same layout (bars drawn in millimetres, digits in a strip of their own); a sheet only
  // keeps the bars from growing absurdly big, and a custom label too small for it falls back to the old drawing.
  const metrics = rollMetrics(spec, fit.options)
  const dotDpi = dpiFor(spec, dpi)
  const maxModule = spec.roll ? Infinity : SHEET_MAX_MODULE_MM

  // Sheet labels (several to a page) keep the roomy layout.
  const scale = TEXT_FACTOR[options.textSize ?? 'normal']
  const barShare = Math.min(0.85, 0.45 * BAR_FACTOR[options.barHeight ?? 'normal'])
  const padding = metrics?.padding ?? (spec.roll ? 0.8 : 1.5)

  const border = options.border
    ? 'border: 0.25mm solid #64748b; border-radius: 0.8mm;'
    : spec.roll
      ? 'border: 0; border-radius: 0;'
      : 'border: 0.2mm dashed #cbd5e1; border-radius: 1mm;'

  // Thermal printers get the label as a one-bit picture at their own resolution (see labelBitmap).
  const pictures = new Map<LabelProduct, string | null>()
  const bitmapFor = (product: LabelProduct): string | null => {
    // Only a roll is drawn dot for dot (a thermal printer); an office printer takes the vector bars.
    if (!metrics || !spec.roll || dpi === 0) return null
    if (!pictures.has(product)) {
      pictures.set(
        product,
        labelBitmap(
          { article: product.article, price: formatCents(product.selling_price, options.currency), barcode: product.barcode },
          { width: spec.labelWidth, height: rollHeight(spec), dpi, metrics, showName, showPrice, offsetX: options.offsetX ?? 0, offsetY: options.offsetY ?? 0 },
        ),
      )
    }
    return pictures.get(product) ?? null
  }

  const cells = products
    .flatMap((product) => Array.from({ length: copies }, () => product))
    .map((product) => {
      const picture = bitmapFor(product)
      if (picture) return `<div class="label raster"><img src="${picture}" alt=""></div>`
      const name = showName ? `<div class="name">${escapeHtml(product.article)}</div>` : ''
      const price = showPrice
        ? `<div class="price">${escapeHtml(formatCents(product.selling_price, options.currency))}</div>`
        : ''
      const bars = metrics ? rollBarcodeMarkup(product.barcode, metrics, dotDpi, maxModule) : barcodeMarkup(product.barcode)
      return `<div class="label">${name}${bars}${price}</div>`
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
    width: ${spec.labelWidth}mm; height: ${(metrics ? rollHeight(spec) : spec.labelHeight).toFixed(2)}mm;
    padding: ${metrics ? `${metrics.padding}mm ${metrics.paddingX}mm` : `${padding}mm`}; ${border}${spec.roll ? ' page-break-after: always;' : ''}
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${metrics ? metrics.gap.toFixed(2) : (0.6 * scale).toFixed(2)}mm;
    page-break-inside: avoid; overflow: hidden;
  }
  .label:last-child { page-break-after: auto; }
  .label > * { position: relative; left: ${(options.offsetX ?? 0).toFixed(2)}mm; top: ${(options.offsetY ?? 0).toFixed(2)}mm; }
  .label.raster { padding: 0; }
  .label.raster > img { display: block; left: 0; top: 0; width: ${spec.labelWidth}mm; height: ${rollHeight(spec).toFixed(2)}mm; image-rendering: pixelated; image-rendering: crisp-edges; }
  .name { font-size: ${metrics ? metrics.namePt.toFixed(2) : (6 * scale).toFixed(2)}pt; font-weight: 700; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;${metrics ? ` height: ${metrics.nameHeight.toFixed(2)}mm; line-height: ${metrics.nameHeight.toFixed(2)}mm;` : ''} }
  .fallback { font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; font-size: ${(5 * scale).toFixed(2)}pt; color: #475569; }
  .price { font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; font-size: ${metrics ? metrics.pricePt.toFixed(2) : (8 * scale).toFixed(2)}pt; font-weight: 700;${metrics ? ` height: ${metrics.priceHeight.toFixed(2)}mm; line-height: ${metrics.priceHeight.toFixed(2)}mm;` : ''} }
  .bars { ${metrics ? 'flex: none;' : `width: 100%; height: ${(spec.labelHeight * barShare).toFixed(2)}mm;`} fill: #0f172a; font-family: 'Geist', -apple-system, 'Segoe UI', sans-serif; }
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
