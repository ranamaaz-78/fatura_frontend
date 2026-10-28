import { BAR_HEIGHT, barcodeGeometry } from './barcode'
import type { RollMetrics } from './printLabels'

/**
 * A roll label drawn as a one-bit picture at the printer's own resolution. The printer driver then has nothing to
 * round: every bar is a whole number of dots, every pixel is a dot, so lines cannot run together and text has no grey
 * edges to turn into smudges. Used for thermal label printers; laser and inkjet keep the vector label.
 */

const MM_PER_PT = 0.3528
const FONT = "'Geist', 'Segoe UI', Arial, sans-serif"

export type BitmapLabel = {
  article: string
  price: string
  barcode: string
  /** The company name at the top of the label. */
  store?: string
}

export type BitmapSettings = {
  width: number
  height: number
  dpi: number
  metrics: RollMetrics
  showName: boolean
  showPrice: boolean
  showStore?: boolean
  /** Millimetres to move everything right and down, to line it up on the roll. */
  offsetX: number
  offsetY: number
}

/** Null when this environment has no canvas (a server render, a test), or the code cannot be drawn as bars. */
export function labelBitmap(label: BitmapLabel, settings: BitmapSettings): string | null {
  if (typeof document === 'undefined') return null

  const geometry = barcodeGeometry(label.barcode)
  if (!geometry) return null

  const { metrics, dpi } = settings
  const k = dpi / 25.4
  const px = (mm: number) => Math.round(mm * k)

  const width = px(settings.width)
  const height = px(settings.height)
  const innerWidth = Math.floor(metrics.innerWidth * k)

  // Whole dots per bar. If even one dot per bar does not fit, a bitmap cannot do better than the vector label.
  const module = Math.floor(innerWidth / geometry.width + 0.05)
  if (module < 1) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#000000'
  context.textBaseline = 'alphabetic'

  const gap = px(metrics.gap)
  const nameHeight = settings.showName ? px(metrics.nameHeight) : 0
  const priceHeight = settings.showPrice ? px(metrics.priceHeight) : 0
  const showStore = Boolean(settings.showStore && label.store)
  const storeHeight = showStore ? px(metrics.storeHeight) : 0
  const block = px(metrics.block)
  const rows = Number(settings.showName) + Number(settings.showPrice) + Number(showStore)
  const contentHeight = storeHeight + nameHeight + block + priceHeight + rows * gap
  const shiftX = px(settings.offsetX)
  let y = Math.max(0, Math.floor((height - contentHeight) / 2)) + px(settings.offsetY)

  if (showStore) {
    const size = Math.max(6, Math.round(metrics.storePt * MM_PER_PT * k))
    context.font = `600 ${size}px ${FONT}`
    context.textAlign = 'center'
    context.fillText(fitText(context, label.store ?? '', innerWidth), Math.round(width / 2) + shiftX, y + Math.round(storeHeight * 0.82))
    y += storeHeight + gap
  }

  if (settings.showName) {
    const size = Math.max(6, Math.round(metrics.namePt * MM_PER_PT * k))
    context.font = `700 ${size}px ${FONT}`
    context.textAlign = 'center'
    context.fillText(fitText(context, label.article, innerWidth), Math.round(width / 2) + shiftX, y + Math.round(nameHeight * 0.82))
    y += nameHeight + gap
  }

  // The bars and, under them, a strip for the digits. An EAN-13's guard bars reach down beside the digits.
  const digit = Math.min(2.4, Math.max(1.0, metrics.block * 0.2))
  const digitPx = Math.max(6, Math.round(digit * k))
  const stripPx = Math.round(digitPx * 1.15)
  const barsHeight = Math.max(4, block - stripPx)
  const left = Math.floor((width - geometry.width * module) / 2) + shiftX

  for (const bar of geometry.bars) {
    const guard = bar.height > BAR_HEIGHT
    context.fillRect(left + bar.x * module, y, bar.width * module, guard ? barsHeight + Math.round(digitPx * 0.55) : barsHeight)
  }

  context.font = `400 ${digitPx}px ${FONT}`
  const single = geometry.digits.length === 1
  for (const item of geometry.digits) {
    context.textAlign = item.anchor === 'start' ? 'left' : 'center'
    if (single) {
      context.fillText(fitText(context, item.text, Math.floor(geometry.width * module * 0.95)), left + item.x * module, y + block - Math.round(digitPx * 0.18))
    } else {
      context.fillText(item.text, left + item.x * module, y + block - Math.round(digitPx * 0.18))
    }
  }
  y += block + gap

  if (settings.showPrice) {
    const size = Math.max(7, Math.round(metrics.pricePt * MM_PER_PT * k))
    context.font = `700 ${size}px ${FONT}`
    context.textAlign = 'center'
    context.fillText(label.price, Math.round(width / 2) + shiftX, y + Math.round(priceHeight * 0.82))
  }

  // One bit per dot: anything that is not clearly dark is white, so there is nothing grey for the printer to dither.
  const picture = context.getImageData(0, 0, width, height)
  const data = picture.data
  for (let index = 0; index < data.length; index += 4) {
    const dark = data[index]! * 0.299 + data[index + 1]! * 0.587 + data[index + 2]! * 0.114 < 150
    const value = dark ? 0 : 255
    data[index] = value
    data[index + 1] = value
    data[index + 2] = value
    data[index + 3] = 255
  }
  context.putImageData(picture, 0, 0)

  return canvas.toDataURL('image/png')
}

/** The text cut with an ellipsis so it fits in `max` pixels. */
function fitText(context: CanvasRenderingContext2D, text: string, max: number): string {
  if (context.measureText(text).width <= max) return text

  let shorter = text
  while (shorter.length > 1 && context.measureText(`${shorter}…`).width > max) {
    shorter = shorter.slice(0, -1)
  }

  return `${shorter.trimEnd()}…`
}
