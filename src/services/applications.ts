import { api, unwrap } from './api'

export type ApplicationInput = {
  company_name: string
  contact_name: string
  email: string
  phone: string
  whatsapp?: string
  city?: string
  country?: string
  message?: string
  plan_slug?: string
  /** Honeypot. Always submitted empty by real users. */
  website?: string
}

export type OtpRequested = {
  sent: boolean
  /** Seconds the code stays valid. */
  expires_in: number
  /** Seconds before another code may be asked for. */
  resend_in: number
}

/** Step 1: checks the details and emails a 6-digit code. Nothing is saved yet. */
export function requestApplicationOtp(input: ApplicationInput): Promise<OtpRequested> {
  return unwrap<OtpRequested>(api.post('/public/applications/otp', input))
}

/** Step 2: the code proves the email; only then does the server save the application. */
export function submitApplication(input: ApplicationInput & { otp: string }): Promise<{ received: boolean }> {
  return unwrap<{ received: boolean }>(api.post('/public/applications', input))
}
