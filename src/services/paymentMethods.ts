import type { CompanyPaymentMethod } from '../types/sales'
import { api, unwrap } from './api'

export function listPaymentMethods(status?: 'active' | 'inactive'): Promise<CompanyPaymentMethod[]> {
  return unwrap<CompanyPaymentMethod[]>(api.get('/app/payment-methods', { params: { status } }))
}

export function createPaymentMethod(name: string): Promise<CompanyPaymentMethod> {
  return unwrap<CompanyPaymentMethod>(api.post('/app/payment-methods', { name }))
}

export function updatePaymentMethod(id: number, name: string): Promise<CompanyPaymentMethod> {
  return unwrap<CompanyPaymentMethod>(api.patch(`/app/payment-methods/${id}`, { name }))
}

export function setPaymentMethodActive(id: number, isActive: boolean): Promise<CompanyPaymentMethod> {
  return unwrap<CompanyPaymentMethod>(api.patch(`/app/payment-methods/${id}/active`, { is_active: isActive }))
}

export function deletePaymentMethod(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/payment-methods/${id}`))
}
