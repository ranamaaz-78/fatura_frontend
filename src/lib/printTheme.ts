import type { CSSProperties } from 'react'
import { PRINT_FONT_STACK } from './printFonts'
import type { PrintFontKey } from './printFonts'
import type { PrintableType, PrintTemplate } from '../types/printables'
import type { SaleType } from '../types/sales'

export const FALLBACK_PRINT_THEME: Omit<PrintTemplate, 'type'> = {
  primary_color: '#004ac6',
  font_key: 'geist',
  footer_notes: '',
  notes: '',
  show_logo: true,
  show_signature: false,
}

export function printableTypeFor(type: SaleType | PrintableType): PrintableType {
  if (type === 'albaran' || type === 'quotation' || type === 'proforma' || type === 'factura') return type
  return 'factura'
}

export function pickPrintTemplate(
  templates: PrintTemplate[] | undefined,
  type: SaleType | PrintableType,
): PrintTemplate {
  const printable = printableTypeFor(type)
  return templates?.find((row) => row.type === printable) ?? { type: printable, ...FALLBACK_PRINT_THEME }
}

export function mixHex(hex: string, towardWhite: number): string {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return '#f8fafc'
  const channels = [0, 2, 4].map((start) => Number.parseInt(raw.slice(start, start + 2), 16))
  const mix = (channel: number) => Math.round(channel + (255 - channel) * towardWhite)
  return `#${channels.map((channel) => mix(channel).toString(16).padStart(2, '0')).join('')}`
}

export function printSheetStyle(color: string, fontKey: PrintFontKey | string): CSSProperties {
  const accent = /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : '#004ac6'
  const font = PRINT_FONT_STACK[fontKey] ?? PRINT_FONT_STACK.geist
  return {
    '--print-accent': accent,
    '--print-soft': mixHex(accent, 0.94),
    '--print-tint': mixHex(accent, 0.88),
    '--print-border': mixHex(accent, 0.78),
    '--print-stripe': mixHex(accent, 0.96),
    fontFamily: font,
  } as CSSProperties
}
