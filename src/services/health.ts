import { api } from './api'
import type { HealthPayload } from '../types/api'

export async function getHealth(): Promise<HealthPayload> {
  const { data } = await api.get<HealthPayload>('/health')
  return data
}
