import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { TONE_AMBER, TONE_GREEN, TONE_ROSE } from '../../lib/status'
import type { PaymentStatus } from '../../types/ledger'

export function paymentStatusLabel(status: PaymentStatus): string {
  if (status === 'paid') return t('ledger.payPaid', 'Paid')
  if (status === 'partial') return t('ledger.payPartial', 'Partly paid')
  return t('ledger.payUnpaid', 'Unpaid')
}

const TONE: Record<PaymentStatus, string> = { paid: TONE_GREEN, partial: TONE_AMBER, unpaid: TONE_ROSE }

/** Paid / Partly paid / Unpaid, as a small badge. */
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap uppercase', TONE[status])}>{paymentStatusLabel(status)}</span>
}

/** "2026-10-28" as dd/mm/yyyy, without going through a time zone. */
export function day(value: string): string {
  const [year, month, date] = value.split('-')
  return `${date}/${month}/${year}`
}

export function today(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
