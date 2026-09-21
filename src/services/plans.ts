import type { Plan } from '../types/module01'
import { api, unwrap } from './api'

export function getPublicPlans(): Promise<Plan[]> {
  return unwrap<Plan[]>(api.get('/public/plans'))
}
