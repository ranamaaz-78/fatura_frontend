import { BAR_HEIGHT, SYMBOL_HEIGHT, TEXT_BASELINE, type BarcodeGeometry, type BarcodeRect } from './barcode'

/**
 * Bar and space widths for every Code 128 symbol, read left to right starting
 * with a bar. Index 106 is the stop symbol and carries a seventh element.
 */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

const START_B = 104
const START_C = 105
const CODE_B = 100
const STOP = 106
const QUIET = 10

/**
 * Code set B, which covers every printable ASCII character. Returns null for
 * anything outside that range, so the caller can fall back to plain text.
 */
export function code128Geometry(value: string): BarcodeGeometry | null {
  const encoded = encodeCode128(value)
  if (!encoded) return null

  const { symbols } = encoded
  const bars: BarcodeRect[] = []
  let x = QUIET

  for (const symbol of symbols) {
    let bar = true
    for (const digit of PATTERNS[symbol]!) {
      const width = Number(digit)
      if (bar) bars.push({ x, width, height: BAR_HEIGHT })
      x += width
      bar = !bar
    }
  }

  const width = x + QUIET
  // Shrink the caption on long codes so it never runs past the bars.
  const fontSize = Math.max(6, Math.min(12, (width * 0.8) / (value.length * 0.62)))

  return {
    width,
    height: SYMBOL_HEIGHT,
    fontSize,
    bars,
    digits: [{ x: width / 2, y: TEXT_BASELINE, anchor: 'middle', text: value }],
  }
}

/**
 * The symbol values for a code, checksum and stop included. A code made only of digits is packed two to a symbol
 * (subset C), which takes about half the bars of one symbol per digit, so every bar can be drawn wider on the same
 * label. An odd digit at the end switches to subset B for itself. Anything else is subset B. Null for characters
 * Code 128 cannot hold.
 */
export function encodeCode128(value: string): { symbols: number[] } | null {
  if (value.length === 0) return null

  const body: number[] = []
  let start = START_B

  if (/^\d{4,}$/.test(value)) {
    start = START_C
    const pairs = value.length - (value.length % 2)
    for (let index = 0; index < pairs; index += 2) {
      body.push(Number(value.slice(index, index + 2)))
    }
    if (value.length % 2 === 1) {
      body.push(CODE_B, value.charCodeAt(value.length - 1) - 32)
    }
  } else {
    for (const character of value) {
      const symbol = character.charCodeAt(0) - 32
      if (symbol < 0 || symbol > 94) return null
      body.push(symbol)
    }
  }

  let checksum = start
  body.forEach((symbol, index) => {
    checksum += symbol * (index + 1)
  })

  return { symbols: [start, ...body, checksum % 103, STOP] }
}
