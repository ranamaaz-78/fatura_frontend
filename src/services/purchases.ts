import type { Purchase, PurchaseInput, PurchaseList, PurchaseListParams } from '../types/purchases'
import { api, unwrap } from './api'

export function listPurchases(params: PurchaseListParams): Promise<PurchaseList> {
  // The flag goes as 1: that is the spelling every version of the server accepts.
  return unwrap<PurchaseList>(api.get('/app/purchases', { params: { ...params, with_lines: params.with_lines ? 1 : undefined } }))
}

export function getPurchase(id: number): Promise<Purchase> {
  return unwrap<Purchase>(api.get(`/app/purchases/${id}`))
}

export function createPurchase(input: PurchaseInput): Promise<Purchase> {
  return unwrap<Purchase>(api.post('/app/purchases', input))
}

export function voidPurchase(id: number, reason: string): Promise<Purchase> {
  return unwrap<Purchase>(api.post(`/app/purchases/${id}/void`, { reason }))
}

/** Every purchase that matches the filters, all pages, each with its lines: what the export writes out. */
export async function listAllPurchases(params: Omit<PurchaseListParams, 'page' | 'per_page' | 'with_lines'>): Promise<Purchase[]> {
  const items: Purchase[] = []
  let page = 1
  let last = 1

  do {
    const result = await listPurchases({ ...params, page, per_page: 100, with_lines: true })
    items.push(...result.items)
    last = result.meta.last_page
    page += 1
  } while (page <= last && page <= 200)

  return items
}
