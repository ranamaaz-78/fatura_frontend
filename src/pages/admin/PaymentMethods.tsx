import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  createPaymentMethod,
  listPaymentMethods,
  togglePaymentMethod,
  updatePaymentMethod,
  type PaymentMethodInput,
} from '../../services/admin/paymentMethods'
import type { PaymentMethod } from '../../types/module01'

const BLANK: PaymentMethodInput = {
  name: '',
  description: '',
  instructions: '',
  is_active: true,
  sort_order: 0,
}

function AdminPaymentMethods() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [draft, setDraft] = useState<PaymentMethodInput | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const query = useQuery({ queryKey: ['admin', 'payment-methods'], queryFn: listPaymentMethods })

  function close() {
    setDraft(null)
    setEditing(null)
    setErrors({})
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updatePaymentMethod(editing.id, draft as PaymentMethodInput)
        : createPaymentMethod(draft as PaymentMethodInput),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })
      close()
    },
    onError: (error) => {
      const mapped = mapValidationErrors(error)
      setErrors(mapped)
      if (Object.keys(mapped).length === 0) push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => togglePaymentMethod(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] }),
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function set<K extends keyof PaymentMethodInput>(key: K, value: PaymentMethodInput[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const methods = query.data ?? []

  return (
    <>
      <PageHeader
        title={t('nav.paymentMethods', 'Payment methods')}
        subtitle={t('admin.paymentMethodsSubtitle', 'Offline methods you can record against a subscription.')}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setDraft({ ...BLANK })}>
            {t('admin.newPaymentMethod', 'New payment method')}
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        {query.isPending ? (
          <SkeletonTable />
        ) : methods.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t('common.empty', 'Nothing here yet')}
            description="Add the ways your customers can pay you."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {methods.map((method) => (
              <li key={method.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                  {method.description ? (
                    <p className="text-xs text-slate-500">{method.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4">
                  <Toggle checked={method.is_active} onChange={() => toggleMutation.mutate(method.id)} />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditing(method)
                      setDraft({
                        name: method.name,
                        description: method.description ?? '',
                        instructions: method.instructions ?? '',
                        is_active: method.is_active,
                        sort_order: method.sort_order,
                      })
                    }}
                  >
                    {t('common.edit', 'Edit')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={draft !== null}
        onClose={close}
        title={editing ? t('common.edit', 'Edit') : t('admin.newPaymentMethod', 'New payment method')}
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
          <div className="space-y-4">
            <Input
              label="Name"
              required
              value={draft.name}
              error={errors.name}
              onChange={(event) => set('name', event.target.value)}
            />
            <Input
              label="Description"
              value={draft.description ?? ''}
              error={errors.description}
              onChange={(event) => set('description', event.target.value)}
            />
            <Textarea
              label={t('admin.instructions', 'Instructions')}
              rows={4}
              value={draft.instructions ?? ''}
              error={errors.instructions}
              onChange={(event) => set('instructions', event.target.value)}
            />
            <div className="flex items-center justify-between">
              <Input
                label="Sort order"
                type="number"
                min={0}
                value={String(draft.sort_order)}
                onChange={(event) => set('sort_order', Number(event.target.value) || 0)}
              />
            </div>
            <Toggle
              label={t('admin.activeLabel', 'Visible on the public site')}
              checked={draft.is_active}
              onChange={(value) => set('is_active', value)}
            />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

export default AdminPaymentMethods
