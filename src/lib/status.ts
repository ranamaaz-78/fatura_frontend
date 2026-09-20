export const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-700 border-blue-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
  RECTIFIED: 'bg-purple-50 text-purple-700 border-purple-200',
  SENT: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  CONVERTED: 'bg-purple-50 text-purple-700 border-purple-200',
  TRIAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
}

export const STATUS_FALLBACK = 'bg-slate-100 text-slate-700 border-slate-200'

export function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_FALLBACK
}
