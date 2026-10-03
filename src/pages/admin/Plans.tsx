import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency, formatInterval } from '../../lib/format'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { createPlan, listPlans, togglePlan, updatePlan, type PlanInput } from '../../services/admin/plans'
import type { Plan, PlanInterval } from '../../types/module01'
import { PlanCard } from '../public/PricingCards'

type Draft = {
  name: string
  name_es: string
  description_es: string
  features_es: string
  description: string
  price: string
  currency: string
  interval: PlanInterval
  features: string
  max_users: string
  is_featured: boolean
  is_active: boolean
  sort_order: string
}

const BLANK: Draft = {
  name: '',
  name_es: '',
  description_es: '',
  features_es: '',
  description: '',
  price: '0',
  currency: 'USD',
  interval: 'month',
  features: '',
  max_users: '',
  is_featured: false,
  is_active: true,
  sort_order: '0',
}

function draftFrom(plan: Plan): Draft {
  return {
    name: plan.name,
    name_es: plan.name_es ?? '',
    description_es: plan.description_es ?? '',
    features_es: (plan.features_es ?? []).join('\n'),
    description: plan.description ?? '',
    price: String(plan.price),
    currency: plan.currency,
    interval: plan.interval,
    features: plan.features.join('\n'),
    max_users: plan.max_users ? String(plan.max_users) : '',
    is_featured: plan.is_featured,
    is_active: plan.is_active,
    sort_order: String(plan.sort_order),
  }
}

function toInput(draft: Draft): PlanInput {
  return {
    name: draft.name,
    name_es: draft.name_es.trim() || null,
    description_es: draft.description_es.trim() || null,
    features_es: draft.features_es
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    description: draft.description || undefined,
    price: Number(draft.price) || 0,
    currency: draft.currency.toUpperCase(),
    interval: draft.interval,
    features: draft.features
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    max_users: draft.max_users ? Number(draft.max_users) : null,
    is_featured: draft.is_featured,
    is_active: draft.is_active,
    sort_order: Number(draft.sort_order) || 0,
  }
}

/** A throwaway Plan shaped object so the editor can reuse the real public card. */
function previewPlan(draft: Draft): Plan {
  const input = toInput(draft)
  return {
    id: -1,
    slug: 'preview',
    max_invoices: null,
    ...input,
    description: input.description ?? null,
    max_users: input.max_users ?? null,
  }
}

