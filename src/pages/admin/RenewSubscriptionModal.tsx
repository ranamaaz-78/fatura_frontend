import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency, formatDate } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import { startSubscription } from '../../services/admin/companies'
import { listPaymentMethods } from '../../services/admin/paymentMethods'
import { listPlans } from '../../services/admin/plans'
import type { Company } from '../../types/module01'

const INTERVAL_MONTHS: Record<string, number> = { month: 1, quarter: 3, year: 12 }

export type RenewSubscriptionModalProps = {
  company: Company | null
  onClose: () => void
}

/** Renew a company on the same plan, or move it to another one. Used by the list and the detail page. */
export function RenewSubscriptionModal({ company, onClose }: RenewSubscriptionModalProps) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const open = company !== null
  const [planId, setPlanId] = useState('')
  const [periods, setPeriods] = useState('1')
  const [methodId, setMethodId] = useState('')
  const [reference, setReference] = useState('')

  const plansQuery = useQuery({ queryKey: ['admin', 'plans'], queryFn: listPlans, enabled: open })
  const methodsQuery = useQuery({ queryKey: ['admin', 'payment-methods'], queryFn: listPaymentMethods, enabled: open })

  useEffect(() => {
    if (!company) return
    const current = company.active_subscription ?? company.latest_subscription
    setPlanId(current?.plan_id ? String(current.plan_id) : '')
    setPeriods('1')
    setMethodId('')
    setReference('')
  }, [company])

  const plan = (plansQuery.data ?? []).find((item) => String(item.id) === planId)
  const count = Math.max(1, Math.min(36, Number(periods) || 1))
  const running = company?.subscription_state === 'expired' ? null : (company?.active_subscription ?? null)
  const sameAsCurrent = running !== null && String(running.plan_id) === planId
  // Renewing on the same plan carries on from the current end date; a different plan starts today.
  const startsOn = sameAsCurrent && running ? new Date(running.ends_at) : new Date()
  const endsOn = plan ? new Date(startsOn) : null
  if (plan && endsOn) endsOn.setMonth(endsOn.getMonth() + (INTERVAL_MONTHS[plan.interval] ?? 1) * count)

  const mutation = useMutation({
    mutationFn: () =>
      startSubscription((company as Company).id, {
        plan_id: Number(planId),
        periods: count,
        payment_method_id: methodId ? Number(methodId) : undefined,
        payment_reference: reference || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      push({ tone: 'success', title: t('admin.subscriptionRenewed', 'Subscription updated') })
      onClose()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('admin.renew', 'Renew or change plan')}
      subtitle={company?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button disabled={planId === ''} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {t('common.save', 'Save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t('nav.plans', 'Plans')} required value={planId} onChange={(event) => setPlanId(event.target.value)}>
          <option value="">—</option>
          {(plansQuery.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {formatCurrency(item.price, item.currency, 'en-US')} / {item.interval}
            </option>
          ))}
        </Select>
        <Input
          label={t('admin.periods', 'Billing periods')}
          type="number"
          min={1}
          max={36}
          value={periods}
          onChange={(event) => setPeriods(event.target.value)}
        />
        <Select label={t('admin.paymentMethod', 'Payment method')} value={methodId} onChange={(event) => setMethodId(event.target.value)}>
          <option value="">{t('admin.noPayment', 'No payment recorded')}</option>
          {(methodsQuery.data ?? [])
            .filter((method) => method.is_active)
            .map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
        </Select>
        <Input label={t('admin.reference', 'Reference')} value={reference} onChange={(event) => setReference(event.target.value)} />
      </div>

      {plan && endsOn ? (
        <div className="mt-5 rounded-xl border border-line bg-page p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-ink-muted">
              {sameAsCurrent ? 'Continues from' : 'Starts'} {formatDate(startsOn)}
            </span>
            <span className="font-semibold text-ink">Ends {formatDate(endsOn)}</span>
          </div>
          {methodId ? (
            <p className="mt-2 text-xs text-ink-muted">
              A payment of {formatCurrency(plan.price * count, plan.currency, 'en-US')} will be recorded.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
