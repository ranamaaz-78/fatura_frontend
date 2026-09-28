import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { listPaymentMethods } from '../../services/paymentMethods'
import type { SaleType } from '../../types/sales'
import { typeLabel } from './documentTypes'

type ConvertQuoteModalProps = {
  open: boolean
  loading?: boolean
  target: SaleType | null
  onClose: () => void
  onPending: () => void
  onPaid: (methodId: number) => void
}

export function ConvertQuoteModal({
  open,
  loading = false,
  target,
  onClose,
  onPending,
  onPaid,
}: ConvertQuoteModalProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const methods = useQuery({
    queryKey: ['app', 'payment-methods', 'active'],
    queryFn: () => listPaymentMethods('active'),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setSelected(null)
      return
    }
    const rows = methods.data ?? []
    setSelected(rows.length === 1 ? rows[0]!.id : null)
  }, [open, methods.data])

  const rows = methods.data ?? []
  const label = target ? typeLabel(target).toLowerCase() : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.convertTitle', 'Issue as :type').replace(':type', label)}
      subtitle={t(
        'sales.convertSubtitle',
        'Pending now, or pick how it was paid. The quotation then leaves the list.',
      )}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="secondary" loading={loading} onClick={onPending}>
            {t('sales.issuePending', 'Issue as pending')}
          </Button>
          <Button
            loading={loading}
            disabled={selected === null || rows.length === 0}
            onClick={() => selected !== null && onPaid(selected)}
          >
            {t('sales.issuePaid', 'Issue as paid')}
          </Button>
        </>
      }
    >
      {methods.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_item, index) => (
            <span key={index} className="block h-11 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{t('payments.noneActive', 'Add a payment method first.')}</p>
          <Link to="/app/payments" className="mt-2 inline-block text-xs font-semibold text-[#004ac6]">
            {t('payments.goToPayments', 'Open Payments')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((method) => {
            const on = selected === method.id
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelected(method.id)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold',
                  on
                    ? 'border-[#004ac6] bg-[#eff4ff] text-[#004ac6]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {method.name}
                <span
                  className={cn(
                    'h-4 w-4 rounded-full border-2',
                    on ? 'border-[#004ac6] bg-[#004ac6]' : 'border-slate-300 bg-white',
                  )}
                />
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
