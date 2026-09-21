import type { Plan, PlanInterval } from '../../types/module01'
import { api, unwrap } from '../api'

export type PlanInput = {
  name: string
  description?: string
  price: number
  currency: string
  interval: PlanInterval
  features: string[]
  max_users?: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

export function listPlans(): Promise<Plan[]> {
  return unwrap<Plan[]>(api.get('/admin/plans'))
}

export function createPlan(input: PlanInput): Promise<Plan> {
  return unwrap<Plan>(api.post('/admin/plans', input))
}

export function updatePlan(id: number, input: PlanInput): Promise<Plan> {
  return unwrap<Plan>(api.patch(`/admin/plans/${id}`, input))
}

export function togglePlan(id: number): Promise<Plan> {
  return unwrap<Plan>(api.post(`/admin/plans/${id}/toggle`))
}

export function deletePlan(id: number): Promise<unknown> {
  return unwrap(api.delete(`/admin/plans/${id}`))
}
