import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, PhoneCall, Rocket, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency } from '../../lib/format'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { submitApplication } from '../../services/applications'
import { getPublicPlans } from '../../services/plans'

const schema = z.object({
  company_name: z.string().trim().min(2, 'Tell us your business name.').max(255),
  contact_name: z.string().trim().min(2, 'Tell us your name.').max(255),
  email: z.email('Enter a valid email address.').max(255),
  phone: z.string().trim().min(6, 'Enter a phone number we can reach you on.').max(32),
  whatsapp: z.string().trim().max(32).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  business_type: z.string().trim().max(120).optional(),
  team_size: z.string().trim().max(20).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(255).optional(),
})

type ApplyForm = z.infer<typeof schema>

const TEAM_SIZES = ['1', '2-5', '6-10', '11-25', '25+']

const STEPS = [
  { icon: Send, titleKey: 'apply.step1', titleFallback: 'You send this form', bodyKey: 'apply.step1Body', bodyFallback: 'We only ask for what we need to call you back.' },
  { icon: PhoneCall, titleKey: 'apply.step2', titleFallback: 'We contact you', bodyKey: 'apply.step2Body', bodyFallback: 'Usually within one working day, by phone or WhatsApp.' },
  { icon: Rocket, titleKey: 'apply.step3', titleFallback: 'Your workspace goes live', bodyKey: 'apply.step3Body', bodyFallback: 'You get an email with a link to set your password.' },
]

function Apply() {
  const [searchParams] = useSearchParams()
  const planSlug = searchParams.get('plan') ?? undefined
  const { push } = useToast()
  const [done, setDone] = useState(false)

  const plansQuery = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const selectedPlan = plansQuery.data?.find((plan) => plan.slug === planSlug) ?? null

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForm>({ resolver: zodResolver(schema), defaultValues: { website: '' } })

  const mutation = useMutation({
    mutationFn: (values: ApplyForm) => submitApplication({ ...values, plan_slug: planSlug }),
    onSuccess: () => {
      setDone(true)
      reset({ website: '' })
    },
    onError: (error) => {
      const fieldErrors = mapValidationErrors(error)
      const entries = Object.entries(fieldErrors)
      if (entries.length === 0) {
        push({ tone: 'danger', title: getErrorMessage(error) })
        return
      }
      for (const [field, message] of entries) {
        setError(field as keyof ApplyForm, { message })
      }
    },
  })

  useEffect(() => {
    document.title = `${t('apply.title', 'Apply for access')} · ${t('app.name', 'Fatura')}`
  }, [])

  const busy = isSubmitting || mutation.isPending

  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16 lg:py-20">
      <aside className="rounded-3xl bg-[#0b1c30] px-8 py-10 text-white">
        <h1 className="text-3xl font-bold tracking-tight">{t('apply.title', 'Apply for access')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {t('apply.subtitle', 'Tell us about your business and we will set your workspace up.')}
        </p>

        <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7aa2ff]">
          {t('apply.stepsTitle', 'What happens next')}
        </p>
        <ol className="mt-5 space-y-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.titleKey} className="flex gap-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-semibold text-slate-400">0{index + 1}</p>
                  <p className="text-sm font-semibold">{t(step.titleKey, step.titleFallback)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {t(step.bodyKey, step.bodyFallback)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7aa2ff]">
            {t('apply.selectedPlan', 'Selected plan')}
          </p>
          {selectedPlan ? (
            <>
              <p className="mt-2 text-lg font-bold">{selectedPlan.name}</p>
              <p className="font-mono text-sm text-slate-300">
                {formatCurrency(selectedPlan.price, selectedPlan.currency, 'en-US')} / {selectedPlan.interval}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {t('apply.noPlan', 'No plan selected. We will recommend one when we speak.')}
            </p>
          )}
        </div>
      </aside>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-9"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={t('apply.companyName', 'Business name')}
            required
            autoComplete="organization"
            error={errors.company_name?.message}
            {...register('company_name')}
          />
          <Input
            label={t('apply.contactName', 'Your name')}
            required
            autoComplete="name"
            error={errors.contact_name?.message}
            {...register('contact_name')}
          />
          <Input
            label={t('apply.email', 'Email')}
            type="email"
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('apply.phone', 'Phone')}
            type="tel"
            required
            autoComplete="tel"
            placeholder="+92 300 1234567"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label={t('apply.whatsapp', 'WhatsApp')}
            type="tel"
            hint={t('apply.whatsappHint', 'Leave blank to use your phone number.')}
            error={errors.whatsapp?.message}
            {...register('whatsapp')}
          />
          <Input
            label={t('apply.city', 'City')}
            autoComplete="address-level2"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label={t('apply.country', 'Country')}
            autoComplete="country-name"
            error={errors.country?.message}
            {...register('country')}
          />
          <Input
            label={t('apply.businessType', 'What do you do?')}
            placeholder="Retail, services, wholesale..."
            error={errors.business_type?.message}
            {...register('business_type')}
          />
          <Select label={t('apply.teamSize', 'Team size')} error={errors.team_size?.message} {...register('team_size')}>
            <option value="">—</option>
            {TEAM_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-5">
          <Textarea
            label={t('apply.message', 'Anything we should know?')}
            rows={4}
            error={errors.message?.message}
            {...register('message')}
          />
        </div>

        {/* Honeypot: hidden from people, irresistible to bots. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="website">Website</label>
          <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" loading={busy}>
            {busy ? t('apply.sending', 'Sending') : t('apply.submit', 'Send application')}
          </Button>
          <Link to="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700">
            {t('public.backHome', 'Back to home')}
          </Link>
        </div>
      </form>

      <Modal
        open={done}
        onClose={() => setDone(false)}
        title={t('apply.successTitle', 'Application received')}
        maxWidth="md"
        footer={
          <Link
            to="/"
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
          >
            {t('apply.successAction', 'Back to home')}
          </Link>
        }
      >
        <div className="flex gap-4">
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-emerald-600" />
          <p className="text-sm leading-relaxed text-slate-600">
            {t('apply.successBody', 'Thanks. We will contact you on the number you gave us, usually within one working day.')}
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default Apply
