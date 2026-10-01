import { Percent, Plus, X } from 'lucide-react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import type { DiscountType } from '../../types/sales'

type DiscountEditorProps = {
  open: boolean
  kind: DiscountType
  value: string
  /** What the discount takes off the bill right now, in cents. */
  appliedCents: number
  currency: string
  error: string | null
  onOpen: () => void
  /** Closes the editor and drops the discount. */
  onClear: () => void
  onKind: (kind: DiscountType) => void
  onValue: (value: string) => void
}

/** "$", "€", "£" for the currency, or its code when the locale has no short symbol. */
function currencySymbol(currency: string): string {
  try {
    const text = (0)
      .toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
      .replace(/[0-9.,\s]/g, '')
    return text === '' ? currency : text
  } catch {
    return currency
  }
}

/**
 * The discount line of the invoice summary. Closed, it is an add button. Open, the user picks
 * percent or an amount, types the number, and the bill updates as they type.
 */
export function DiscountEditor({
  open,
  kind,
  value,
  appliedCents,
  currency,
  error,
  onOpen,
  onClear,
  onKind,
  onValue,
}: DiscountEditorProps) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-500 hover:bg-brand-50/50 hover:text-brand-600"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-brand-on">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        {t('sales.addDiscount', 'Add discount')}
      </button>
    )
  }

  const symbol = currencySymbol(currency)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-2">
        <span className="pl-1 text-xs font-semibold text-slate-700">{t('sales.discount', 'Discount')}</span>

        <span role="group" aria-label={t('sales.discountKind', 'Discount type')} className="inline-flex rounded-lg bg-page p-0.5">
          {(['percent', 'amount'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              aria-label={option === 'percent' ? t('sales.discountPercent', 'Percent') : t('sales.discountAmount', 'Amount')}
              onClick={() => onKind(option)}
              className={cn(
                'flex h-7 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-bold transition',
                kind === option ? 'bg-brand-600 text-brand-on shadow-xs' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {option === 'percent' ? <Percent className="h-3.5 w-3.5" strokeWidth={2.5} /> : symbol}
            </button>
          ))}
        </span>

        <input
          value={value}
          onChange={(event) => onValue(event.target.value)}
          inputMode="decimal"
          autoFocus
          aria-label={t('sales.discountValue', 'Discount value')}
          aria-invalid={error !== null}
          placeholder={kind === 'percent' ? '10' : '0.00'}
          className={cn(
            'h-8 w-20 min-w-0 flex-1 rounded-lg border bg-card px-2.5 text-right text-[13px] font-semibold text-ink outline-none focus:ring-2',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-line focus:border-brand-600 focus:ring-brand-600/20',
          )}
        />

        <span className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              'text-xs font-bold',
              appliedCents > 0 ? 'text-emerald-600 app-dark:text-emerald-300' : 'text-slate-400',
            )}
          >
            -{formatCents(appliedCents, currency)}
          </span>
          <button
            type="button"
            aria-label={t('sales.discountRemove', 'Remove discount')}
            title={t('sales.discountRemove', 'Remove discount')}
            onClick={onClear}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
