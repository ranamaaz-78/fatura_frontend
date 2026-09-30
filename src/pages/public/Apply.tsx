import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronLeft, MailCheck, MessageCircle, ScanLine, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Modal } from '../../components/ui/Modal'
import { OtpInput } from '../../components/ui/OtpInput'
import { PublicFieldShell, PublicInput, PublicSelect, PublicTextarea, publicControlClass } from '../../components/ui/PublicField'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DIAL_OPTIONS,
  countryByName,
  countryForDial,
  detectFromInternational,
  isPossibleNumber,
  localDigits,
} from '../../lib/countries'
import { formatPlanPrice } from '../../lib/format'
import { supportWhatsappUrl } from '../../lib/support'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { requestApplicationOtp, submitApplication, type ApplicationInput } from '../../services/applications'
import { getPublicPlans } from '../../services/plans'
import type { Plan } from '../../types/module01'

const ASIDE_BACKGROUND = {
  backgroundImage:
    'radial-gradient(520px 420px at 20% 18%, rgba(37,99,235,0.35), rgba(11,28,48,0) 70%), ' +
    'radial-gradient(420px 320px at 90% 95%, rgba(78,222,163,0.16), rgba(11,28,48,0) 70%)',
  backgroundColor: '#0b1c30',
}

const STEPS = [
  { title: 'Send your application', body: 'You are here. Takes about two minutes.' },
  { title: 'We contact you', body: 'By phone or WhatsApp within one working day.' },
  { title: 'Get your login', body: 'Link by email and WhatsApp, and you are live.' },
]

const schema = z
  .object({
    contact_name: z.string().trim().min(2, 'Tell us your name.').max(255),
    company_name: z.string().trim().min(2, 'Tell us your business name.').max(255),
    email: z.email('Enter a valid email address.').max(255),
    country: z.string().trim().min(1, 'Pick your country.').max(120),
    city: z.string().trim().max(120).optional(),
    dial_code: z.string().trim().min(2),
    phone: z.string().trim().min(1, 'Enter a phone number we can reach you on.').max(40),
    whatsapp_same: z.boolean(),
    whatsapp_dial_code: z.string().trim().min(2),
    whatsapp: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    consent: z.literal(true, { message: 'Please accept so we can contact you.' }),
    website: z.string().max(255).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.phone.trim() !== '' && !isPossibleNumber(values.dial_code, values.phone)) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'That number does not look right for the selected country.',
      })
    }
    if (values.whatsapp_same) return
    if (!values.whatsapp?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['whatsapp'],
        message: 'Enter your WhatsApp number, or switch back to "Same as phone".',
      })
    } else if (!isPossibleNumber(values.whatsapp_dial_code, values.whatsapp)) {
      ctx.addIssue({
        code: 'custom',
        path: ['whatsapp'],
        message: 'That WhatsApp number does not look right for the selected code.',
      })
    }
  })

type ApplyForm = z.input<typeof schema>

