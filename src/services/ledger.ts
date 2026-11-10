import type { LedgerEntry, LedgerInput, LedgerList, LedgerListParams, LedgerPaymentInput, LedgerStatement, LedgerSupplierRow } from '../types/ledger'
import { api, unwrap } from './api'

export function listLedger(params: LedgerListParams): Promise<LedgerList> {
  return unwrap<LedgerList>(api.get('/app/ledger', { params }))
}

export function getLedgerEntry(id: number): Promise<LedgerEntry> {
  return unwrap<LedgerEntry>(api.get(`/app/ledger/${id}`))
}

export function createLedgerEntry(input: LedgerInput): Promise<LedgerEntry> {
  return unwrap<LedgerEntry>(api.post('/app/ledger', input))
}

export function addLedgerPayment(id: number, input: LedgerPaymentInput): Promise<LedgerEntry> {
  return unwrap<LedgerEntry>(api.post(`/app/ledger/${id}/payments`, input))
}

export function removeLedgerPayment(id: number, paymentId: number): Promise<LedgerEntry> {
  return unwrap<LedgerEntry>(api.delete(`/app/ledger/${id}/payments/${paymentId}`))
}

export function voidLedgerEntry(id: number, reason: string): Promise<LedgerEntry> {
  return unwrap<LedgerEntry>(api.post(`/app/ledger/${id}/void`, { reason }))
}

export function listLedgerSuppliers(): Promise<LedgerSupplierRow[]> {
  return unwrap<LedgerSupplierRow[]>(api.get('/app/ledger/suppliers'))
}

export function getLedgerStatement(supplierId: number, from?: string, to?: string): Promise<LedgerStatement> {
  return unwrap<LedgerStatement>(api.get(`/app/ledger/suppliers/${supplierId}`, { params: { from: from || undefined, to: to || undefined } }))
}

/** Every entry that matches the filters, all pages: what an export writes out. */
export async function listAllLedger(params: Omit<LedgerListParams, 'page' | 'per_page'>): Promise<LedgerEntry[]> {
  const items: LedgerEntry[] = []
  let page = 1
  let last = 1

  do {
    const result = await listLedger({ ...params, page, per_page: 100 })
    items.push(...result.items)
    last = result.meta.last_page
    page += 1
  } while (page <= last && page <= 200)

  return items
}
