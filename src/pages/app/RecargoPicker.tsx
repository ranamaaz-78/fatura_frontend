import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import type { TaxRate } from '../../types/catalog'

type RecargoPickerProps = {
  rates: TaxRate[]
  loading?: boolean
  selectedId: number | null
  onSelect: (id: number | null) => void
  /** What the chosen rate adds to this invoice, in cents. */
  amountCents: number
  currency: string
}

/**
 * The "Recargo de equivalencia" line of the invoice summary. Empty, it is an add button;
 * after a rate is picked it becomes a line with the percentage, the amount and a remove button.
 */
export function RecargoPicker({ rates, loading = false, selectedId, onSelect, amountCents, currency }: RecargoPickerProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const selected = rates.find((rate) => rate.id === selectedId) ?? null

  useEffect(() => {
    if (!open) return

    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function pick(id: number) {
    onSelect(id)
    setOpen(false)
  }

  return (
    <div ref={box} className="relative">
      {selected ? (
        <div className="flex items-center justify-between gap-2 border-l-2 border-amber-400 pl-2 text-slate-600">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium">{t('sales.recargo', 'Recargo de equivalencia')}</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              title={t('sales.recargoChange', 'Change rate')}
              onClick={() => setOpen((was) => !was)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-700 hover:bg-amber-100 app-dark:bg-amber-500/15 app-dark:text-amber-300"
            >
              {selected.rate}%
              <ChevronDown className={cn('h-3 w-3 transition', open && 'rotate-180')} />
            </button>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="font-mono font-bold text-slate-800">{formatCents(amountCents, currency)}</span>
            <button
              type="button"
              aria-label={t('sales.recargoRemove', 'Remove recargo de equivalencia')}
              title={t('sales.recargoRemove', 'Remove recargo de equivalencia')}
              onClick={() => {
                onSelect(null)
                setOpen(false)
              }}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
          className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:border-brand-500 hover:bg-brand-50/50 hover:text-brand-600"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-brand-on">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          {t('sales.addRecargo', 'Add Recargo de equivalencia')}
          <ChevronDown className={cn('ml-auto h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
        </button>
      )}

      {open ? (
        <div
          role="listbox"
          aria-label={t('sales.recargo', 'Recargo de equivalencia')}
          className="absolute right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-card shadow-lg"
        >
          {loading ? (
            <p className="px-3 py-3 text-xs text-slate-500">{t('common.loading', 'Loading')}</p>
          ) : rates.length === 0 ? (
            <p className="px-3 py-3 text-xs leading-relaxed text-slate-500">
              {t('sales.recargoNone', 'No recargo rates yet.')}
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {rates.map((rate) => {
                const active = rate.id === selectedId
                return (
                  <li key={rate.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(rate.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-xs hover:bg-page',
                        active && 'bg-brand-50/60',
                      )}
                    >
                      <span className="w-12 font-mono text-[13px] font-bold text-brand-600">{rate.rate}%</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{rate.name}</span>
                      {active ? <Check className="h-4 w-4 text-brand-600" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            to="/app/settings?tab=recargo"
            className="block border-t border-slate-100 px-3 py-2 text-[11px] font-semibold text-brand-600 hover:bg-page"
          >
            {t('sales.recargoManage', 'Manage rates in Settings')}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
