import { useCallback, useMemo } from 'react'
import { useAuth } from './AuthProvider'

/** "invoices.create" is allowed when the list has it; several can be joined with "|" and any one is enough. */
export function hasPermission(list: string[] | undefined, needed: string): boolean {
  return needed.split('|').some((permission) => list?.includes(permission))
}

/**
 * What the signed-in person may do. The server sends the list with the session: the owner has every
 * permission, a team member has what the owner ticked for them. The server enforces it; this only decides
 * what to show.
 */
export function usePermissions() {
  const { session } = useAuth()
  const list = useMemo(() => session?.permissions ?? [], [session?.permissions])
  const isOwner = session?.role === 'business_admin'
  // Stable between renders, so effects that depend on it do not run again for nothing.
  const can = useCallback((needed: string) => hasPermission(list, needed), [list])

  return {
    isOwner,
    list,
    /** `can('invoices.create')`, or `can('customers.view|invoices.create')` for either. */
    can,
  }
}

/** The area a document kind belongs to ("quotation" is "quotes"), so `docPermission('factura', 'create')` is "invoices.create". */
const DOCUMENT_AREA: Record<string, string> = {
  factura: 'invoices',
  abono: 'invoices',
  albaran: 'delivery_notes',
  quotation: 'quotes',
  proforma: 'proformas',
}

export function docPermission(type: string, action: 'view' | 'create' | 'update' | 'delete' | 'pay' | 'void'): string {
  return `${DOCUMENT_AREA[type] ?? 'invoices'}.${action}`
}
