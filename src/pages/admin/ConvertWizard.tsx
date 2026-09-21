import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Stepper } from '../../components/ui/Stepper'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency, formatDate } from '../../lib/format'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { convertApplication, type ConvertResult } from '../../services/admin/applications'
import { listPaymentMethods } from '../../services/admin/paymentMethods'
import { listPlans } from '../../services/admin/plans'
import type { Application } from '../../types/module01'

type Draft = {
  company_name: string
  company_email: string
  company_phone: string
  company_whatsapp: string
  city: string
  country: string
  owner_name: string
  owner_email: string
  owner_phone: string
  owner_whatsapp: string
  plan_id: string
  periods: string
  payment_method_id: string
  amount: string
  payment_reference: string
}

function draftFrom(application: Application): Draft {
  return {
    company_name: application.company_name,
    company_email: application.email,
    company_phone: application.phone ?? '',
    company_whatsapp: application.whatsapp ?? '',
    city: application.city ?? '',
    country: application.country ?? '',
    owner_name: application.contact_name,
    owner_email: application.email,
    owner_phone: application.phone ?? '',
    owner_whatsapp: application.whatsapp ?? '',
    plan_id: application.plan_id ? String(application.plan_id) : '',
    periods: '1',
    payment_method_id: '',
    amount: '',
    payment_reference: '',
  }
}

export type ConvertWizardProps = {
  application: Application
  open: boolean
  onClose: () => void
  onConverted: () => void
}

