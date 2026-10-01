import type { Company, CompanyCounts, CompanyStatus, PageMeta, Subscription, SubscriptionState } from '../../types/module01'
import { isAxiosError } from 'axios'
import { api, unwrap } from '../api'

export type CompanyList = {
  items: Company[]
  meta: PageMeta
  counts: CompanyCounts
}

export function listCompanies(query: {
  status?: CompanyStatus
  subscription?: SubscriptionState
  search?: string
  page?: number
}): Promise<CompanyList> {
  return unwrap<CompanyList>(
    api.get('/admin/companies', {
      params: {
        status: query.status,
        subscription: query.subscription,
        search: query.search || undefined,
        page: query.page,
      },
    }),
  )
}

export function getCompany(id: number): Promise<Company> {
  return unwrap<Company>(api.get(`/admin/companies/${id}`))
}

export function setCompanyStatus(id: number, status: CompanyStatus): Promise<Company> {
  return unwrap<Company>(api.patch(`/admin/companies/${id}/status`, { status }))
}

export type StartSubscriptionInput = {
  plan_id: number
  periods: number
  starts_at?: string
  payment_method_id?: number | null
  amount?: number
  payment_reference?: string
}

export function startSubscription(companyId: number, input: StartSubscriptionInput): Promise<Subscription> {
  return unwrap<Subscription>(api.post(`/admin/companies/${companyId}/subscriptions`, input))
}

export function cancelSubscription(subscriptionId: number): Promise<Subscription> {
  return unwrap<Subscription>(api.post(`/admin/subscriptions/${subscriptionId}/cancel`))
}

export function resendAccess(companyId: number): Promise<{ whatsapp_url: string | null }> {
  return unwrap<{ whatsapp_url: string | null }>(api.post(`/admin/companies/${companyId}/resend-access`))
}

/** When the email fails the server still hands back the WhatsApp link, so the admin is not stuck. */
export function whatsappFromError(error: unknown): string | null {
  if (!isAxiosError(error)) return null
  const data = error.response?.data as { data?: { whatsapp_url?: string | null } } | undefined
  return data?.data?.whatsapp_url ?? null
}

export type CompanyWhatsApp = {
  instance_name: string
  has_instance: boolean
  status: 'disconnected' | 'connecting' | 'qrcode' | 'connected'
  connected_phone: string | null
  connected_name: string | null
  service_alive: boolean
}

/** One company's own WhatsApp link, as the service reports it right now. */
export function getCompanyWhatsApp(companyId: number): Promise<CompanyWhatsApp> {
  return unwrap<CompanyWhatsApp>(api.get(`/admin/companies/${companyId}/whatsapp`))
}

export function disconnectCompanyWhatsApp(companyId: number): Promise<CompanyWhatsApp> {
  return unwrap<CompanyWhatsApp>(api.post(`/admin/companies/${companyId}/whatsapp/disconnect`))
}
