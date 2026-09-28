import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Stepper } from '../../components/ui/Stepper'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { listPaymentMethods } from '../../services/paymentMethods'
import type { SaleLine, SaleSettleInput } from '../../types/sales'

type DraftLine = {
  lineId: number
  article: string
  remaining: number
  selected: boolean
  quantity: number
  unitPrice: string
}

type SettleProformaModalProps = {
  open: boolean
  loading?: boolean
  lines: SaleLine[]
  currency: string
  onClose: () => void
  onConfirm: (input: SaleSettleInput) => void
}

function remainingOf(line: SaleLine): number {
  return line.remaining_quantity ?? Math.max(0, line.quantity - (line.settled_quantity ?? 0))
}

function buildDrafts(lines: SaleLine[]): DraftLine[] {
  return lines
    .filter((line) => line.id != null && remainingOf(line) > 0)
    .map((line) => ({
      lineId: line.id as number,
      article: line.article,
      remaining: remainingOf(line),
      selected: true,
      quantity: remainingOf(line),
      unitPrice: centsToInput(line.unit_price),
    }))
}

export function SettleProformaModal({
  open,
  loading = false,
  lines,
  currency,
  onClose,
  onConfirm,
}: SettleProformaModalProps) {
  const [step, setStep] = useState(0)
  const [drafts, setDrafts] = useState<DraftLine[]>([])
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null)

  const methods = useQuery({
    queryKey: ['app', 'payment-methods', 'active'],
    queryFn: () => listPaymentMethods('active'),
    enabled: open,
  })

  useEffect(() => {
    if (!open) {
      setStep(0)
      setDrafts([])
      setSelectedMethod(null)
      return
    }
    setStep(0)
    setDrafts(buildDrafts(lines))
  }, [open, lines])

  useEffect(() => {
    if (!open) return
    const rows = methods.data ?? []
    setSelectedMethod(rows.length === 1 ? rows[0]!.id : null)
  }, [open, methods.data])

  const selected = drafts.filter((row) => row.selected)
  const allSelected = drafts.length > 0 && selected.length === drafts.length

  const runningCents = useMemo(() => {
    return selected.reduce((sum, row) => {
      const price = parseAmountToCents(row.unitPrice)
      if (price === null || row.quantity < 1) return sum
      return sum + row.quantity * price
    }, 0)
  }, [selected])

  const stepOneReady =
    selected.length > 0 &&
    selected.every((row) => {
      const price = parseAmountToCents(row.unitPrice)
      return row.quantity >= 1 && row.quantity <= row.remaining && price !== null && price >= 0
    })

  const methodRows = methods.data ?? []

  function patch(lineId: number, next: Partial<DraftLine>) {
    setDrafts((current) => current.map((row) => (row.lineId === lineId ? { ...row, ...next } : row)))
  }

  function confirm() {
    if (selectedMethod === null || !stepOneReady) return
    onConfirm({
      payment_method_id: selectedMethod,
      lines: selected.map((row) => ({
        line_id: row.lineId,
        quantity: row.quantity,
        unit_price: parseAmountToCents(row.unitPrice) ?? 0,
      })),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.settleTitle', 'Record payment')}
      subtitle={
        step === 0
          ? t('sales.settleWhat', 'Pick the pieces settling now. You can change the wholesale price.')
          : t('sales.settleHow', 'Pick how this payment was received.')
      }
      maxWidth="xl"
      footer={
        <>
          {step === 1 ? (
            <Button variant="secondary" onClick={() => setStep(0)}>
              {t('common.back', 'Back')}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
          )}
          {step === 0 ? (
            <Button disabled={!stepOneReady} onClick={() => setStep(1)}>
              {t('common.next', 'Next')}
            </Button>
          ) : (
            <Button
              loading={loading}
              disabled={selectedMethod === null || methodRows.length === 0}
              onClick={confirm}
            >
              {t('sales.recordPayment', 'Record payment')}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Stepper
          steps={[
            { id: 'lines', label: t('sales.settleStepLines', 'What is settling') },
            { id: 'method', label: t('sales.settleStepMethod', 'How it was paid') },
          ]}
          current={step}
        />

        {step === 0 ? (
          drafts.length === 0 ? (
            <p className="rounded-xl border border-line bg-page px-4 py-3 text-sm text-slate-600">
              {t('sales.settleNoneLeft', 'Every piece on this proforma is already settled.')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Checkbox
                  checked={allSelected}
                  onChange={(event) => {
                    const on = event.target.checked
                    setDrafts((current) => current.map((row) => ({ ...row, selected: on })))
                  }}
                  label={t('sales.selectAll', 'Select all')}
                />
                <p className="font-mono text-sm font-bold text-slate-900">
                  {t('sales.thisPayment', 'This payment')} {formatCents(runningCents, currency)}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden items-center bg-slate-50 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase sm:flex">
                  <span className="w-8" />
                  <span className="min-w-0 flex-1">{t('sales.article', 'Article')}</span>
                  <span className="w-20 text-right">{t('sales.pieces', 'Pieces')}</span>
                  <span className="w-28 text-right">{t('sales.price', 'Price')}</span>
                  <span className="w-24 text-right">{t('sales.total', 'Total')}</span>
                </div>
                {drafts.map((row) => {
                  const price = parseAmountToCents(row.unitPrice) ?? 0
                  const lineTotal = row.selected ? row.quantity * price : 0
                  return (
                    <div
                      key={row.lineId}
                      className={cn(
                        'flex flex-col gap-2 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center',
                        row.selected ? 'bg-card' : 'bg-page/70',
                      )}
                    >
                      <span className="flex items-center gap-3 sm:w-8 sm:shrink-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded accent-blue-600"
                          checked={row.selected}
                          onChange={(event) => patch(row.lineId, { selected: event.target.checked })}
                        />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800 sm:hidden">
                          {row.article}
                        </span>
                      </span>
                      <span className="hidden min-w-0 flex-1 text-sm font-semibold text-slate-800 sm:block">
                        {row.article}
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                          {row.remaining} {t('sales.left', 'left')}
                        </span>
                      </span>
                      <span className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                        <Input
                          compact
                          type="number"
                          min={1}
                          max={row.remaining}
                          disabled={!row.selected}
                          value={row.quantity}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            if (!Number.isFinite(next)) return
                            patch(row.lineId, {
                              quantity: Math.min(row.remaining, Math.max(1, Math.round(next))),
                            })
                          }}
                          className="sm:w-20"
                        />
                        <Input
                          compact
                          inputMode="decimal"
                          disabled={!row.selected}
                          value={row.unitPrice}
                          onChange={(event) => patch(row.lineId, { unitPrice: event.target.value })}
                          className="sm:w-28"
                        />
                      </span>
                      <span className="text-right font-mono text-sm font-bold text-slate-900 sm:w-24">
                        {formatCents(lineTotal, currency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ) : methods.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_item, index) => (
              <span key={index} className="block h-11 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : methodRows.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>{t('payments.noneActive', 'Add a payment method first.')}</p>
            <Link to="/app/payments" className="mt-2 inline-block text-xs font-semibold text-brand-600">
              {t('payments.goToPayments', 'Open Payments')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-sm font-bold text-slate-900">
              {t('sales.thisPayment', 'This payment')} {formatCents(runningCents, currency)}
            </p>
            <div className="flex flex-col gap-2">
              {methodRows.map((method) => {
                const on = selectedMethod === method.id
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold',
                      on
                        ? 'border-brand-600 bg-brand-50 text-brand-600'
                        : 'border-line bg-card text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {method.name}
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border-2',
                        on ? 'border-brand-600 bg-brand-600' : 'border-line bg-card',
                      )}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
