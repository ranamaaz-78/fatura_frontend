import type { Customer, CustomerInput, PaymentStatus, SaleDocument, SaleInput, SaleType } from '../types/sales'
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

export function previewSale(type: SaleType): Promise<{ number: string; client_code: string }> {
  return unwrap(api.get('/app/sales/preview', { params: { type } }))
}

export function listSales(params: {
  search?: string
  type?: SaleType
  payment_status?: PaymentStatus
}): Promise<SaleDocument[]> {
  return unwrap<SaleDocument[]>(api.get('/app/sales', { params }))
}

export function createSale(input: SaleInput): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.post('/app/sales', input))
}

export function getSale(id: number): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.get(`/app/sales/${id}`))
}

export function updateSalePayment(id: number, payment_status: PaymentStatus): Promise<SaleDocument> {
  return unwrap<SaleDocument>(api.patch(`/app/sales/${id}/payment`, { payment_status }))
}