function Stepper() {
  return (
    <div className="mt-12 flex flex-col">
      {STEPS.map((step, index) => (
        <div key={step.title} className="flex gap-4">
          <span className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold',
                index === 0
                  ? 'bg-[#004ac6] text-white shadow-[0_0_0_6px_rgba(37,99,235,0.25)]'
                  : 'border-2 border-white/24 text-[#cbd5e1]',
              )}
            >
              {index + 1}
            </span>
            {index < STEPS.length - 1 ? <span className="h-11 w-0.5 bg-white/14" /> : null}
          </span>
          <span className="pt-1.5">
            <span className={cn('block text-base font-bold', index === 0 ? 'text-white' : 'text-[#e2e8f0]')}>
              {step.title}
            </span>
            <span className="mt-0.5 block text-sm text-[#94a3b8]">{step.body}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function SelectedPlanCard({ plan, canChange }: { plan: Plan | null; canChange: boolean }) {
  return (
    <div className="mt-auto rounded-[20px] border border-white/12 bg-white/6 p-5.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#4edea3]">
          {t('apply.selectedPlan', 'Selected plan')}
        </span>
        {canChange ? <span className="text-xs text-[#94a3b8]">{t('apply.changeBelow', 'Change below')}</span> : null}
      </div>

      {plan ? (
        <>
          <div className="mt-2.5 flex items-baseline justify-between gap-3">
            <span className="text-xl font-bold text-white">{plan.name}</span>
            <span>
              <span className="text-[28px] font-extrabold tracking-[-0.03em] text-white">
                {formatPlanPrice(plan.price, plan.currency)}
              </span>
              <span className="text-sm text-[#cbd5e1]"> / {plan.interval}</span>
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#cbd5e1]">
            {t(
              'apply.planNote',
              'Nothing is charged now. You only pay once your account is activated on the call.',
            )}
          </p>
        </>
      ) : (
        <p className="mt-2.5 text-[13px] leading-relaxed text-[#cbd5e1]">
          {t('apply.noPlan', 'No plan selected. We will recommend one when we speak.')}
        </p>
      )}
    </div>
  )
}

type PhoneFieldProps = {
  id: string
  label: string
  required?: boolean
  error?: string
  /** Current dialling code, e.g. "+34". */
  dial: string
  onDialChange: (dial: string) => void
  number: UseFormRegisterReturn
  autoFocus?: boolean
}

/** Dialling code + number. */
function PhoneField({ id, label, required, error, dial, onDialChange, number }: PhoneFieldProps) {
  return (
    <PublicFieldShell id={id} label={label} required={required} error={error}>
      <span className="flex gap-2">
        <span className="w-[104px] shrink-0">
          <SearchableSelect
            tone="public"
            aria-label={t('apply.dialCode', 'Dialling code')}
            options={DIAL_OPTIONS}
            value={dial}
            onChange={(event) => onDialChange(event.target.value)}
          />
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(publicControlClass, 'h-12 min-w-0 flex-1 px-3.5 font-mono tracking-wide')}
          {...number}
        />
      </span>
    </PublicFieldShell>
  )
}

function Apply() {
  const [searchParams] = useSearchParams()
  const planSlug = searchParams.get('plan')
  const { push } = useToast()
  const [done, setDone] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const whatsappUrl = supportWhatsappUrl()

  const plansQuery = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const plans = plansQuery.data ?? []

  const selectedPlan =
    plans.find((plan) => plan.id === selectedPlanId) ??
    plans.find((plan) => plan.slug === planSlug) ??
    plans.find((plan) => plan.is_featured) ??
    plans[0] ??
    null

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplyForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      dial_code: DEFAULT_COUNTRY.dial,
      country: DEFAULT_COUNTRY.name,
      whatsapp_same: true,
      whatsapp_dial_code: DEFAULT_COUNTRY.dial,
      website: '',
    },
  })

  const sameWhatsapp = useWatch({ control, name: 'whatsapp_same' })
  const dialCode = useWatch({ control, name: 'dial_code' })
  const phoneValue = useWatch({ control, name: 'phone' })
  const waDial = useWatch({ control, name: 'whatsapp_dial_code' })

  function changePhoneDial(dial: string) {
    const match = countryForDial(dial, getValues('country'))
    setValue('dial_code', dial, { shouldValidate: Boolean(errors.phone) })
    if (match) setValue('country', match.name)
  }

  function changeCountry(name: string) {
    const match = countryByName(name)
    if (!match) return
    setValue('dial_code', match.dial)
  }

  /** A pasted "+34 612..." sets the code and country; plain typing is left as typed. */
  function typePhone(raw: string) {
    const found = detectFromInternational(raw)
    if (found) {
      setValue('dial_code', found.dial)
      setValue('country', found.country.name)
      setValue('phone', found.local)
    }
  }

  function changeWhatsappDial(dial: string) {
    setValue('whatsapp_dial_code', dial)
  }

  function typeWhatsapp(raw: string) {
    const found = detectFromInternational(raw)
    if (found) {
      setValue('whatsapp_dial_code', found.dial)
      setValue('whatsapp', found.local)
    }
  }

  // Nothing is saved until the emailed code is confirmed: the form first asks for a
  // code ('form' step), then the applicant types it on the 'verify' step.
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [pending, setPending] = useState<ApplicationInput | null>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  function showFieldErrors(error: unknown): boolean {
    const entries = Object.entries(mapValidationErrors(error)).filter(([field]) => field !== 'otp')
    for (const [field, message] of entries) {
      setError(field as keyof ApplyForm, { message })
    }
    return entries.length > 0
  }

  const requestCode = useMutation({
    mutationFn: (payload: ApplicationInput) => requestApplicationOtp(payload),
    onSuccess: (result, payload) => {
      setPending(payload)
      setOtp('')
      setOtpError(null)
      setResendIn(result.resend_in)
      setStep('verify')
    },
    onError: (error) => {
      // Problems with the details (bad email, already applied) are shown on the form itself.
      setStep('form')
      if (!showFieldErrors(error)) push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const confirmCode = useMutation({
    mutationFn: (input: { payload: ApplicationInput; code: string }) =>
      submitApplication({ ...input.payload, otp: input.code }),
    onSuccess: () => {
      setDone(true)
      setStep('form')
      setPending(null)
      setOtp('')
      reset({
        dial_code: DEFAULT_COUNTRY.dial,
        country: DEFAULT_COUNTRY.name,
        whatsapp_same: true,
        whatsapp_dial_code: DEFAULT_COUNTRY.dial,
        website: '',
      })
    },
    onError: (error) => {
      const fieldErrors = mapValidationErrors(error)
      if (fieldErrors.otp) {
        setOtpError(fieldErrors.otp)
        return
      }
      if (showFieldErrors(error)) {
        setStep('form')
        return
      }
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  function buildPayload(values: ApplyForm): ApplicationInput {
    return {
      company_name: values.company_name,
      contact_name: values.contact_name,
      email: values.email,
      phone: `${values.dial_code} ${localDigits(values.phone)}`,
      whatsapp: values.whatsapp_same
        ? `${values.dial_code} ${localDigits(values.phone)}`
        : `${values.whatsapp_dial_code} ${localDigits(values.whatsapp ?? '')}`,
      city: values.city || undefined,
      country: values.country,
      message: values.message || undefined,
      plan_slug: selectedPlan?.slug,
      website: values.website,
    }
  }

  function verify() {
    if (!pending || otp.length !== 6) return
    setOtpError(null)
    confirmCode.mutate({ payload: pending, code: otp })
  }

  useEffect(() => {
    document.title = `${t('apply.formTitle', 'Application form')} \u00b7 ${t('app.name', 'YK Digital Solutions')}`
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const busy = isSubmitting || requestCode.isPending

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9ff] text-[#0b1c30] lg:flex-row">
      <aside
        className="flex flex-col px-6 py-10 text-white sm:px-14 lg:w-[460px] lg:shrink-0 xl:w-[500px]"
        style={ASIDE_BACKGROUND}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#004ac6] text-white">
            <ScanLine className="h-[18px] w-[18px]" />
          </span>
          <span className="text-xl font-bold tracking-[-0.02em] text-white">{t('app.name', 'YK Digital Solutions')}</span>
        </Link>

        <h1 className="mt-12 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] sm:text-[40px] lg:mt-16">
          {t('apply.title', "Let's get your business set up.")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#cbd5e1]">
          {t(
            'apply.subtitle',
            'Tell us a little about you. A real person from our team will call you and switch everything on.',
          )}
        </p>

        <Stepper />

        <SelectedPlanCard plan={selectedPlan} canChange={plans.length > 1} />

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2.5 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-[18px] w-[18px] text-[#4edea3]" />
            {t('apply.talkFirst', 'Prefer to talk first? Message us on WhatsApp')}
          </a>
        ) : null}
      </aside>

      <main className="flex flex-1 flex-col px-5 py-10 sm:px-10 lg:px-18">
        <div className="flex items-center justify-end gap-5 text-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-[#434655] hover:text-[#004ac6]">
            <ChevronLeft className="h-4 w-4" />
            {t('public.backHome', 'Back to home')}
          </Link>
          <span className="text-[#c3c6d7]">|</span>
          <span className="text-[#434655]">
            {t('apply.alreadyCustomer', 'Already a customer?')}{' '}
            <Link to="/login" className="font-semibold text-[#004ac6]">
              {t('auth.login', 'Log in')}
            </Link>
          </span>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit((values) => requestCode.mutate(buildPayload(values)))}
          className={cn('mx-auto mt-7 w-full max-w-[760px]', step === 'verify' && 'hidden')}
        >
          <h2 className="text-[26px] font-extrabold tracking-[-0.025em] sm:text-[30px]">
            {t('apply.formTitle', 'Application form')}
          </h2>
          <p className="mt-1.5 text-[15px] text-[#434655]">
            {t('apply.requiredNote', 'Fields marked')} <span className="text-[#be123c]">*</span>{' '}
            {t('apply.requiredNoteEnd', 'are required.')}
          </p>

          <div className="mt-7 grid gap-x-5 gap-y-4.5 sm:grid-cols-2">
            <PublicInput
              label={t('apply.contactName', 'Full name')}
              required
              autoComplete="name"
              placeholder="e.g. Javier Moreno"
              error={errors.contact_name?.message}
              {...register('contact_name')}
            />
            <PublicInput
              label={t('apply.companyName', 'Business name')}
              required
              autoComplete="organization"
              placeholder="e.g. Ferretería Moreno S.L."
              error={errors.company_name?.message}
              {...register('company_name')}
            />

            <PublicSelect
              label={t('apply.country', 'Country')}
              required
              autoComplete="country-name"
              error={errors.country?.message}
              {...register('country', { onChange: (event) => changeCountry(event.target.value) })}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
            </PublicSelect>
            <PublicInput
              label={t('apply.city', 'City')}
              autoComplete="address-level2"
              placeholder="e.g. Madrid"
              error={errors.city?.message}
              {...register('city')}
            />

            <PublicInput
              label={t('apply.email', 'Email')}
              type="email"
              required
              autoComplete="email"
              placeholder="you@business.es"
              error={errors.email?.message}
              {...register('email')}
            />
            <PhoneField
              id="phone"
              label={t('apply.phone', 'Phone')}
              required
              error={errors.phone?.message}
              dial={dialCode}
              onDialChange={changePhoneDial}
              number={register('phone', { onChange: (event) => typePhone(event.target.value) })}
            />

            <div className="sm:col-span-2">
              <div className="mb-[7px] flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#334155]">
                  {t('apply.whatsapp', 'WhatsApp number')}
                </span>
                <Controller
                  control={control}
                  name="whatsapp_same"
                  render={({ field }) => (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[#64748b]">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => {
                          field.onChange(event.target.checked)
                          if (!event.target.checked) {
                            setValue('whatsapp_dial_code', getValues('dial_code'))
                            setValue('whatsapp', '')
                          }
                        }}
                        className="h-4 w-4 accent-[#004ac6]"
                      />
                      {t('apply.sameAsPhone', 'Same as phone')}
                    </label>
                  )}
                />
              </div>

              {sameWhatsapp ? (
                <p className="text-[13px] text-[#64748b]">
                  {phoneValue?.trim()
                    ? `${t('apply.willMessage', "We'll also use")} ${dialCode} ${phoneValue} ${t('apply.forWhatsapp', 'for WhatsApp.')}`
                    : t('apply.willUsePhone', 'We will use your phone number for WhatsApp.')}
                </p>
              ) : (
                <PhoneField
                  id="whatsapp"
                  label=""
                  error={errors.whatsapp?.message}
                  dial={waDial ?? DEFAULT_COUNTRY.dial}
                  onDialChange={changeWhatsappDial}
                  number={register('whatsapp', { onChange: (event) => typeWhatsapp(event.target.value) })}
                />
              )}
            </div>

            {plans.length > 0 ? (
              <fieldset className="sm:col-span-2">
                <legend className="sr-only">{t('apply.choosePlan', 'Choose a plan')}</legend>
                <div className="flex flex-col gap-3">
                  {plans.map((plan) => {
                    const active = selectedPlan?.id === plan.id
                    return (
                      <label
                        key={plan.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-4 rounded-2xl bg-white px-4.5 py-3.5 transition-colors',
                          active ? 'border-2 border-[#004ac6]' : 'border border-[#dbe1ff] hover:border-[#c3d4ff]',
                        )}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={plan.slug}
                          checked={active}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="h-[22px] w-[22px] shrink-0 accent-[#004ac6]"
                        />
                        <span className="flex-1">
                          <span className="block text-[15px] font-bold">{plan.name} plan</span>
                          {plan.description ? (
                            <span className="block text-[13px] text-[#434655]">{plan.description}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0">
                          <span className="text-[22px] font-extrabold tracking-[-0.02em]">
                            {formatPlanPrice(plan.price, plan.currency)}
                          </span>
                          <span className="text-[13px] text-[#434655]"> / {plan.interval}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            <PublicTextarea
              fieldClassName="sm:col-span-2"
              label={t('apply.message', 'Anything we should know?')}
              optional
              rows={3}
              placeholder="e.g. We have around 800 products in an Excel sheet and two shops in Valencia."
              error={errors.message?.message}
              {...register('message')}
            />

            <div className="sm:col-span-2">
              <label className="flex items-start gap-2.5 text-sm leading-relaxed text-[#434655]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#004ac6]"
                  {...register('consent')}
                />
                <span>
                  {t(
                    'apply.consent',
                    'I agree that YK Digital Solutions may contact me by phone, email or WhatsApp about this application, and I accept the',
                  )}{' '}
                  <Link to="/privacy" className="font-semibold text-[#004ac6]">
                    {t('apply.privacyPolicy', 'privacy policy')}
                  </Link>
                  .
                </span>
              </label>
              {errors.consent ? <p className="mt-1.5 text-[13px] text-rose-600">{errors.consent.message}</p> : null}
            </div>
          </div>

          {/* Honeypot: hidden from people, irresistible to bots. */}
          <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
          </div>

          <div className="mt-6 flex flex-col-reverse items-start justify-between gap-5 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 text-[13px] text-[#64748b]">
              <ShieldCheck className="h-4 w-4 text-[#007d55]" />
              {t('apply.noPayment', 'No payment now. We only use your details to set up your account.')}
            </span>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-[14px] bg-[#004ac6] px-8 text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] transition-colors hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? t('apply.sendingCode', 'Sending code') : t('apply.submit', 'Send application')}
              <ArrowRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </form>

        {step === 'verify' && pending ? (
          <section className="mx-auto mt-7 w-full max-w-[520px]" aria-labelledby="verify-title">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff4ff] text-[#004ac6]">
              <MailCheck className="h-7 w-7" />
            </span>
            <h2 id="verify-title" className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] sm:text-[30px]">
              {t('apply.verifyTitle', 'Check your email')}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">
              {t('apply.verifyBody', 'We sent a 6-digit code to')}{' '}
              <span className="font-semibold text-[#0b1c30] break-all">{pending.email}</span>.{' '}
              {t('apply.verifyBody2', 'Enter it below to send your application.')}
            </p>

            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                verify()
              }}
              className="mt-6"
            >
              <span className="mb-2.5 block text-[13px] font-semibold text-[#334155]">
                {t('apply.otpLabel', 'Verification code')}
              </span>
              <OtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next)
                  setOtpError(null)
                }}
                error={Boolean(otpError)}
                disabled={confirmCode.isPending}
                autoFocus
                describedBy={otpError ? 'otp-error' : 'otp-hint'}
                aria-label={t('apply.otpLabel', 'Verification code')}
              />
              {otpError ? (
                <p id="otp-error" role="alert" className="mt-2 text-[13px] text-rose-600">
                  {otpError}
                </p>
              ) : (
                <p id="otp-hint" className="mt-2 text-[13px] text-[#64748b]">
                  {t('apply.otpHint', 'The code is valid for 10 minutes. Check your spam folder if you do not see it.')}
                </p>
              )}

              <button
                type="submit"
                disabled={otp.length !== 6 || confirmCode.isPending}
                className="mt-6 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-[#004ac6] px-8 text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] transition-colors hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirmCode.isPending
                  ? t('apply.sending', 'Sending')
                  : t('apply.verifySubmit', 'Verify and send application')}
                <ArrowRight className="h-[18px] w-[18px]" />
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[#434655] hover:text-[#004ac6]"
              >
                <ChevronLeft className="h-4 w-4" />
                {t('apply.editDetails', 'Edit my details')}
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || requestCode.isPending}
                onClick={() => pending && requestCode.mutate(pending)}
                className="cursor-pointer font-semibold text-[#004ac6] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
              >
                {resendIn > 0
                  ? `${t('apply.resendIn', 'Resend code in')} ${resendIn}s`
                  : t('apply.resend', 'Resend code')}
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <Modal
        open={done}
        onClose={() => setDone(false)}
        title={t('apply.successTitle', 'Application received')}
        maxWidth="md"
        footer={
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-xl bg-[#004ac6] px-5 text-sm font-semibold text-white hover:bg-[#2563eb]"
          >
            {t('apply.successAction', 'Back to home')}
          </Link>
        }
      >
        <div className="flex gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#007d55]">
            <Check className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <p className="text-[15px] leading-relaxed text-[#434655]">
            {t(
              'apply.successBody',
              'Thanks. We will contact you on the number you gave us, usually within one working day.',
            )}
          </p>
        </div>
      </Modal>
    </div>
  )
}

export default Apply
