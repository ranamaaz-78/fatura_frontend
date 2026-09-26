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
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']

/** The first digit is not printed as bars; it picks the parity of the left half. */
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function ean13CheckDigit(twelveDigits: string): number {
  let sum = 0
  for (let index = 0; index < 12; index += 1) {
    sum += Number(twelveDigits[index]) * (index % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

export function isEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  return ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
}

export type Ean13Bars = {
  /** 95 modules, `true` where a bar is drawn. */
  modules: boolean[]
  /** Guard bars run below the digit row, so they are drawn taller. */
  guards: boolean[]
}

/** Returns null when the code is not a valid EAN-13, so callers can fall back to text. */
export function encodeEan13(code: string): Ean13Bars | null {
  if (!isEan13(code)) return null

  const digits = code.split('').map(Number) as number[]
  const parity = PARITY[digits[0]!]!
  let pattern = '101'

  for (let index = 0; index < 6; index += 1) {
    const digit = digits[index + 1]!
    pattern += parity[index] === 'L' ? L[digit]! : G[digit]!
  }

  pattern += '01010'

  for (let index = 0; index < 6; index += 1) {
    pattern += R[digits[index + 7]!]!
  }

  pattern += '101'

  const guards = pattern.split('').map((_, index) => {
    const inStart = index < 3
    const inMiddle = index >= 45 && index < 50
    const inEnd = index >= 92
    return inStart || inMiddle || inEnd
  })

  return { modules: pattern.split('').map((bit) => bit === '1'), guards }
}

const QUIET = 7

/**
 * Bar and digit positions in module units. Sharing the geometry keeps the
 * on-screen preview and the printed sheet identical.
 */
export function ean13Geometry(code: string): BarcodeGeometry | null {
  const encoded = encodeEan13(code)
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
    bars.push({
      x: QUIET + start,
      width: index - start,
      height: guard ? GUARD_HEIGHT : BAR_HEIGHT,
    })
  }

  const digits: BarcodeText[] = [{ x: 0, y: TEXT_BASELINE, anchor: 'start', text: code[0]! }]
  for (let position = 0; position < 6; position += 1) {
    digits.push({ x: QUIET + 6.5 + position * 7, y: TEXT_BASELINE, anchor: 'middle', text: code[position + 1]! })
    digits.push({ x: QUIET + 53.5 + position * 7, y: TEXT_BASELINE, anchor: 'middle', text: code[position + 7]! })
  }

  return { width: 95 + QUIET * 2, height: SYMBOL_HEIGHT, fontSize: 9, bars, digits }
}
