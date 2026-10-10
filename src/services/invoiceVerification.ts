import { isAxiosError } from 'axios'
import { setDocumentLocale, type Locale } from '../i18n'
import type { Company } from '../types/module01'
import type { PrintTemplate } from '../types/printables'
import type { SaleDocument } from '../types/sales'
import { api, unwrap } from './api'

export type InvoiceVerification = {
  number: string
  issued_at: string | null
  total_cents: number
  currency: string | null
  voided: boolean
  voided_at: string | null
  company: { name: string | null; tax_id: string | null; city: string | null; country: string | null }
}

/** Looks an invoice up by the code in its QR. `null` means there is no such invoice. */
export async function verifyInvoice(code: string): Promise<InvoiceVerification | null> {
  try {
    return await unwrap<InvoiceVerification>(api.get(`/public/invoices/verify/${encodeURIComponent(code)}`))
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export type PublicInvoice = {
  document: SaleDocument
  company: Company
  template: PrintTemplate
  /** The logo as a data URL, or null. */
  logo: string | null
  locale: Locale
}

/** The whole invoice as printed, for whoever holds its code. `null` means there is no such invoice. */
export async function getPublicInvoice(code: string): Promise<PublicInvoice | null> {
  try {
    const data = await unwrap<PublicInvoice>(api.get(`/public/invoices/verify/${encodeURIComponent(code)}/document`))
    // The invoice prints in the language its company chose, whatever this visitor reads the site in.
    setDocumentLocale(data.locale)
    return data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}
