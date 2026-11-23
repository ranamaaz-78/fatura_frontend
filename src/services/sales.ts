import type { ContactImportRow } from '../lib/contactImport'
import type {
  Customer,
  CustomerInput,
  IssuableType,
  PaymentList,
  PaymentListParams,
  PaymentStatus,
  SaleDocument,
  SaleInput,
  SaleList,
  SaleListParams,
  SaleReturnInput,
  SaleSettleInput,
  SaleSettlementQtyInput,
  SaleType,
} from '../types/sales'
import { api, unwrap } from './api'

export function searchCustomersByPhone(phone: string): Promise<Customer[]> {
  return unwrap<Customer[]>(api.get('/app/customers', { params: { phone, limit: 8, status: 'active' } }))
}

export function listCustomers(search?: string): Promise<Customer[]> {
  return unwrap<Customer[]>(api.get('/app/customers', { params: { search: search || undefined } }))
}

export function listActiveCustomers(): Promise<Customer[]> {
  return unwrap<Customer[]>(api.get('/app/customers', { params: { status: 'active', limit: 500 } }))
}

export function importCustomers(rows: ContactImportRow[]): Promise<{ created: number }> {
  return unwrap<{ created: number }>(api.post('/app/customers/import', { rows }))
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return unwrap<Customer>(api.post('/app/customers', input))
}

export function updateCustomer(id: number, input: CustomerInput): Promise<Customer> {
  return unwrap<Customer>(api.patch(`/app/customers/${id}`, input))
}

export function setCustomerActive(id: number, isActive: boolean): Promise<Customer> {
  return unwrap<Customer>(api.patch(`/app/customers/${id}/active`, { is_active: isActive }))
}

export function deleteCustomer(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/customers/${id}`))
}

export function previewSale(type: SaleType, issuedAt?: string): Promise<{ number: string; client_code: string }> {
  return unwrap(api.get('/app/sales/preview', { params: { type, issued_at: issuedAt } }))
}

export function listSales(params: SaleListParams): Promise<SaleList> {
  return unwrap<SaleList>(api.get('/app/sales', { params }))
}

export function createSale(input: SaleInput): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post('/app/sales', input))
}

export function updateSale(id: number, input: SaleInput): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.patch(`/app/sales/${id}`, input))
}

/** Issues a draft invoice: same number and date; the stock goes out now (refused if any line falls short). */
export function issueDraft(id: number, payment_status: PaymentStatus, payment_method_id?: number | null): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/issue-draft`, { payment_status, payment_method_id: payment_method_id ?? null }))
}

export function convertSale(
  id: number,
  type: 'factura' | 'albaran',
  payment_status: PaymentStatus,
  payment_method_id?: number | null,
): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/convert`, { type, payment_status, payment_method_id }))
}

export function getSale(id: number): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.get(`/app/sales/${id}`))
}

export function updateSalePayment(
  id: number,
  payment_status: PaymentStatus,
  payment_method_id?: number | null,
): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.patch(`/app/sales/${id}/payment`, { payment_status, payment_method_id }))
}

export function settleSale(id: number, input: SaleSettleInput): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/settle`, input))
}

export function invoiceSettlement(
  id: number,
  settlementId: number,
  input: { iva: Record<number, number>; recargo_rate_id: number | null },
): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/settlements/${settlementId}/invoice`, input))
}

/** A delivery note turned into an invoice: IVA (and recargo) added on top, no stock moved. */
export function invoiceAlbaran(
  id: number,
  input: {
    iva: Record<number, number>
    recargo_rate_id: number | null
    /** Client details the delivery note lacks; the ones it has are never replaced. */
    client_company?: string
    client_phone?: string
    client_nif?: string
    client_address?: string
    client_email?: string
    /** A paid delivery note: pay the IVA / recargo it did not cover now, with this method. */
    pay_difference?: boolean
    payment_method_id?: number | null
  },
): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/invoice`, input))
}

export function returnSalePieces(id: number, input: SaleReturnInput): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/returns`, input))
}

export function cancelSaleReturn(id: number, returnId: number): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.delete(`/app/sales/${id}/returns/${returnId}`))
}

export function updateSaleSettlement(
  id: number,
  settlementId: number,
  input: SaleSettlementQtyInput,
): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.patch(`/app/sales/${id}/settlements/${settlementId}`, input))
}

export function deleteSale(id: number): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.delete(`/app/sales/${id}`))
}

export function restoreSale(id: number): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/restore`))
}

export type BulkResult = { done: number[]; failed: { id: number; number: string | null; reason: string }[] }

/** Deletes many documents at once; the ones that cannot be deleted come back in `failed` with the reason. */
export function bulkDeleteSales(ids: number[]): Promise<BulkResult> {
  return unwrap<BulkResult>(api.post('/app/sales/bulk-delete', { ids }))
}

export function bulkRestoreSales(ids: number[]): Promise<BulkResult> {
  return unwrap<BulkResult>(api.post('/app/sales/bulk-restore', { ids }))
}

/** How many deleted documents there are of each kind (the Restore page's tabs). */
export function getTrashCounts(): Promise<Record<IssuableType, number>> {
  return unwrap(api.get('/app/sales/trash-counts'))
}

export function voidSale(id: number, reason: string): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post(`/app/sales/${id}/void`, { reason }))
}

export function listPayments(params: PaymentListParams): Promise<PaymentList> {
  return unwrap<PaymentList>(api.get('/app/payments', { params }))
}
