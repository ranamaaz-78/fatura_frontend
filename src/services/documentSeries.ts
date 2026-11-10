import { api, unwrap } from './api'

/** How invoices are numbered: the built-in numbers, or the company's own that continue from one typed number. */
export type InvoiceNumbering = {
  mode: 'auto' | 'manual'
  /** The number the next invoice gets, e.g. ALP-00234 or F-202610/00002. */
  next_number: string
  /** The last number handed out under the company's own numbers, or null. */
  last_number: string | null
  /** What a built-in number looks like, for the example on the screen. */
  automatic_example: string
}

export type InvoiceNumberingInput = { mode: 'auto' } | { mode: 'manual'; next_number: string }

export function getInvoiceNumbering(): Promise<InvoiceNumbering> {
  return unwrap<InvoiceNumbering>(api.get('/app/document-series'))
}

export function saveInvoiceNumbering(input: InvoiceNumberingInput): Promise<InvoiceNumbering> {
  return unwrap<InvoiceNumbering>(api.put('/app/document-series', input))
}
