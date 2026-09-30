import { PRINT_FONTS } from '../lib/printFonts'
import type { PrintFontKey } from '../lib/printFonts'

export type PrintableType = 'factura' | 'albaran' | 'quotation' | 'proforma'

export type { PrintFontKey }

export type PrintTemplate = {
  type: PrintableType
  primary_color: string
  font_key: PrintFontKey
  footer_notes: string
  /** Printed on every new document of this type. Changed only in Printables. */
  notes: string
  show_logo: boolean
  show_signature: boolean
}

export type PrintTemplatesPayload = {
  logo_url: string | null
  templates: PrintTemplate[]
}

export type PrintTemplateInput = Omit<PrintTemplate, 'type'>

export const PRINTABLE_TYPES: PrintableType[] = ['factura', 'albaran', 'quotation', 'proforma']

export { PRINT_FONTS }
