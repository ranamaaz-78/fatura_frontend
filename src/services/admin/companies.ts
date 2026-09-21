import type { Company, CompanyStatus, PageMeta, Subscription } from '../../types/module01'
import { api, unwrap } from '../api'

export type CompanyList = {
  items: Company[]
  meta: PageMeta
}

export function listCompanies(query: { status?: CompanyStatus | 'all'; search?: string; page?: number }): Promise<CompanyList> {
  return unwrap<CompanyList>(
    api.get('/admin/companies', {
      params: {
        status: query.status === 'all' ? undefined : query.status,
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
