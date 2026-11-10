import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents, parseAmountToCents } from '../../lib/money'
import { onlyDecimal } from '../../lib/numberInput'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { createLedgerEntry } from '../../services/ledger'
import { listPaymentMethods } from '../../services/paymentMethods'
import { listSuppliers } from '../../services/suppliers'
import { today } from './ledgerBits'

type PaidChoice = 'none' | 'half' | 'all' | 'custom'

const labelClass = 'mb-1.5 block text-xs font-semibold text-ink'

/**
 * Writes one entry in the supplier ledger: who it came from, what it was, how much it cost and what has been paid
 * already. A record book only: no products, no stock.
 */
export function LedgerEntryModal({ open, onClose, currency }: { open: boolean; onClose: () => void; currency: string }) {
  const { push } = useToast()
  const queryClient = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [paidChoice, setPaidChoice] = useState<PaidChoice>('none')
  const [paidInput, setPaidInput] = useState('')
  const [methodId, setMethodId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const suppliers = useQuery({ queryKey: ['app', 'suppliers', 'ledger-form'], queryFn: () => listSuppliers(undefined, 'active'), enabled: open })
  const methods = useQuery({ queryKey: ['app', 'payment-methods', 'active'], queryFn: () => listPaymentMethods('active'), enabled: open })

  // A clean form every time it is opened.
  useEffect(() => {
    if (!open) return
    setSupplierId('')
    setDate(today())
    setDescription('')
    setAmount('')
    setReference('')
    setNotes('')
    setPaidChoice('none')
    setPaidInput('')
    setErrors({})
  }, [open])

  // The first payment method is picked until the person picks another.
  useEffect(() => {
    if (open && methodId === '' && methods.data && methods.data.length > 0) setMethodId(String(methods.data[0]!.id))
  }, [open, methodId, methods.data])

  const total = parseAmountToCents(amount) ?? 0
  const typedPaid = parseAmountToCents(paidInput) ?? 0
  // What is paid when it is written down: nothing, half, everything, or an amount typed. The rest is paid later.
  const paidNow = Math.min(total, paidChoice === 'all' ? total : paidChoice === 'half' ? Math.round(total / 2) : paidChoice === 'custom' ? typedPaid : 0)
  const stillOwed = total - paidNow
  const ready = supplierId !== '' && date !== '' && description.trim().length >= 2 && total > 0 && (paidNow === 0 || methodId !== '')

  const save = useMutation({
    mutationFn: () =>
      createLedgerEntry({
        supplier_id: Number(supplierId),
        bill_date: date,
        description: description.trim(),
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        amount_cents: total,
        paid_cents: paidNow > 0 ? paidNow : undefined,
        payment_method_id: paidNow > 0 ? Number(methodId) : undefined,
      }),
    onSuccess: () => {
      onClose()
      push({ tone: 'success', title: t('ledger.saved', 'Entry saved.') })
      void queryClient.invalidateQueries({ queryKey: ['app', 'ledger'] })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="2xl"
      title={t('ledger.newTitle', 'New ledger entry')}
      subtitle={t('ledger.newSubtitle', 'Write down what you bought from a supplier and what you have paid so far. Nothing here touches your stock.')}
      footer={
        <>
          <span className="text-sm text-ink-muted">{t('ledger.amount', 'Amount')}</span>
          <span className="text-xl font-extrabold text-ink">{formatCents(total, currency)}</span>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button loading={save.isPending} disabled={!ready} onClick={() => save.mutate()}>
            {t('ledger.save', 'Save entry')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>
              {t('ledger.supplier', 'Supplier')}
              <span className="ml-0.5 text-rose-500">*</span>
            </span>
            <SearchableSelect
              compact
              aria-label={t('ledger.supplier', 'Supplier')}
              value={supplierId}
              error={Boolean(errors.supplier_id)}
              onChange={(event) => setSupplierId(event.target.value)}
              options={[
                { value: '', label: t('ledger.pickSupplier', 'Choose a supplier') },
                ...(suppliers.data ?? []).map((supplier) => ({
                  value: String(supplier.id),
                  label: supplier.name,
                  keywords: `${supplier.company_name ?? ''} ${supplier.code}`,
                })),
              ]}
            />
            {errors.supplier_id ? <p className="mt-1 text-xs text-rose-600">{errors.supplier_id}</p> : null}
          </div>
          <Input compact required type="date" label={t('ledger.date', 'Date')} value={date} max={today()} error={errors.bill_date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <Textarea
          required
          compact
          rows={2}
          maxLength={500}
          label={t('ledger.description', 'What came from the supplier')}
          hint={t('ledger.descriptionHint', 'In your own words, for example: 40 LED lamps and 2 cartons of cable.')}
          value={description}
          error={errors.description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            compact
            required
            inputMode="decimal"
            label={t('ledger.totalAmount', 'Total amount')}
            value={amount}
            error={errors.amount_cents}
            onChange={(event) => {
              setAmount(onlyDecimal(event.target.value))
              setErrors((current) => ({ ...current, amount_cents: '' }))
            }}
          />
          <Input compact maxLength={60} label={t('ledger.reference', 'Supplier invoice no. (optional)')} value={reference} error={errors.reference} onChange={(event) => setReference(event.target.value)} />
        </div>

        <div className="rounded-2xl border border-line p-4">
          <p className="text-sm font-bold text-ink">{t('ledger.paidNow', 'Paid to the supplier so far')}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t('ledger.paidNowHint', 'You can pay the rest later, once or in several parts, from the entry.')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              [
                ['none', t('ledger.payNothing', 'Nothing yet')],
                ['half', t('ledger.payHalf', 'Half')],
                ['all', t('ledger.payAll', 'Everything')],
                ['custom', t('ledger.payOther', 'Another amount')],
              ] as [PaidChoice, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={paidChoice === id}
                disabled={id !== 'none' && total === 0}
                onClick={() => setPaidChoice(id)}
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center rounded-[10px] px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  paidChoice === id ? 'bg-brand-600 text-brand-on' : 'border border-line bg-card text-ink-muted hover:bg-page',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {paidChoice === 'custom' ? (
            <div className="mt-3 w-48">
              <Input compact inputMode="decimal" aria-label={t('ledger.paymentAmount', 'Amount paid')} value={paidInput} error={errors.paid_cents} onChange={(event) => setPaidInput(onlyDecimal(event.target.value))} />
            </div>
          ) : null}
          {paidNow > 0 ? (
            <div className="mt-3 w-64">
              <Select compact aria-label={t('ledger.paymentMethod', 'Paid with')} value={methodId} error={errors.payment_method_id} onChange={(event) => setMethodId(event.target.value)}>
                {(methods.data ?? []).map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-xs">
            <span className="text-ink-muted">
              {t('ledger.paid', 'Paid')}: <span className="font-bold text-emerald-700">{formatCents(paidNow, currency)}</span>
            </span>
            <span className="text-ink-muted">
              {t('ledger.owed', 'Still owed')}: <span className={cn('font-bold', stillOwed > 0 ? 'text-rose-700' : 'text-ink')}>{formatCents(stillOwed, currency)}</span>
            </span>
          </div>
          {errors.paid_cents && paidChoice !== 'custom' ? <p className="mt-2 text-xs text-rose-600">{errors.paid_cents}</p> : null}
        </div>

        <Textarea compact rows={2} maxLength={2000} label={t('ledger.notes', 'Notes (optional)')} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
    </Modal>
  )
}
