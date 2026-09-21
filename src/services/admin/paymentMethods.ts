import type { PaymentMethod } from '../../types/module01'
import { api, unwrap } from '../api'

export type PaymentMethodInput = {
  name: string
  description?: string
  instructions?: string
  is_active: boolean
  sort_order: number
}

export function listPaymentMethods(): Promise<PaymentMethod[]> {
  return unwrap<PaymentMethod[]>(api.get('/admin/payment-methods'))
}

export function createPaymentMethod(input: PaymentMethodInput): Promise<PaymentMethod> {
  return unwrap<PaymentMethod>(api.post('/admin/payment-methods', input))
}

export function updatePaymentMethod(id: number, input: PaymentMethodInput): Promise<PaymentMethod> {
  return unwrap<PaymentMethod>(api.patch(`/admin/payment-methods/${id}`, input))
}

export function togglePaymentMethod(id: number): Promise<PaymentMethod> {
  return unwrap<PaymentMethod>(api.post(`/admin/payment-methods/${id}/toggle`))
}

export function deletePaymentMethod(id: number): Promise<unknown> {
  return unwrap(api.delete(`/admin/payment-methods/${id}`))
}