function AdminPlans() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [editing, setEditing] = useState<Plan | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const query = useQuery({ queryKey: ['admin', 'plans'], queryFn: listPlans })

  function close() {
    setDraft(null)
    setEditing(null)
    setErrors({})
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const input = toInput(draft as Draft)
      return editing ? updatePlan(editing.id, input) : createPlan(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      void queryClient.invalidateQueries({ queryKey: ['public', 'plans'] })
      close()
    },
    onError: (error) => {
      const mapped = mapValidationErrors(error)
      setErrors(mapped)
      if (Object.keys(mapped).length === 0) push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => togglePlan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      void queryClient.invalidateQueries({ queryKey: ['public', 'plans'] })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('nav.plans', 'Plans')}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t('admin.plansSubtitle', 'What visitors see on the public pricing section.')}
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditing(null)
            setDraft(BLANK)
          }}
        >
          {t('admin.newPlan', 'New plan')}
        </Button>
      </div>

      {query.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (query.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title={t('common.empty', 'Nothing here yet')}
            description={t('plans.create_a_plan_so_visitors_have_something', 'Create a plan so visitors have something to apply for.')}
            primaryAction={<Button onClick={() => setDraft(BLANK)}>{t('admin.newPlan', 'New plan')}</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(query.data ?? []).map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{plan.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(plan.price, plan.currency)} / {formatInterval(plan.interval)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setEditing(plan)
                    setDraft(draftFrom(plan))
                  }}
                >
                  {t('common.edit', 'Edit')}
                </Button>
              </div>

              <ul className="mt-4 space-y-1.5">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="text-xs text-slate-600">
                    · {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">
                  {plan.is_featured ? t('admin.featured', 'Featured') : ''}
                </span>
                <Toggle
                  label={t('admin.activeLabel', 'Visible on the public site')}
                  checked={plan.is_active}
                  onChange={() => toggleMutation.mutate(plan.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={close}
        title={editing ? t('admin.editPlan', 'Edit plan') : t('admin.newPlan', 'New plan')}
        maxWidth="4xl"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label={t('clients.name', 'Name')}
                  required
                  value={draft.name}
                  error={errors.name}
                  onChange={(event) => set('name', event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label={t('sales.description', 'Description')}
                  rows={2}
                  value={draft.description}
                  error={errors.description}
                  onChange={(event) => set('description', event.target.value)}
                />
              </div>
              <Input
                label={t('sales.price', 'Price')}
                inputMode="decimal"
                required
                value={draft.price}
                error={errors.price}
                onChange={(event) => set('price', event.target.value)}
              />
              <Input
                label={t('settings.currency', 'Currency')}
                maxLength={3}
                value={draft.currency}
                error={errors.currency}
                onChange={(event) => set('currency', event.target.value.toUpperCase())}
              />
              <Select
                label={t('plans.interval', 'Interval')}
                value={draft.interval}
                error={errors.interval}
                onChange={(event) => set('interval', event.target.value as PlanInterval)}
              >
                <option value="month">{t('plans.month', 'month')}</option>
                <option value="year">{t('plans.year', 'year')}</option>
              </Select>
              <Input
                label={t('plans.max_users', 'Max users')}
                type="number"
                min={1}
                value={draft.max_users}
                error={errors.max_users}
                onChange={(event) => set('max_users', event.target.value)}
              />
              <div className="sm:col-span-2">
                <Textarea
                  label={t('admin.planFeatures', 'Features, one per line')}
                  rows={6}
                  value={draft.features}
                  onChange={(event) => set('features', event.target.value)}
                />
              </div>
              <div className="rounded-xl border border-line bg-page/60 p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-ink">{t('admin.planSpanish', 'Spanish version')}</p>
                <p className="mt-0.5 mb-3 text-xs text-ink-muted">
                  {t('admin.planSpanishHint', 'Shown on the Spanish site and in Spanish accounts. Leave a box empty to show the English text.')}
                </p>
                <div className="grid gap-4">
                  <Input
                    label={t('admin.planNameEs', 'Name in Spanish')}
                    value={draft.name_es}
                    error={errors.name_es}
                    onChange={(event) => set('name_es', event.target.value)}
                  />
                  <Input
                    label={t('admin.planDescriptionEs', 'Description in Spanish')}
                    value={draft.description_es}
                    error={errors.description_es}
                    onChange={(event) => set('description_es', event.target.value)}
                  />
                  <Textarea
                    label={t('admin.planFeaturesEs', 'Features in Spanish, one per line')}
                    rows={5}
                    value={draft.features_es}
                    onChange={(event) => set('features_es', event.target.value)}
                  />
                </div>
              </div>
              <Input
                label={t('paymentMethods.sort_order', 'Sort order')}
                type="number"
                min={0}
                value={draft.sort_order}
                onChange={(event) => set('sort_order', event.target.value)}
              />
              <div className="flex flex-col justify-end gap-3 pb-1">
                <Toggle
                  label={t('admin.featured', 'Featured')}
                  checked={draft.is_featured}
                  onChange={(value) => set('is_featured', value)}
                />
                {draft.is_featured ? (
                  <p className="-mt-1.5 text-[11px] text-ink-muted">
                    {t('admin.featuredOne', 'Only one plan can be featured. Saving moves the badge here from the other plan.')}
                  </p>
                ) : null}
                <Toggle
                  label={t('admin.activeLabel', 'Visible on the public site')}
                  checked={draft.is_active}
                  onChange={(value) => set('is_active', value)}
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.planPreview', 'Public card preview')}
              </p>
              <PlanCard plan={previewPlan(draft)} className="pointer-events-none" />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default AdminPlans
