import type { Supplier, SupplierInput } from '../types/suppliers'
import { api, unwrap } from './api'

export function listSuppliers(search?: string, status?: 'active' | 'inactive'): Promise<Supplier[]> {
  return unwrap<Supplier[]>(
    api.get('/app/suppliers', {
      params: {
        search: search || undefined,
        status,
        limit: 500,
      },
    }),
  )
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return unwrap<Supplier>(api.post('/app/suppliers', input))
}

export function updateSupplier(id: number, input: SupplierInput): Promise<Supplier> {
  return unwrap<Supplier>(api.patch(`/app/suppliers/${id}`, input))
}

export function setSupplierActive(id: number, isActive: boolean): Promise<Supplier> {
  return unwrap<Supplier>(api.patch(`/app/suppliers/${id}/active`, { is_active: isActive }))
}

export function deleteSupplier(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/suppliers/${id}`))
}