export function ConvertWizard({ application, open, onClose, onConverted }: ConvertWizardProps) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(application))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ConvertResult | null>(null)

  const plansQuery = useQuery({ queryKey: ['admin', 'plans'], queryFn: listPlans, enabled: open })
  const methodsQuery = useQuery({ queryKey: ['admin', 'payment-methods'], queryFn: listPaymentMethods, enabled: open })

  const plans = plansQuery.data ?? []
  const methods = (methodsQuery.data ?? []).filter((method) => method.is_active)
  const plan = plans.find((item) => String(item.id) === draft.plan_id) ?? null
  const periods = Math.max(1, Number(draft.periods) || 1)
  const total = plan ? plan.price * periods : 0

  const endsOn = useMemo(() => {
    if (!plan) return null
    const date = new Date()
    if (plan.interval === 'year') date.setFullYear(date.getFullYear() + periods)
    else date.setMonth(date.getMonth() + periods)
    return date
  }, [plan, periods])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () =>
      convertApplication(application.id, {
        company_name: draft.company_name,
        company_email: draft.company_email,
        company_phone: draft.company_phone || undefined,
        company_whatsapp: draft.company_whatsapp || undefined,
        city: draft.city || undefined,
        country: draft.country || undefined,
        owner_name: draft.owner_name,
        owner_email: draft.owner_email,
        owner_phone: draft.owner_phone || undefined,
        owner_whatsapp: draft.owner_whatsapp || undefined,
        plan_id: Number(draft.plan_id),
        periods,
        payment_method_id: draft.payment_method_id ? Number(draft.payment_method_id) : undefined,
        amount: draft.amount ? Number(draft.amount) : undefined,
        payment_reference: draft.payment_reference || undefined,
      }),
    onSuccess: (data) => {
      setResult(data)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      push({ tone: 'success', title: t('admin.convertSuccess', 'Account created and access link sent.') })
      onConverted()
    },
    onError: (error) => {
      const mapped = mapValidationErrors(error)
      setFieldErrors(mapped)
      if (Object.keys(mapped).length > 0) {
        // Owner email and company fields live on step 1; send the admin back to fix them.
        const ownerFields = ['owner_email', 'owner_name', 'company_name', 'company_email']
        if (ownerFields.some((field) => field in mapped)) setStep(0)
      } else {
        push({ tone: 'danger', title: getErrorMessage(error) })
      }
    },
  })

  const canContinue =
    step === 0
      ? draft.company_name.trim() !== '' && draft.company_email.trim() !== '' && draft.owner_name.trim() !== '' && draft.owner_email.trim() !== ''
      : step === 1
        ? draft.plan_id !== ''
        : true

  if (result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={t('admin.convertSuccess', 'Account created and access link sent.')}
        maxWidth="md"
        footer={<Button onClick={onClose}>{t('common.done', 'Done')}</Button>}
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" />
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{result.company.name}</p>
              <p className="font-mono text-xs">{result.owner.email}</p>
              <p className="mt-2">
                {result.subscription.plan_name} ·{' '}
                {formatCurrency(result.subscription.plan_price, result.subscription.plan_currency, 'en-US')} /{' '}
                {result.subscription.plan_interval} · {t('admin.renewsOn', 'Renews on')}{' '}
                {formatDate(result.subscription.ends_at)}
              </p>
            </div>
          </div>
          {result.whatsapp_url ? (
            <a
              href={result.whatsapp_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4" />
              {t('admin.openWhatsapp', 'Send the link on WhatsApp')}
            </a>
          ) : null}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('admin.wizardTitle', 'Create account')}
      subtitle={application.company_name}
      maxWidth="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
            {step === 0 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
          </Button>
          {step < 2 ? (
            <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
              {t('common.next', 'Next')}
            </Button>
          ) : (
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? t('admin.converting', 'Creating') : t('admin.createAccount', 'Create account')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <Stepper
          current={step}
          steps={[
            { id: 'company', label: t('admin.stepCompany', 'Company') },
            { id: 'plan', label: t('admin.stepPlan', 'Plan and payment') },
            { id: 'review', label: t('admin.stepReview', 'Review') },
          ]}
        />

        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.companySection', 'Company details')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('apply.companyName', 'Business name')}
                  required
                  value={draft.company_name}
                  error={fieldErrors.company_name}
                  onChange={(event) => set('company_name', event.target.value)}
                />
                <Input
                  label={t('apply.email', 'Email')}
                  type="email"
                  required
                  value={draft.company_email}
                  error={fieldErrors.company_email}
                  onChange={(event) => set('company_email', event.target.value)}
                />
                <Input
                  label={t('apply.phone', 'Phone')}
                  value={draft.company_phone}
                  onChange={(event) => set('company_phone', event.target.value)}
                />
                <Input
                  label={t('apply.whatsapp', 'WhatsApp')}
                  value={draft.company_whatsapp}
                  onChange={(event) => set('company_whatsapp', event.target.value)}
                />
                <Input
                  label={t('apply.city', 'City')}
                  value={draft.city}
                  onChange={(event) => set('city', event.target.value)}
                />
                <Input
                  label={t('apply.country', 'Country')}
                  value={draft.country}
                  onChange={(event) => set('country', event.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.ownerSection', 'Owner login')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t('apply.contactName', 'Your name')}
                  required
                  value={draft.owner_name}
                  error={fieldErrors.owner_name}
                  onChange={(event) => set('owner_name', event.target.value)}
                />
                <Input
                  label={t('apply.email', 'Email')}
                  type="email"
                  required
                  value={draft.owner_email}
                  error={fieldErrors.owner_email}
                  onChange={(event) => set('owner_email', event.target.value)}
                />
                <Input
                  label={t('apply.phone', 'Phone')}
                  value={draft.owner_phone}
                  onChange={(event) => set('owner_phone', event.target.value)}
                />
                <Input
                  label={t('apply.whatsapp', 'WhatsApp')}
                  value={draft.owner_whatsapp}
                  onChange={(event) => set('owner_whatsapp', event.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('nav.plans', 'Plans')}
              required
              value={draft.plan_id}
              error={fieldErrors.plan_id}
              onChange={(event) => set('plan_id', event.target.value)}
            >
              <option value="">—</option>
              {plans.map((item) => (
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
              value={draft.periods}
              error={fieldErrors.periods}
              onChange={(event) => set('periods', event.target.value)}
            />
            <Select
              label={t('admin.paymentMethod', 'Payment method')}
              value={draft.payment_method_id}
              error={fieldErrors.payment_method_id}
              onChange={(event) => set('payment_method_id', event.target.value)}
            >
              <option value="">{t('admin.noPayment', 'No payment recorded')}</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </Select>
            <Input
              label={t('admin.amount', 'Amount')}
              inputMode="decimal"
              placeholder={plan ? String(total.toFixed(2)) : ''}
              value={draft.amount}
              error={fieldErrors.amount}
              onChange={(event) => set('amount', event.target.value)}
              suffix={plan?.currency}
            />
            <div className="sm:col-span-2">
              <Input
                label={t('admin.reference', 'Reference')}
                value={draft.payment_reference}
                onChange={(event) => set('payment_reference', event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{t('admin.companySection', 'Company details')}</dt>
                <dd className="font-semibold text-slate-900">{draft.company_name}</dd>
                <dd className="font-mono text-xs text-slate-500">{draft.company_email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{t('admin.ownerSection', 'Owner login')}</dt>
                <dd className="font-semibold text-slate-900">{draft.owner_name}</dd>
                <dd className="font-mono text-xs text-slate-500">{draft.owner_email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{t('admin.subscription', 'Subscription')}</dt>
                <dd className="font-semibold text-slate-900">
                  {plan ? `${plan.name} × ${periods}` : '—'}
                </dd>
                <dd className="text-xs text-slate-500">
                  {endsOn ? `${t('admin.renewsOn', 'Renews on')} ${formatDate(endsOn)}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-slate-500">{t('admin.amount', 'Amount')}</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {plan ? formatCurrency(draft.amount ? Number(draft.amount) : total, plan.currency, 'en-US') : '—'}
                </dd>
                <dd className="text-xs text-slate-500">
                  {methods.find((method) => String(method.id) === draft.payment_method_id)?.name ??
                    t('admin.noPayment', 'No payment recorded')}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-slate-500">
              {t('admin.reviewBody', 'Creating the account sends the owner an email with a set-password link.')}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
