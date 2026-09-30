import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, Coins, CreditCard, KeyRound, Mail, MessageCircle, Percent, Settings, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { COMPANY_CURRENCIES } from '../../lib/currencies'
import { formatCurrency, formatDate } from '../../lib/format'
import { getAppSubscription } from '../../services/app'
import { changePassword } from '../../services/auth'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  createRecargoRate,
  createTaxRate,
  deleteRecargoRate,
  deleteTaxRate,
  listRecargoRates,
  listTaxRates,
  updateRecargoRate,
  updateTaxRate,
} from '../../services/catalog'
import { updateCompany } from '../../services/company'
import type { Company } from '../../types/module01'

import { RatesManager, type RatesApi } from './RatesManager'
import { WhatsAppTab } from './WhatsAppTab'

type TabId = 'company' | 'subscription' | 'password' | 'iva' | 'recargo' | 'whatsapp'

type CompanyDraft = {
  name: string
  email: string
  phone: string
  whatsapp: string
  address: string
  city: string
  country: string
  currency: string
}

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'company', label: t('settings.tabCompany', 'Company'), icon: Building2 },
  { id: 'subscription', label: t('settings.tabSubscription', 'Subscription'), icon: CreditCard },
  { id: 'password', label: t('settings.tabPassword', 'Password'), icon: KeyRound },
  { id: 'iva', label: t('settings.tabIva', 'IVA'), icon: Percent },
  { id: 'recargo', label: t('settings.tabRecargo', 'Recargo'), icon: Coins },
  { id: 'whatsapp', label: t('settings.tabWhatsApp', 'WhatsApp'), icon: MessageCircle },
]

function parseTab(value: string | null): TabId {
  if (value === 'subscription' || value === 'password' || value === 'iva' || value === 'recargo' || value === 'whatsapp') return value
  return 'company'
}

function blankDraft(): CompanyDraft {
  return {
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: '',
    currency: 'USD',
  }
}

function draftFrom(company: Company): CompanyDraft {
  return {
    name: company.name,
    email: company.email,
    phone: company.phone ?? '',
    whatsapp: company.whatsapp ?? '',
    address: company.address ?? '',
    city: company.city ?? '',
    country: company.country ?? '',
    currency: company.currency,
  }
}

