import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { ArrowLeft, ArrowRight, Check, ImagePlus, Languages, Loader2, LogOut, MapPin, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Logo } from '../../components/brand/Logo'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { LanguageChoice, useChangeLanguage } from '../../components/ui/LanguageSwitcher'
import { PublicFieldShell, PublicInput, PublicSelect, PublicTextarea, publicControlClass } from '../../components/ui/PublicField'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { useToast } from '../../components/ui/Toast'
import { getLocale, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { COUNTRIES, DEFAULT_COUNTRY, DIAL_OPTIONS, countryByName, localDigits } from '../../lib/countries'
import { COMPANY_CURRENCIES } from '../../lib/currencies'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { updateCompany } from '../../services/company'
import { loadLogoBlob, uploadCompanyLogo } from '../../services/printables'
import type { Company } from '../../types/module01'

type Draft = {
  name: string
  tax_id: string
  email: string
  phone_dial: string
  phone: string
  whatsapp_dial: string
  whatsapp: string
  address: string
  country: string
  city: string
  postal_code: string
  currency: string
}

type FieldName = keyof Draft | 'logo'

const RESUME_KEY = 'setup-resume'

const STEPS: { id: string; title: string; hint: string; icon: typeof Store }[] = [
  { id: 'language', title: t('setup.stepLanguage', 'Language'), hint: t('setup.stepLanguageHint', 'English or Spanish, for the whole company'), icon: Languages },
  { id: 'business', title: t('setup.stepBusiness', 'Your business'), hint: t('setup.stepBusinessHint', 'Name, tax number and how to reach you'), icon: Store },
  { id: 'place', title: t('setup.stepPlace', 'Where you are'), hint: t('setup.stepPlaceHint', 'Address and currency'), icon: MapPin },
  { id: 'logo', title: t('setup.stepLogo', 'Your logo'), hint: t('setup.stepLogoHint', 'Then you are ready'), icon: ImagePlus },
]

/** Which step each field lives on, so a server error can send the person back to it. */
const STEP_OF: Record<FieldName, number> = {
  name: 1,
  tax_id: 1,
  email: 1,
  phone_dial: 1,
  phone: 1,
  whatsapp_dial: 1,
  whatsapp: 1,
  address: 2,
  country: 2,
  city: 2,
  postal_code: 2,
  currency: 2,
  logo: 3,
}

function splitPhone(value: string | null | undefined, fallbackDial: string): { dial: string; number: string } {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined
  if (parsed) return { dial: `+${parsed.countryCallingCode}`, number: parsed.nationalNumber }
  return { dial: fallbackDial, number: value ? localDigits(value) : '' }
}

function draftFrom(company: Company | null): Draft {
  const country = countryByName(company?.country ?? undefined) ?? DEFAULT_COUNTRY
  const phone = splitPhone(company?.phone, country.dial)
  const whatsapp = splitPhone(company?.whatsapp, phone.dial)

  return {
    name: company?.name ?? '',
    tax_id: company?.tax_id ?? '',
    email: company?.email ?? '',
    phone_dial: phone.dial,
    phone: phone.number,
    whatsapp_dial: whatsapp.dial,
    whatsapp: whatsapp.number,
    address: company?.address ?? '',
    country: country.name,
    city: company?.city ?? '',
    postal_code: company?.postal_code ?? '',
    currency: company?.currency ?? 'EUR',
  }
}

const joinPhone = (dial: string, number: string) => `${dial}${localDigits(number)}`

function PhoneInput({
  id,
  label,
  dial,
  number,
  error,
  onDial,
  onNumber,
}: {
  id: string
  label: string
  dial: string
  number: string
  error?: string
  onDial: (dial: string) => void
  onNumber: (number: string) => void
}) {
  return (
    <PublicFieldShell id={id} label={label} required error={error}>
      <span className="flex gap-2">
        <span className="w-[104px] shrink-0">
          <SearchableSelect
            tone="public"
            aria-label={t('apply.dialCode', 'Dialling code')}
            options={DIAL_OPTIONS}
            value={dial}
            onChange={(event) => onDial(event.target.value)}
          />
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-invalid={Boolean(error)}
          value={number}
          onChange={(event) => onNumber(event.target.value)}
          className={cn(publicControlClass, 'h-12 min-w-0 flex-1 px-3.5 tracking-wide', error && 'border-[#e11d48]')}
        />
      </span>
    </PublicFieldShell>
  )
}

function validate(step: number, draft: Draft, hasLogo: boolean): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {}
  const need = (field: keyof Draft, message = t('setup.required', 'This field is required.')) => {
    if (draft[field].trim() === '') errors[field] = message
  }

  if (step === 0) {
    need('name')
    need('tax_id')
    if (draft.tax_id.trim() !== '' && !/^[A-Za-z0-9][A-Za-z0-9\s.\-/]{3,30}$/.test(draft.tax_id.trim())) {
      errors.tax_id = t('setup.taxIdInvalid', 'Enter a valid NIF, NIE or CIF.')
    }
    need('email')
    if (draft.email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) errors.email = t('setup.emailInvalid', 'Enter a valid email address.')
    if (localDigits(draft.phone).length < 6) errors.phone = t('setup.phoneInvalid', 'Enter a valid phone number.')
    if (localDigits(draft.whatsapp).length < 6) errors.whatsapp = t('setup.whatsappInvalid', 'Enter a valid WhatsApp number.')
  }

  if (step === 1) {
    need('address')
    need('country')
    need('city')
    need('postal_code')
    if (draft.postal_code.trim() !== '' && !/^[A-Za-z0-9][A-Za-z0-9\s-]{1,14}$/.test(draft.postal_code.trim())) {
      errors.postal_code = t('setup.postalInvalid', 'Enter a valid postal code.')
    }
    need('currency')
  }

  if (step === 2 && !hasLogo) errors.logo = t('setup.logoRequired', 'Upload your company logo to finish.')

  return errors
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#e5eeff] py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-[#64748b]">{label}</dt>
      <dd className="m-0 min-w-0 text-right font-medium break-words text-[#0b1c30]">{value}</dd>
    </div>
  )
}

