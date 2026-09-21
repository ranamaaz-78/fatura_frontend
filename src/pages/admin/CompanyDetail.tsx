import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CheckCircle2, MessageCircle, RefreshCw, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency, formatDate } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import {
  cancelSubscription,
  getCompany,
  resendAccess,
  setCompanyStatus,
  startSubscription,
} from '../../services/admin/companies'
import { listPaymentMethods } from '../../services/admin/paymentMethods'
import { listPlans } from '../../services/admin/plans'

function CompanyDetail() {
  const { id } = useParams()
  const companyId = Number(id)
  const queryClient = useQueryClient()
  const { push } = useToast()

  const [renewOpen, setRenewOpen] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [planId, setPlanId] = useState('')
  const [periods, setPeriods] = useState('1')
  const [methodId, setMethodId] = useState('')
  const [reference, setReference] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'company', companyId],
    queryFn: () => getCompany(companyId),
    enabled: Number.isFinite(companyId),
  })
  const plansQuery = useQuery({ queryKey: ['admin', 'plans'], queryFn: listPlans, enabled: renewOpen })
  const methodsQuery = useQuery({ queryKey: ['admin', 'payment-methods'], queryFn: listPaymentMethods, enabled: renewOpen })

  const company = query.data

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'suspended') => setCompanyStatus(companyId, status),
    onSuccess: invalidate,
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const renewMutation = useMutation({
    mutationFn: () =>
      startSubscription(companyId, {
        plan_id: Number(planId),
        periods: Math.max(1, Number(periods) || 1),
        payment_method_id: methodId ? Number(methodId) : undefined,
        payment_reference: reference || undefined,
      }),
    onSuccess: () => {
      setRenewOpen(false)
      setReference('')
      invalidate()
      push({ tone: 'success', title: t('admin.renew', 'Renew or change plan') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: number) => cancelSubscription(subscriptionId),
    onSuccess: () => {
      setCancelId(null)
      invalidate()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const resendMutation = useMutation({
    mutationFn: () => resendAccess(companyId),
    onSuccess: (data) => {
      push({
        tone: 'success',
        title: t('admin.resendAccess', 'Resend access link'),
        actionLabel: data.whatsapp_url ? t('admin.openWhatsapp', 'Send the link on WhatsApp') : undefined,
        onAction: data.whatsapp_url ? () => window.open(data.whatsapp_url as string, '_blank', 'noreferrer') : undefined,
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.companies', 'Companies')} />
        <SkeletonCard />
      </>
    )
  }

  if (!company) {
    return (
      <Card>
        <EmptyState
          icon={XCircle}
          title={t('common.error', 'Something went wrong')}
          description={getErrorMessage(query.error)}
        />
      </Card>
    )
  }

  const active = company.active_subscription

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={`${company.email}${company.city ? ` · ${company.city}` : ''}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              loading={resendMutation.isPending}
              onClick={() => resendMutation.mutate()}
            >
              {t('admin.resendAccess', 'Resend access link')}
            </Button>
            <Button
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setPlanId(active?.plan_id ? String(active.plan_id) : '')
                setRenewOpen(true)
              }}
            >
              {t('admin.renew', 'Renew or change plan')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('admin.owner', 'Owner')} className="lg:col-span-1">
          {company.owner ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{company.owner.name}</p>
              <p className="font-mono text-xs text-slate-500">{company.owner.email}</p>
              {company.owner.phone ? (
                <p className="font-mono text-xs text-slate-500">{company.owner.phone}</p>
              ) : null}
              <p className="pt-2 text-xs text-slate-500">
                {company.owner.has_password ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Password set
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <Ban className="h-3.5 w-3.5" /> Waiting for the invite link
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">—</p>
          )}
        </Card>

        <Card
          title={t('admin.subscription', 'Subscription')}
          className="lg:col-span-2"
          actions={<Badge status={company.status.toUpperCase()} />}
        >
          {active ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{active.plan_name}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {formatCurrency(active.plan_price, active.plan_currency, 'en-US')} / {active.plan_interval}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-700">
                    {t('admin.renewsOn', 'Renews on')} {formatDate(active.ends_at)}
                  </p>
                  <p className="font-mono text-xs text-slate-500">
                    {active.days_left} {t('admin.daysLeft', 'days left')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setCancelId(active.id)}>
                  {t('admin.cancelSubscription', 'Cancel subscription')}
                </Button>
                {company.status === 'active' ? (
                  <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate('suspended')}>
                    {t('admin.suspend', 'Suspend')}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate('active')}>
                    {t('admin.reactivate', 'Reactivate')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={RefreshCw}
              title={t('admin.noSubscription', 'No subscription yet.')}
              description="Start a subscription so the owner can use the workspace."
            />
          )}
        </Card>
      </div>

      <Card title={t('admin.subscriptionHistory', 'Subscription history')}>
        {(company.subscriptions ?? []).length === 0 ? (
          <p className="text-xs text-slate-500">{t('admin.noSubscription', 'No subscription yet.')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(company.subscriptions ?? []).map((subscription) => (
              <li key={subscription.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{subscription.plan_name}</p>
                  <p className="font-mono text-xs text-slate-500">
                    {formatDate(subscription.starts_at)} → {formatDate(subscription.ends_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-600">
                    {formatCurrency(subscription.plan_price, subscription.plan_currency, 'en-US')}
                  </span>
                  <Badge status={subscription.status.toUpperCase()} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        title={t('admin.renew', 'Renew or change plan')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button disabled={planId === ''} loading={renewMutation.isPending} onClick={() => renewMutation.mutate()}>
              {t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('nav.plans', 'Plans')} required value={planId} onChange={(event) => setPlanId(event.target.value)}>
            <option value="">—</option>
            {(plansQuery.data ?? []).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {formatCurrency(plan.price, plan.currency, 'en-US')} / {plan.interval}
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
          <Select
            label={t('admin.paymentMethod', 'Payment method')}
            value={methodId}
            onChange={(event) => setMethodId(event.target.value)}
          >
            <option value="">{t('admin.noPayment', 'No payment recorded')}</option>
            {(methodsQuery.data ?? [])
              .filter((method) => method.is_active)
              .map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
          </Select>
          <Input
            label={t('admin.reference', 'Reference')}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelMutation.mutate(cancelId as number)}
        title={t('admin.cancelSubscription', 'Cancel subscription')}
        description="The company loses access to the workspace as soon as this is cancelled."
        tone="danger"
        confirmLabel={t('admin.cancelSubscription', 'Cancel subscription')}
      />

      {resendMutation.data?.whatsapp_url ? (
        <a
          href={resendMutation.data.whatsapp_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {t('admin.openWhatsapp', 'Send the link on WhatsApp')}
        </a>
      ) : null}
    </>
  )
}

export default CompanyDetail
