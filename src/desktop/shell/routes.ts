import { FileCheck2, FileText, Receipt, Truck, type LucideIcon } from 'lucide-react'
import { ADMIN_NAV, APP_NAV, type NavGroup } from '../../components/layout/nav'
import { t } from '../../i18n'
import type { IssuableType } from '../../types/sales'

export type Crumb = { group: string; page: string }

function matches(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}

/** "Sales and invoicing › Invoices": where the person is, for the title bar. The same names as the web's menu. */
export function crumbFor(pathname: string, admin: boolean): Crumb {
  const groups: NavGroup[] = admin ? ADMIN_NAV : APP_NAV

  if (pathname === '/app/invoices/new') return { group: t('nav.group.sales', 'Sales and invoicing'), page: t('sales.newTitle', 'New sale') }
  if (pathname.endsWith('/edit') && pathname.includes('/quotes/')) {
    return { group: t('nav.quotes', 'Quotes'), page: t('sales.editQuote', 'Edit quotation') }
  }

  // The longest match wins, so /app/invoices/12 is "Invoices" and not "POS / quick invoice".
  let best: { crumb: Crumb; length: number } | null = null
  for (const group of groups) {
    for (const item of group.items) {
      if (item.to === '/app/invoices/new' || !matches(pathname, item.to)) continue
      if (!best || item.to.length > best.length) {
        best = { crumb: { group: t(group.titleKey, group.titleFallback), page: t(item.labelKey, item.fallback) }, length: item.to.length }
      }
    }
  }
  if (best) return best.crumb
  return { group: t('app.name', 'YK Digital Solutions'), page: admin ? t('nav.admin', 'Admin') : '' }
}

export type NewDocument = { type: IssuableType; label: string; icon: LucideIcon; key: string }

/** The four documents the POS can start; the palette and the dashboard offer the ones the person may create. */
export const NEW_DOCUMENTS: NewDocument[] = [
  { type: 'factura', label: t('desk.newInvoice', 'New invoice'), icon: Receipt, key: 'F2' },
  { type: 'albaran', label: t('desk.newDeliveryNote', 'New delivery note'), icon: Truck, key: 'F3' },
  { type: 'quotation', label: t('desk.newQuote', 'New quotation'), icon: FileText, key: 'F4' },
  { type: 'proforma', label: t('desk.newProforma', 'New proforma'), icon: FileCheck2, key: 'F6' },
]

export function newDocumentPath(type: IssuableType): string {
  return `/app/invoices/new?type=${type}`
}
