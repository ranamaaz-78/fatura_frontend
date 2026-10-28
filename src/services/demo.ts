import { api, unwrap } from './api'

/** What the server gives a customer who goes into the shared demo: a short-lived token of the demo account. */
export type DemoEntry = { token: string; expires_at: string | null }

export function enterDemoRequest(): Promise<DemoEntry> {
  return unwrap<DemoEntry>(api.post('/app/demo/enter'))
}

export function exitDemoRequest(): Promise<unknown> {
  return unwrap(api.post('/app/demo/exit'))
}

/* ------------------------------------------------------------------ the admin panel */

export type AdminDemo = {
  enabled: boolean
  exists: boolean
  last_reset: string | null
  entries_today: number
  entries_total: number
  people_total: number
  data: { products: number; customers: number; suppliers: number; documents: number; purchases: number }
}

export function getAdminDemo(): Promise<AdminDemo> {
  return unwrap<AdminDemo>(api.get('/admin/demo'))
}

export function resetDemo(): Promise<AdminDemo> {
  return unwrap<AdminDemo>(api.post('/admin/demo/reset'))
}

export function setDemoEnabled(enabled: boolean): Promise<AdminDemo> {
  return unwrap<AdminDemo>(api.patch('/admin/demo', { enabled }))
}
