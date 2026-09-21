import type { AppDashboard, Company, SupportContact, Subscription } from '../types/module01'
import { api, unwrap } from './api'

export function getAppDashboard(): Promise<AppDashboard> {
  return unwrap<AppDashboard>(api.get('/app/dashboard'))
}

export type AppSubscriptionPayload = {
  company: Company | null
  subscription: Subscription | null
  support: SupportContact
}

export function getAppSubscription(): Promise<AppSubscriptionPayload> {
  return unwrap<AppSubscriptionPayload>(api.get('/app/subscription'))
}
