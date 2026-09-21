import type { AdminDashboard } from '../../types/module01'
import { api, unwrap } from '../api'

export function getAdminDashboard(): Promise<AdminDashboard> {
  return unwrap<AdminDashboard>(api.get('/admin/dashboard'))
}
