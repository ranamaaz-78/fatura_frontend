import type { Locale } from '../i18n'
import { api, unwrap } from './api'

/** The owner picks the language of the whole company: its panel, documents, emails and WhatsApp messages. */
export function saveCompanyLocale(locale: Locale): Promise<unknown> {
  return unwrap(api.patch('/app/company/locale', { locale }))
}

/** The platform admin has no company, so the language is their own. */
export function saveAdminLocale(locale: Locale): Promise<unknown> {
  return unwrap(api.patch('/admin/me/locale', { locale }))
}

/** The language printed on invoices and other documents. `null` follows the panel's language. */
export function saveDocumentLocale(documentLocale: Locale | null): Promise<unknown> {
  return unwrap(api.patch('/app/company/document-locale', { document_locale: documentLocale }))
}
