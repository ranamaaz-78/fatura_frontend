import { t, tp } from '../i18n'
import type { Company, Subscription, SubscriptionState } from '../types/module01'

export type SubscriptionInfo = {
  state: SubscriptionState
  /** The term being shown: the running one, or the last one when it has lapsed. */
  subscription: Subscription | null
  /** How far through the term we are, 0 to 100. */
  percent: number
  /** Whole days until the term ends; negative once it has ended. */
  daysLeft: number
}

export const STATE_STYLE: Record<SubscriptionState, { badge: string; bar: string }> = {
  active: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:border-emerald-500/30',
    bar: 'bg-emerald-500',
  },
  expiring: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:border-amber-500/30',
    bar: 'bg-amber-500',
  },
  expired: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
    bar: 'bg-rose-500',
  },
  none: {
    badge: 'bg-slate-100 text-slate-600 border-slate-200 app-dark:bg-white/10 app-dark:text-slate-300 app-dark:border-white/15',
    bar: 'bg-slate-400',
  },
}

export const STATE_LABEL: Record<SubscriptionState, string> = {
  active: t('subscription.state.active', 'Active'),
  expiring: t('subscription.state.expiring', 'Expiring soon'),
  expired: t('subscription.state.expired', 'Expired'),
  none: t('subscription.state.none', 'No plan'),
}

const DAY = 86_400_000

export function subscriptionInfo(company: Company): SubscriptionInfo {
  const state: SubscriptionState = company.subscription_state ?? (company.active_subscription ? 'active' : 'none')
  const subscription = company.active_subscription ?? company.latest_subscription ?? null

  if (!subscription) return { state: 'none', subscription: null, percent: 0, daysLeft: 0 }

  const start = new Date(subscription.starts_at).getTime()
  const end = new Date(subscription.ends_at).getTime()
  const elapsed = ((Date.now() - start) / Math.max(end - start, 1)) * 100
  const percent = state === 'expired' ? 100 : Math.min(100, Math.max(0, elapsed))

  return { state, subscription, percent, daysLeft: Math.ceil((end - Date.now()) / DAY) }
}

/** "12 days left", "Ends today", "Expired 3 days ago". */
export function daysText(info: SubscriptionInfo): string {
  if (!info.subscription) return ''
  if (info.state === 'expired') {
    const ago = Math.max(1, Math.abs(Math.floor(info.daysLeft)))
    return tp('subscription.expired_ago', 'Expired {count} day ago|Expired {count} days ago', ago)
  }
  if (info.daysLeft <= 0) return t('subscription.ends_today', 'Ends today')
  return tp('subscription.days_left', '{count} day left|{count} days left', info.daysLeft)
}
