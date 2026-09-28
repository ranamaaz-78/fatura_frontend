import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { listPaymentMethods } from '../../services/paymentMethods'

type RecordPaymentModalProps = {
  open: boolean
  loading?: boolean
  title?: string
  subtitle?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: (methodId: number) => void
}

export function RecordPaymentModal({
  open,
  loading = false,
  title,
  subtitle,
  confirmLabel,
  onClose,
  onConfirm,
}: RecordPaymentModalProps) {
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t('payments.recordTitle', 'How was this paid?')}
      subtitle={subtitle ?? t('payments.recordSubtitle', 'Pick the method so the payment is recorded on this document.')}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            loading={loading}
            disabled={selected === null || rows.length === 0}
            onClick={() => selected !== null && onConfirm(selected)}
          >
            {confirmLabel ?? t('sales.recordPayment', 'Record payment')}
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
