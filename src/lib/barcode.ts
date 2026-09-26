import { code128Geometry } from './code128'
import { ean13Geometry } from './ean13'

export type BarcodeRect = { x: number; width: number; height: number }
export type BarcodeText = { x: number; y: number; anchor: 'start' | 'middle'; text: string }

export type BarcodeGeometry = {
  /** Module units, quiet zones included, so the SVG scales to any label size. */
  width: number
  height: number
  fontSize: number
  bars: BarcodeRect[]
  digits: BarcodeText[]
}

export const SYMBOL_HEIGHT = 70
export const BAR_HEIGHT = 60
/** EAN-13 guard bars run past the digit row. */
export const GUARD_HEIGHT = 66
export const TEXT_BASELINE = 69

/**
 * EAN-13 when the code really is one, Code 128 otherwise. Codes that only look
 * like an EAN (wrong check digit) still have to print something a scanner reads.
 */
export function barcodeGeometry(code: string): BarcodeGeometry | null {
  const trimmed = code.trim()
  if (trimmed === '') return null

  return ean13Geometry(trimmed) ?? code128Geometry(trimmed)
}

export function barcodeSymbolHeight(geometry: BarcodeGeometry): number {
  return geometry.bars.reduce((tallest, bar) => Math.max(tallest, bar.height), 0)
}
