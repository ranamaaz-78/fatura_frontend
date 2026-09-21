import { api, unwrap } from './api'

export type ApplicationInput = {
  company_name: string
  contact_name: string
  email: string
  phone: string
  whatsapp?: string
  city?: string
  country?: string
  business_type?: string
  team_size?: string
  message?: string
  plan_slug?: string
  /** Honeypot. Always submitted empty by real users. */
  website?: string
}

export function submitApplication(input: ApplicationInput): Promise<{ received: boolean }> {
  return unwrap<{ received: boolean }>(api.post('/public/applications', input))
}
