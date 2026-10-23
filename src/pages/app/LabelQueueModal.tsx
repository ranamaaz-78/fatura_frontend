import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import { listLabelProducts } from '../../services/catalog'
import type { Product } from '../../types/catalog'

type View = 'pending' | 'printed' | 'all'

/**
 * The products whose barcode the system made, so their labels have to be printed. Each shows whether it was printed
 * (and how many times). Printed ones are never taken out of the list: they can be printed again, one at a time or
 * several together.
 */
export function LabelQueueModal({
  open,
  onClose,
  onPrint,
}: {
  open: boolean
  onClose: () => void
  onPrint: (products: Product[]) => void
}) {
  const [view, setView] = useState<View>('pending')
  const [selected, setSelected] = useState<number[]>([])

  const query = useQuery({
    queryKey: ['app', 'products', 'labels'],
    queryFn: listLabelProducts,
    enabled: open,
  })

  const products = useMemo(() => query.data ?? [], [query.data])
  const pending = useMemo(() => products.filter((product) => !product.label_printed), [products])
  const printed = useMemo(() => products.filter((product) => product.label_printed), [products])
  const shown = view === 'pending' ? pending : view === 'printed' ? printed : products

  // A selection never keeps a product that is no longer on screen (printed ones leave "not printed", and so on).
  useEffect(() => {
    const visible = new Set(shown.map((product) => product.id))
    setSelected((current) => (current.every((id) => visible.has(id)) ? current : current.filter((id) => visible.has(id))))
  }, [shown])

  useEffect(() => {
    if (open) setSelected([])
  }, [open, view])

  const allChecked = shown.length > 0 && shown.every((product) => selected.includes(product.id))
  const chosen = shown.filter((product) => selected.includes(product.id))

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const tabs: { id: View; label: string; count: number }[] = [
    { id: 'pending', label: t('labelQueue.pending', 'Not printed'), count: pending.length },
    { id: 'printed', label: t('labelQueue.printed', 'Printed'), count: printed.length },
    { id: 'all', label: t('common.all', 'All'), count: products.length },
  ]

  const empty =
    view === 'pending'
      ? t('labelQueue.emptyPending', 'Every label has been printed.')
      : view === 'printed'
        ? t('labelQueue.emptyPrinted', 'Nothing has been printed yet.')
        : t('labelQueue.emptyAll', 'No product has a barcode made by the system.')

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="4xl"
      title={t('labelQueue.title', 'Labels to print')}
      subtitle={t(
        'labelQueue.subtitle',
        'Products whose barcode the system made. Printed ones stay in the list, so you can print them again.',
      )}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
          {pending.length > 0 ? (
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => onPrint(pending)}>
              {t('labelQueue.printAllPending', 'Print all not printed (:n)').replace(':n', String(pending.length))}
            </Button>
          ) : null}
          <Button icon={<Printer className="h-4 w-4" />} disabled={chosen.length === 0} onClick={() => onPrint(chosen)}>
            {t('labelQueue.printSelected', 'Print selected (:n)').replace(':n', String(chosen.length))}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={view === tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                view === tab.id ? 'bg-brand-600 text-brand-on shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                  view === tab.id ? 'bg-white/20' : 'bg-white text-slate-600',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-50" />
        ) : query.isError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">{getErrorMessage(query.error)}</p>
        ) : shown.length === 0 ? (
          <p className="rounded-xl bg-page px-4 py-10 text-center text-xs text-slate-500">{empty}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center gap-3 border-b border-line bg-page px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
              <input
                type="checkbox"
                aria-label={t('labelQueue.selectAll', 'Select all')}
                checked={allChecked}
                onChange={() => setSelected(allChecked ? [] : shown.map((product) => product.id))}
                className="h-[15px] w-[15px] accent-brand-600"
              />
              <span className="min-w-0 flex-1">{t('products.product', 'Product')}</span>
              <span className="w-[190px]">{t('labelQueue.status', 'Label')}</span>
              <span className="w-[96px] text-right" />
            </div>
            <ul className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
              {shown.map((product) => (
                <li
                  key={product.id}
                  className={cn('flex items-center gap-3 px-4 py-2.5', selected.includes(product.id) && 'bg-brand-50/50')}
                >
                  <input
                    type="checkbox"
                    aria-label={`${t('products.select', 'Select')} ${product.article}`}
                    checked={selected.includes(product.id)}
                    onChange={() => toggle(product.id)}
                    className="h-[15px] w-[15px] accent-brand-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-900">{product.article}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {[product.barcode, product.short_code].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="w-[190px]">
                    {product.label_printed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('labelQueue.printedInfo', 'Printed ×:n · :date')
                          .replace(':n', String(product.label_print_count))
                          .replace(':date', product.label_last_printed_at ? formatDate(product.label_last_printed_at) : '—')}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        {t('labelQueue.notPrinted', 'Not printed yet')}
                      </span>
                    )}
                  </span>
                  <span className="flex w-[96px] justify-end">
                    <Button size="sm" variant="secondary" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => onPrint([product])}>
                      {product.label_printed ? t('labelQueue.printAgain', 'Again') : t('labelQueue.printOne', 'Print')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
