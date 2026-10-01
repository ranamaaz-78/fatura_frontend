import type {
  Application,
  ApplicationActivity,
  ApplicationCounts,
  ApplicationStatus,
  Company,
  PageMeta,
  Subscription,
} from '../../types/module01'
import { api, unwrap } from '../api'

export type ApplicationListQuery = {
  status?: ApplicationStatus | 'all'
  search?: string
  page?: number
}

export type ApplicationList = {
  items: Application[]
  meta: PageMeta
  counts: ApplicationCounts
}

export function listApplications(query: ApplicationListQuery): Promise<ApplicationList> {
  return unwrap<ApplicationList>(
    api.get('/admin/applications', {
      params: {
        status: query.status === 'all' ? undefined : query.status,
        search: query.search || undefined,
        page: query.page,
      },
    }),
  )
}

export function getApplication(id: number): Promise<Application> {
  return unwrap<Application>(api.get(`/admin/applications/${id}`))
}

export function updateApplicationStatus(
  id: number,
  payload: { status: ApplicationStatus; note?: string },
): Promise<Application> {
  return unwrap<Application>(api.patch(`/admin/applications/${id}/status`, payload))
}

export function saveApplicationNotes(id: number, notes: string): Promise<Application> {
  return unwrap<Application>(api.patch(`/admin/applications/${id}`, { notes }))
}

export function logApplicationActivity(
  id: number,
  payload: { type: 'note' | 'call' | 'whatsapp' | 'email'; body?: string },
): Promise<ApplicationActivity> {
  return unwrap<ApplicationActivity>(api.post(`/admin/applications/${id}/activities`, payload))
}

export function getApplicationWhatsAppLink(id: number, message?: string): Promise<{ whatsapp_url: string; message: string }> {
  return unwrap<{ whatsapp_url: string; message: string }>(
    api.post(`/admin/applications/${id}/whatsapp-link`, { message }),
  )
}

export type ConvertInput = {
  company_name: string
  company_email: string
  company_phone?: string
  company_whatsapp?: string
  city?: string
  country?: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  owner_whatsapp?: string
  plan_id: number
  periods: number
  starts_at?: string
  payment_method_id?: number | null
  amount?: number
  payment_reference?: string
}

export type ConvertResult = {
  company: Company
  owner: { id: number; name: string; email: string }
  subscription: Subscription
  whatsapp_url: string | null
  /** False when the set-password email could not be sent; the account still exists. */
  email_sent: boolean
  email_error: string | null
  application: Application
}

export function convertApplication(id: number, input: ConvertInput): Promise<ConvertResult> {
  return unwrap<ConvertResult>(api.post(`/admin/applications/${id}/convert`, input))
}