function optional(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function CompanyTab() {
  const { session, refresh } = useAuth()
  const { push } = useToast()
  const company = session?.company ?? null
  const [draft, setDraft] = useState<CompanyDraft>(company ? draftFrom(company) : blankDraft())
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company) setDraft(draftFrom(company))
  }, [company])

  const currencies = useMemo(() => {
    const codes = COMPANY_CURRENCIES.map((item) => item.code)
    if (draft.currency && !codes.includes(draft.currency as (typeof codes)[number])) {
      return [{ code: draft.currency, label: draft.currency }, ...COMPANY_CURRENCIES]
    }
    return COMPANY_CURRENCIES
  }, [draft.currency])

  function patch(partial: Partial<CompanyDraft>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  const save = useMutation({
    mutationFn: () =>
      updateCompany({
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: optional(draft.phone),
        whatsapp: optional(draft.whatsapp),
        address: optional(draft.address),
        city: optional(draft.city),
        country: optional(draft.country),
        currency: draft.currency,
      }),
    onSuccess: async () => {
      setErrors({})
      await refresh()
      push({ tone: 'success', title: t('settings.companySaved', 'Company details saved.') })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const canSave = draft.name.trim() !== '' && draft.email.trim() !== '' && draft.currency.length === 3

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="text-xs text-slate-500">
        {t('settings.companyHint', 'This name, address and currency print on invoices, quotes and delivery notes.')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('settings.companyName', 'Company name')}
          value={draft.name}
          error={errors.name}
          required
          onChange={(event) => patch({ name: event.target.value })}
        />
        <Input
          type="email"
          label={t('settings.email', 'Email')}
          value={draft.email}
          error={errors.email}
          required
          onChange={(event) => patch({ email: event.target.value })}
        />
        <Input
          label={t('settings.phone', 'Phone')}
          value={draft.phone}
          error={errors.phone}
          onChange={(event) => patch({ phone: event.target.value })}
        />
        <Input
          label={t('settings.whatsapp', 'WhatsApp')}
          value={draft.whatsapp}
          error={errors.whatsapp}
          onChange={(event) => patch({ whatsapp: event.target.value })}
        />
        <div className="sm:col-span-2">
          <Textarea
            label={t('settings.address', 'Address')}
            rows={3}
            value={draft.address}
            error={errors.address}
            onChange={(event) => patch({ address: event.target.value })}
          />
        </div>
        <Input
          label={t('settings.city', 'City')}
          value={draft.city}
          error={errors.city}
          onChange={(event) => patch({ city: event.target.value })}
        />
        <Input
          label={t('settings.country', 'Country')}
          value={draft.country}
          error={errors.country}
          onChange={(event) => patch({ country: event.target.value })}
        />
        <Select
          label={t('settings.currency', 'Currency')}
          hint={t(
            'settings.currencyHint',
            'Used when amounts are shown. Existing documents keep the numbers they already have.',
          )}
          value={draft.currency}
          error={errors.currency}
          required
          onChange={(event) => patch({ currency: event.target.value })}
        >
          {currencies.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} — {item.label}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-[11px] text-slate-400">
        {t('settings.logoOnPrintables', 'The company logo is uploaded under Printables.')}
      </p>
      <div>
        <Button type="button" disabled={!canSave} loading={save.isPending} onClick={() => save.mutate()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  )
}

function PasswordTab() {
  const { session } = useAuth()
  const { push } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () =>
      changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      }),
    onSuccess: () => {
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setErrors({})
      push({ tone: 'success', title: t('settings.passwordSaved', 'Password updated.') })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const canSave = currentPassword !== '' && password.length >= 8 && confirmation !== ''

  return (
    <div className="flex max-w-lg flex-col gap-5 p-5">
      <p className="text-xs text-slate-500">
        {t('settings.passwordHint', 'Changes the password for the account you are signed in with.')}
      </p>
      {session?.user.email ? (
        <p className="text-xs text-slate-600">
          {t('settings.accountEmail', 'Signed in as')}{' '}
          <span className="font-semibold text-slate-800">{session.user.email}</span>
        </p>
      ) : null}
      <Input
        type="password"
        autoComplete="current-password"
        label={t('settings.currentPassword', 'Current password')}
        value={currentPassword}
        error={errors.current_password}
        required
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={t('settings.newPassword', 'New password')}
        hint={t('settings.passwordRule', 'Use at least 8 characters.')}
        value={password}
        error={errors.password}
        required
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={t('settings.confirmPassword', 'Confirm new password')}
        value={confirmation}
        error={errors.password_confirmation}
        required
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <div>
        <Button type="button" disabled={!canSave} loading={save.isPending} onClick={() => save.mutate()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  )
}

const IVA_API: RatesApi = {
  list: listTaxRates,
  create: createTaxRate,
  update: updateTaxRate,
  remove: deleteTaxRate,
}

const RECARGO_API: RatesApi = {
  list: listRecargoRates,
  create: createRecargoRate,
  update: updateRecargoRate,
  remove: deleteRecargoRate,
}

function IvaTab() {
  return (
    <RatesManager
      queryKey={['app', 'tax-rates']}
      api={IVA_API}
      hint={t('settings.ivaHint', 'These IVA rates appear on products and on the invoice.')}
      namePlaceholder={t('settings.rateNamePlaceholder', 'General')}
      ratePlaceholder="21"
      added={t('settings.rateAdded', 'IVA rate added.')}
      updated={t('settings.rateUpdated', 'IVA rate updated.')}
      removed={t('settings.rateRemoved', 'IVA rate removed.')}
      deleteTitle={t('settings.deleteRateTitle', 'Remove this IVA rate?')}
      deleteBody={t(
        'settings.deleteRateBody',
        ':name will disappear from the product and invoice lists. Products that already use it keep their rate.',
      )}
    />
  )
}

function RecargoTab() {
  return (
    <RatesManager
      queryKey={['app', 'recargo-rates']}
      api={RECARGO_API}
      hint={t(
        'settings.recargoHint',
        'Recargo de equivalencia is the surcharge some retailers pay on top of IVA. Keep the rates you use here.',
      )}
      namePlaceholder={t('settings.recargoNamePlaceholder', 'General')}
      ratePlaceholder="5.2"
      added={t('settings.recargoAdded', 'Recargo rate added.')}
      updated={t('settings.recargoUpdated', 'Recargo rate updated.')}
      removed={t('settings.recargoRemoved', 'Recargo rate removed.')}
      deleteTitle={t('settings.deleteRecargoTitle', 'Remove this recargo rate?')}
      deleteBody={t('settings.deleteRecargoBody', ':name will be removed from your recargo list.')}
      emptyText={t('settings.noRecargo', 'No recargo rates yet. Add the ones your business uses.')}
    />
  )
}

function SubscriptionTab() {
  const query = useQuery({ queryKey: ['app', 'subscription'], queryFn: getAppSubscription })

  if (query.isPending) {
    return (
      <div className="space-y-3 p-5">
        <span className="block h-5 w-40 animate-pulse rounded-xl bg-slate-100" />
        <span className="block h-4 w-full animate-pulse rounded-xl bg-slate-100" />
        <span className="block h-4 w-2/3 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  const subscription = query.data?.subscription ?? null
  const support = query.data?.support
  const expired = !subscription || !subscription.is_usable
  const waDigits = support?.whatsapp?.replace(/\D+/g, '') ?? ''

  if (expired) {
    return (
      <div className="flex flex-col items-start gap-5 p-5 sm:flex-row">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 app-dark:bg-amber-500/15 app-dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            {t('expired.title', 'Your subscription has ended')}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            {t('expired.body', 'Your workspace is safe and your data is untouched. Renew to pick up where you left off.')}
          </p>
          {subscription ? (
            <p className="mt-3 font-mono text-xs text-slate-500">
              {t('expired.endedOn', 'Ended on')} {formatDate(subscription.ends_at)}
            </p>
          ) : null}
          <p className="mt-6 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {t('expired.contact', 'Contact us to renew')}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {waDigits ? (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink hover:bg-page"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {support?.whatsapp}
              </a>
            ) : null}
            {support?.email ? (
              <a
                href={`mailto:${support.email}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink hover:bg-page"
              >
                <Mail className="h-4 w-4 text-brand-600" />
                {support.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{subscription.plan_name}</h2>
          <p className="mt-1 font-mono text-sm text-slate-600">
            {formatCurrency(subscription.plan_price, subscription.plan_currency, 'en-US')} /{' '}
            {subscription.plan_interval}
          </p>
        </div>
        <Badge status={subscription.status.toUpperCase()} />
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {t('admin.renewsOn', 'Renews on')} {formatDate(subscription.ends_at)} · {subscription.days_left}{' '}
        {t('admin.daysLeft', 'days left')}
      </p>
      {subscription.plan_features.length > 0 ? (
        <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
          {subscription.plan_features.map((feature) => (
            <li key={feature} className="text-sm text-slate-600">
              · {feature}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Page() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<TabId>(() => parseTab(params.get('tab')))

  useEffect(() => {
    setTab(parseTab(params.get('tab')))
  }, [params])

  function selectTab(id: string) {
    const next = parseTab(id)
    setTab(next)
    setParams(next === 'company' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-ink">{t('nav.settings', 'Settings')}</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t('settings.subtitle', 'Company details, subscription, password and IVA rates.')}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs sm:flex">
        <nav
          aria-label={t('nav.settings', 'Settings')}
          className="grid grid-cols-2 gap-1 border-b border-line bg-page/80 p-2 sm:flex sm:w-56 sm:shrink-0 sm:flex-col sm:border-r sm:border-b-0 sm:p-3"
        >
          {TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={cn(
                  'inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold sm:justify-start sm:py-2.5',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-1',
                  active
                    ? 'bg-card text-brand-600 shadow-xs ring-1 ring-line/80 sm:bg-brand-50 sm:shadow-none sm:ring-0'
                    : 'text-ink-muted hover:bg-card/80 hover:text-ink sm:hover:bg-page',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="min-w-0 flex-1">
          {tab === 'company' ? <CompanyTab /> : null}
          {tab === 'subscription' ? <SubscriptionTab /> : null}
          {tab === 'password' ? <PasswordTab /> : null}
          {tab === 'iva' ? <IvaTab /> : null}
          {tab === 'recargo' ? <RecargoTab /> : null}
          {tab === 'whatsapp' ? <WhatsAppTab /> : null}
        </div>
      </div>
    </div>
  )
}

export default Page