export default function CompanySetup() {
  const { session, refresh, logout } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const company = session?.company ?? null

  // Choosing the other language reloads the page; this puts the person back on the step after it.
  const [step, setStep] = useState(() => {
    try {
      const resume = window.sessionStorage.getItem(RESUME_KEY) === '1'
      window.sessionStorage.removeItem(RESUME_KEY)
      return resume ? 1 : 0
    } catch {
      return 0
    }
  })
  const changing = useChangeLanguage()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(company))
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})

  const logoUrl = company?.logo_url ?? null
  const logoBlob = useQuery({
    queryKey: ['app', 'print-logo', logoUrl],
    queryFn: () => loadLogoBlob(logoUrl),
    enabled: Boolean(logoUrl),
  })

  // Fill the form once, from whatever the admin already entered when the account was made.
  useEffect(() => {
    if (company) setDraft((current) => (current.name === '' && current.email === '' ? draftFrom(company) : current))
  }, [company])

  const currencies = useMemo(() => COMPANY_CURRENCIES, [])

  const logoUp = useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app', 'print-logo'] })
      await refresh()
      setErrors((current) => ({ ...current, logo: undefined }))
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const finish = useMutation({
    mutationFn: () =>
      updateCompany({
        name: draft.name.trim(),
        tax_id: draft.tax_id.trim(),
        email: draft.email.trim(),
        phone: joinPhone(draft.phone_dial, draft.phone),
        whatsapp: joinPhone(draft.whatsapp_dial, draft.whatsapp),
        address: draft.address.trim(),
        city: draft.city.trim(),
        postal_code: draft.postal_code.trim(),
        country: draft.country.trim(),
        currency: draft.currency,
      }),
    onSuccess: async () => {
      await refresh()
      push({ tone: 'success', title: t('setup.done', 'Your company is set up. Welcome aboard!') })
      navigate('/app/dashboard', { replace: true })
    },
    onError: (error) => {
      const server = mapValidationErrors(error)
      const fields = Object.keys(server)
      if (fields.length === 0) {
        push({ tone: 'danger', title: getErrorMessage(error) })
        return
      }
      const mapped: Partial<Record<FieldName, string>> = {}
      for (const [field, message] of Object.entries(server)) mapped[field as FieldName] = message
      setErrors(mapped)
      const earliest = Math.min(...fields.map((field) => STEP_OF[field as FieldName] ?? 3))
      setStep(earliest)
    },
  })

  if (!company) return <Navigate to="/login" replace />
  // Nothing left to set up: straight to the workspace.
  if (company.profile_complete !== false) return <Navigate to="/app/dashboard" replace />

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(partial)) delete next[key as FieldName]
      return next
    })
  }

  function next() {
    const found = validate(step - 1, draft, Boolean(logoUrl))
    setErrors(found)
    if (Object.keys(found).length === 0) setStep((current) => current + 1)
  }

  function submit() {
    const found = validate(2, draft, Boolean(logoUrl))
    setErrors(found)
    if (Object.keys(found).length === 0) finish.mutate()
  }

  const last = step === STEPS.length - 1

  return (
    <div className="grid min-h-screen bg-[#f8f9ff] lg:grid-cols-[400px_minmax(0,1fr)]">
      <aside
        className="relative flex flex-col px-6 py-8 text-white lg:px-10 lg:py-12"
        style={{
          backgroundColor: '#0b1c30',
          backgroundImage:
            'radial-gradient(520px 420px at 20% 18%, rgba(37,99,235,0.35), rgba(11,28,48,0) 70%), radial-gradient(420px 320px at 90% 95%, rgba(78,222,163,0.16), rgba(11,28,48,0) 70%)',
        }}
      >
        <Logo on="dark" className="h-12 self-start" />
        <h1 className="mt-8 text-[28px] leading-[1.15] font-extrabold tracking-[-0.03em] lg:mt-14 lg:text-[34px]">
          {t('setup.title', 'Let us set up your company')}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#cbd5e1]">
          {t('setup.intro', 'Four quick steps. These details print on your invoices, and your workspace opens as soon as you finish.')}
        </p>

        <ol className="mt-8 hidden flex-col gap-1 lg:flex">
          {STEPS.map((item, index) => {
            const done = index < step
            const current = index === step
            const Icon = item.icon
            return (
              <li
                key={item.id}
                className={cn('flex items-center gap-3.5 rounded-2xl px-3.5 py-3 transition-colors', current ? 'bg-white/10' : '')}
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold',
                    done
                      ? 'border-[#4edea3] bg-[#4edea3] text-[#0b1c30]'
                      : current
                        ? 'border-white/30 bg-[#004ac6] text-white'
                        : 'border-white/15 text-[#94a3b8]',
                  )}
                >
                  {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-[18px] w-[18px]" />}
                </span>
                <span className="min-w-0">
                  <span className={cn('block text-[15px] font-semibold', current || done ? 'text-white' : 'text-[#94a3b8]')}>{item.title}</span>
                  <span className="block text-xs text-[#94a3b8]">{item.hint}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-8 inline-flex cursor-pointer items-center gap-2 self-start text-sm font-medium text-[#94a3b8] hover:text-white lg:mt-auto"
        >
          <LogOut className="h-4 w-4" />
          {t('setup.logout', 'Log out')}
        </button>
      </aside>

      <main className="flex items-start justify-center px-5 py-8 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full max-w-[560px]">
          <div className="mb-6 flex items-center gap-2 lg:hidden" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span key={item.id} className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-[#004ac6]' : 'bg-[#dbe1ff]')} />
            ))}
          </div>

          <p className="text-[13px] font-bold tracking-[0.1em] text-[#004ac6] uppercase">
            {t('setup.step', 'Step')} {step + 1} {t('setup.of', 'of')} {STEPS.length}
          </p>
          <h2 className="mt-1.5 text-[28px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">{STEPS[step].title}</h2>
          <p className="mt-1 text-[15px] text-[#434655]">{STEPS[step].hint}</p>

          <div className="mt-7 flex flex-col gap-4.5">
            {step === 0 ? (
              <>
                <LanguageChoice
                  value={getLocale()}
                  busy={changing.pending ? getLocale() : null}
                  onChange={(next) => {
                    if (next === getLocale()) {
                      setStep(1)
                      return
                    }
                    // Saving the language reloads the page; remember to come back to the next step, not the first.
                    try {
                      window.sessionStorage.setItem(RESUME_KEY, '1')
                    } catch {
                      /* the wizard then simply starts again, in the new language */
                    }
                    void changing.change(next)
                  }}
                />
                <p className="text-[13px] text-[#64748b]">
                  {t('setup.languageNote', 'This is the language of your whole company: the app, invoices, quotations, emails and WhatsApp messages. You can change it later in Settings.')}
                </p>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <PublicInput
                  label={t('settings.companyName', 'Company name')}
                  required
                  autoComplete="organization"
                  placeholder={t('companySetup.e_g_taller_de_marta_s_l', 'e.g. Taller de Marta S.L.')}
                  value={draft.name}
                  error={errors.name}
                  onChange={(event) => patch({ name: event.target.value })}
                />
                <PublicInput
                  label={t('settings.taxId', 'NIF / NIE / CIF')}
                  required
                  hint={t('setup.taxIdHint', 'Your tax number, printed on every invoice.')}
                  autoCapitalize="characters"
                  placeholder={t('companySetup.e_g_b12345678', 'e.g. B12345678')}
                  value={draft.tax_id}
                  error={errors.tax_id}
                  onChange={(event) => patch({ tax_id: event.target.value })}
                />
                <PublicInput
                  type="email"
                  label={t('settings.email', 'Email')}
                  required
                  autoComplete="email"
                  value={draft.email}
                  error={errors.email}
                  onChange={(event) => patch({ email: event.target.value })}
                />
                <PhoneInput
                  id="setup-phone"
                  label={t('settings.phone', 'Phone')}
                  dial={draft.phone_dial}
                  number={draft.phone}
                  error={errors.phone}
                  onDial={(dial) => patch({ phone_dial: dial })}
                  onNumber={(number) => patch({ phone: number })}
                />
                <PhoneInput
                  id="setup-whatsapp"
                  label={t('settings.whatsapp', 'WhatsApp')}
                  dial={draft.whatsapp_dial}
                  number={draft.whatsapp}
                  error={errors.whatsapp}
                  onDial={(dial) => patch({ whatsapp_dial: dial })}
                  onNumber={(number) => patch({ whatsapp: number })}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <PublicTextarea
                  label={t('settings.address', 'Address')}
                  required
                  rows={3}
                  autoComplete="street-address"
                  placeholder={t('companySetup.street_number_floor', 'Street, number, floor')}
                  value={draft.address}
                  error={errors.address}
                  onChange={(event) => patch({ address: event.target.value })}
                />
                <div className="grid gap-4.5 sm:grid-cols-2">
                  <PublicInput
                    label={t('settings.city', 'City')}
                    required
                    autoComplete="address-level2"
                    value={draft.city}
                    error={errors.city}
                    onChange={(event) => patch({ city: event.target.value })}
                  />
                  <PublicInput
                    label={t('settings.postalCode', 'Postal code')}
                    required
                    autoComplete="postal-code"
                    autoCapitalize="characters"
                    value={draft.postal_code}
                    error={errors.postal_code}
                    onChange={(event) => patch({ postal_code: event.target.value })}
                  />
                </div>
                <div className="grid gap-4.5 sm:grid-cols-2">
                  <PublicSelect
                    label={t('settings.country', 'Country')}
                    required
                    autoComplete="country-name"
                    value={draft.country}
                    error={errors.country}
                    onChange={(event) => patch({ country: event.target.value })}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </PublicSelect>
                  <PublicSelect
                    label={t('settings.currency', 'Currency')}
                    required
                    value={draft.currency}
                    error={errors.currency}
                    onChange={(event) => patch({ currency: event.target.value })}
                  >
                    {currencies.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.label}
                      </option>
                    ))}
                  </PublicSelect>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className={cn('rounded-2xl border bg-white p-4', errors.logo ? 'border-[#e11d48]' : 'border-[#dbe1ff]')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e5eeff] bg-[#f8f9ff]">
                      {logoUp.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#004ac6]" />
                      ) : logoBlob.data ? (
                        <img src={logoBlob.data} alt="" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <ImagePlus className="h-7 w-7 text-[#94a3b8]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <FileDropzone accept="image/jpeg,image/png,image/webp" disabled={logoUp.isPending} onFile={(file) => logoUp.mutate(file)}>
                        <p className="text-sm font-semibold text-[#0b1c30]">
                          {logoUrl
                            ? t('settings.replaceLogo', 'Drop a new logo or click to replace it')
                            : t('settings.dropLogo', 'Drop your logo or click to upload')}
                        </p>
                        <p className="mt-1 text-xs text-[#64748b]">{t('settings.logoTypes', 'JPEG, PNG or WebP · 5 MB max')}</p>
                      </FileDropzone>
                    </div>
                  </div>
                  {errors.logo ? <p className="mt-2 text-[13px] font-medium text-[#be123c]">{errors.logo}</p> : null}
                </div>

                <dl className="m-0 rounded-2xl border border-[#dbe1ff] bg-white px-4 py-1.5">
                  <Review label={t('settings.companyName', 'Company name')} value={draft.name} />
                  <Review label={t('settings.taxId', 'NIF / NIE / CIF')} value={draft.tax_id.toUpperCase()} />
                  <Review label={t('settings.email', 'Email')} value={draft.email} />
                  <Review label={t('settings.phone', 'Phone')} value={`${draft.phone_dial} ${draft.phone}`} />
                  <Review label={t('settings.whatsapp', 'WhatsApp')} value={`${draft.whatsapp_dial} ${draft.whatsapp}`} />
                  <Review label={t('settings.address', 'Address')} value={`${draft.address}, ${draft.postal_code} ${draft.city}, ${draft.country}`} />
                  <Review label={t('settings.currency', 'Currency')} value={draft.currency} />
                </dl>
              </>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] border border-[#dbe1ff] bg-white px-5 text-sm font-semibold text-[#0b1c30] hover:border-[#c3d4ff]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('setup.back', 'Back')}
              </button>
            ) : (
              <span />
            )}
            {last ? (
              <button
                type="button"
                disabled={finish.isPending || logoUp.isPending}
                onClick={submit}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] bg-[#004ac6] px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
                {t('setup.finish', 'Finish setup')}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-[14px] bg-[#004ac6] px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] hover:bg-[#2563eb]"
              >
                {t('setup.next', 'Continue')}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
