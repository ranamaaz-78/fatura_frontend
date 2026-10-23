import {
  BAR_HEIGHT,
  GUARD_HEIGHT,
  SYMBOL_HEIGHT,
  TEXT_BASELINE,
  type BarcodeGeometry,
  type BarcodeRect,
  type BarcodeText,
} from './barcode'

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']

export function ean8CheckDigit(sevenDigits: string): number {
  let sum = 0
  for (let index = 0; index < 7; index += 1) {
    sum += Number(sevenDigits[index]) * (index % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

export function isEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false
  return ean8CheckDigit(code.slice(0, 7)) === Number(code[7])
}

/** The 67 modules of an EAN-8: `true` where a bar is drawn, and which of them are guard bars. */
export function encodeEan8(code: string): { modules: boolean[]; guards: boolean[] } | null {
  if (!isEan8(code)) return null

  const digits = code.split('').map(Number)
  let pattern = '101'
  for (let index = 0; index < 4; index += 1) pattern += L[digits[index]!]!
  pattern += '01010'
  for (let index = 4; index < 8; index += 1) pattern += R[digits[index]!]!
  pattern += '101'

  return {
    modules: pattern.split('').map((bit) => bit === '1'),
    guards: pattern.split('').map((_, index) => index < 3 || (index >= 31 && index < 36) || index >= 64),
  }
}

const QUIET = 7

/**
 * A short code of 8 digits (7 and a check digit) in 67 modules instead of the 95 of an EAN-13: the same label fits
 * wider bars. Scanners read it everywhere EAN-13 is read.
 */
export function ean8Geometry(code: string): BarcodeGeometry | null {
  const encoded = encodeEan8(code)
  if (!encoded) return null

  const bars: BarcodeRect[] = []
  let index = 0

  while (index < encoded.modules.length) {
    if (!encoded.modules[index]) {
      index += 1
      continue
    }
    const start = index
    const guard = encoded.guards[index]!
    while (index < encoded.modules.length && encoded.modules[index] && encoded.guards[index] === guard) {
      index += 1
    }
    bars.push({ x: QUIET + start, width: index - start, height: guard ? GUARD_HEIGHT : BAR_HEIGHT })
  }

  const digits: BarcodeText[] = []
  for (let position = 0; position < 4; position += 1) {
    digits.push({ x: QUIET + 6.5 + position * 7, y: TEXT_BASELINE, anchor: 'middle', text: code[position]! })
    digits.push({ x: QUIET + 39.5 + position * 7, y: TEXT_BASELINE, anchor: 'middle', text: code[position + 4]! })
  }

  return { width: 67 + QUIET * 2, height: SYMBOL_HEIGHT, fontSize: 9, bars, digits }
}
