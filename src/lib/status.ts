export const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:border-emerald-500/30',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:border-amber-500/30',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200 app-dark:bg-blue-500/15 app-dark:text-blue-300 app-dark:border-blue-500/30',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 app-dark:bg-white/8 app-dark:text-slate-300 app-dark:border-white/10',
  ISSUED: 'bg-indigo-50 text-indigo-700 border-indigo-200 app-dark:bg-indigo-500/15 app-dark:text-indigo-300 app-dark:border-indigo-500/30',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
  RECTIFIED: 'bg-purple-50 text-purple-700 border-purple-200 app-dark:bg-purple-500/15 app-dark:text-purple-300 app-dark:border-purple-500/30',
  SENT: 'bg-sky-50 text-sky-700 border-sky-200 app-dark:bg-sky-500/15 app-dark:text-sky-300 app-dark:border-sky-500/30',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:border-emerald-500/30',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
  CONVERTED: 'bg-purple-50 text-purple-700 border-purple-200 app-dark:bg-purple-500/15 app-dark:text-purple-300 app-dark:border-purple-500/30',
  TRIAL: 'bg-indigo-50 text-indigo-700 border-indigo-200 app-dark:bg-indigo-500/15 app-dark:text-indigo-300 app-dark:border-indigo-500/30',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:border-emerald-500/30',
  SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
  NEW: 'bg-blue-50 text-blue-700 border-blue-200 app-dark:bg-blue-500/15 app-dark:text-blue-300 app-dark:border-blue-500/30',
  CONTACTED: 'bg-amber-50 text-amber-700 border-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:border-amber-500/30',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:border-emerald-500/30',
  EXPIRED: 'bg-rose-50 text-rose-700 border-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:border-rose-500/30',
}

export const STATUS_FALLBACK = 'bg-slate-100 text-slate-700 border-slate-200 app-dark:bg-white/8 app-dark:text-slate-300 app-dark:border-white/10'

export const TONE_GREEN =
  'bg-emerald-50 text-emerald-700 app-dark:bg-emerald-500/15 app-dark:text-emerald-300'
export const TONE_AMBER =
  'bg-amber-50 text-amber-700 app-dark:bg-amber-500/15 app-dark:text-amber-300'
export const TONE_ROSE =
  'bg-rose-50 text-rose-700 app-dark:bg-rose-500/15 app-dark:text-rose-300'
export const TONE_VIOLET =
  'bg-violet-50 text-violet-700 app-dark:bg-violet-500/15 app-dark:text-violet-300'
export const TONE_SKY =
  'bg-sky-50 text-sky-700 app-dark:bg-sky-500/15 app-dark:text-sky-300'
export const TONE_ORANGE =
  'bg-orange-50 text-orange-700 app-dark:bg-orange-500/15 app-dark:text-orange-300'

export const AVATAR_TONES = [
  'bg-brand-50 text-brand-600',
  TONE_GREEN,
  TONE_AMBER,
  TONE_ROSE,
  TONE_VIOLET,
] as const

export function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_FALLBACK
}
