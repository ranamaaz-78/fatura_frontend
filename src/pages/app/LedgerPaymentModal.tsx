import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { centsToInput, formatCents, parseAmountToCents } from '../../lib/money'
import { onlyDecimal } from '../../lib/numberInput'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { addLedgerPayment } from '../../services/ledger'
import { listPaymentMethods } from '../../services/paymentMethods'
import type { LedgerEntry } from '../../types/ledger'
import { today } from './ledgerBits'

/** Records one more payment to the supplier against an entry; the amount starts as everything that is still owed. */
export function LedgerPaymentModal({ entry, currency, onClose }: { entry: LedgerEntry | null; currency: string; onClose: () => void }) {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [methodId, setMethodId] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const methods = useQuery({ queryKey: ['app', 'payment-methods', 'active'], queryFn: () => listPaymentMethods('active'), enabled: entry !== null })

  useEffect(() => {
    if (!entry) return
    setAmount(centsToInput(entry.owed_cents))
    setDate(today())
    setNote('')
    setErrors({})
  }, [entry])

  // The first method is the one that is picked, until the person picks another.
  useEffect(() => {
    if (entry && methodId === '' && methods.data && methods.data.length > 0) setMethodId(String(methods.data[0]!.id))
  }, [entry, methodId, methods.data])

  const cents = parseAmountToCents(amount)
  const owed = entry?.owed_cents ?? 0
  const valid = cents !== null && cents > 0 && cents <= owed && methodId !== '' && date !== ''

  const save = useMutation({
    mutationFn: () => addLedgerPayment(entry!.id, { amount_cents: cents ?? 0, paid_on: date, payment_method_id: Number(methodId), note: note.trim() || null }),
    onSuccess: () => {
      onClose()
      push({ tone: 'success', title: t('ledger.paymentSaved', 'Payment saved.') })
      void queryClient.invalidateQueries({ queryKey: ['app', 'ledger'] })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      maxWidth="md"
      title={t('ledger.addPayment', 'Add a payment')}
      subtitle={entry ? `${entry.number} · ${entry.supplier_name}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            {t('ledger.savePayment', 'Save payment')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-page p-3 text-center">
          <div>
            <p className="text-[11px] text-ink-muted">{t('ledger.amount', 'Amount')}</p>
            <p className="text-sm font-bold text-ink">{entry ? formatCents(entry.amount_cents, currency) : ''}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">{t('ledger.paid', 'Paid')}</p>
            <p className="text-sm font-bold text-emerald-700">{entry ? formatCents(entry.paid_cents, currency) : ''}</p>
          </div>
          <div>
            <p className="text-[11px] text-ink-muted">{t('ledger.owed', 'Still owed')}</p>
            <p className="text-sm font-bold text-rose-700">{entry ? formatCents(entry.owed_cents, currency) : ''}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            compact
            required
            inputMode="decimal"
            label={t('ledger.paymentAmount', 'Amount paid')}
            hint={cents !== null && cents > owed ? t('ledger.moreThanOwed', 'That is more than what is still owed.') : undefined}
            value={amount}
            error={errors.amount_cents}
            onChange={(event) => setAmount(onlyDecimal(event.target.value))}
          />
          <Input compact required type="date" label={t('ledger.paymentDate', 'Date')} value={date} max={today()} min={entry?.bill_date} error={errors.paid_on} onChange={(event) => setDate(event.target.value)} />
        </div>
        <Select compact required label={t('ledger.paymentMethod', 'Paid with')} value={methodId} error={errors.payment_method_id} onChange={(event) => setMethodId(event.target.value)}>
          {(methods.data ?? []).map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </Select>
        <Input compact maxLength={255} label={t('ledger.paymentNote', 'Note (optional)')} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
    </Modal>
  )
}
