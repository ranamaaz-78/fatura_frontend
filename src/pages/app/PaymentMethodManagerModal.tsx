import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CreditCard, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { Toggle } from '../../components/ui/Toggle'
import { t } from '../../i18n'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  setPaymentMethodActive,
  updatePaymentMethod,
} from '../../services/paymentMethods'
import type { CompanyPaymentMethod } from '../../types/sales'

export const paymentMethodsKey = ['app', 'payment-methods'] as const

export function PaymentMethodManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const query = useQuery({
    queryKey: paymentMethodsKey,
    queryFn: () => listPaymentMethods(),
    enabled: open,
  })

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: paymentMethodsKey })
    void queryClient.invalidateQueries({ queryKey: [...paymentMethodsKey, 'active'] })
  }

  function reportError(caught: unknown) {
    const mapped = mapValidationErrors(caught)
    setError(mapped.name ?? getErrorMessage(caught))
  }

  const createMutation = useMutation({
    mutationFn: () => createPaymentMethod(newName.trim()),
    onSuccess: () => {
      setNewName('')
      setError('')
      refresh()
    },
    onError: reportError,
  })

  const renameMutation = useMutation({
    mutationFn: (method: CompanyPaymentMethod) => updatePaymentMethod(method.id, editingName.trim()),
    onSuccess: () => {
      setEditingId(null)
      setError('')
      refresh()
    },
    onError: reportError,
  })

  const deleteMutation = useMutation({
    mutationFn: (method: CompanyPaymentMethod) => deletePaymentMethod(method.id),
    onSuccess: () => {
      setError('')
      refresh()
      push({ tone: 'success', title: t('payments.deleted', 'Payment method deleted.') })
    },
    onError: (caught) => push({ tone: 'danger', title: getErrorMessage(caught) }),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setPaymentMethodActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      setTogglingId(id)
      await queryClient.cancelQueries({ queryKey: paymentMethodsKey })
      const snapshot = queryClient.getQueryData<CompanyPaymentMethod[]>(paymentMethodsKey)
      queryClient.setQueryData<CompanyPaymentMethod[]>(paymentMethodsKey, (current) =>
        current?.map((row) => (row.id === id ? { ...row, is_active: isActive } : row)),
      )
      return { snapshot }
    },
    onError: (caught, _vars, context) => {
      if (context?.snapshot) queryClient.setQueryData(paymentMethodsKey, context.snapshot)
      push({ tone: 'danger', title: getErrorMessage(caught) })
    },
    onSettled: () => {
      setTogglingId(null)
      refresh()
    },
  })

  const methods = query.data ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payments.manageMethods', 'Manage methods')}
      subtitle={t('payments.methodsSubtitle', 'These names appear when you record a payment on an invoice or delivery note.')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.done', 'Done')}
        </Button>
      }
    >
      <div className="space-y-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (newName.trim() !== '') createMutation.mutate()
          }}
        >
          <Input
            label={t('payments.method', 'Method')}
            placeholder={t('payments.methodPlaceholder', 'Cash, Card, Bank transfer…')}
            value={newName}
            error={editingId === null ? error : ''}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            type="submit"
            icon={<Plus className="h-4 w-4" />}
            loading={createMutation.isPending}
            disabled={newName.trim() === ''}
            className="h-[38px] shrink-0"
          >
            {t('payments.addMethod', 'Add')}
          </Button>
        </form>

        {query.isPending ? (
          <SkeletonTable />
        ) : methods.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('payments.emptyTitle', 'No payment methods yet')}
            description={t('payments.emptyBody', 'Add Cash, Card or Bank transfer so you can mark invoices paid.')}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {methods.map((method) => {
              const used = (method.documents_count ?? 0) + (method.settlements_count ?? 0)
              return (
                <li key={method.id} className="flex items-center gap-2 px-3 py-2">
                  {editingId === method.id ? (
                    <>
                      <Input
                        value={editingName}
                        error={error}
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                      />
                      <IconButton
                        label={t('common.save', 'Save')}
                        tooltipAlign="end"
                        onClick={() => renameMutation.mutate(method)}
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                      </IconButton>
                      <IconButton
                        label={t('common.cancel', 'Cancel')}
                        tooltipAlign="end"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{method.name}</span>
                      <span className="hidden text-[11px] text-slate-400 sm:inline">
                        {used} {t('products.inUse', 'in use')}
                      </span>
                      <Toggle
                        checked={method.is_active}
                        disabled={togglingId === method.id}
                        onChange={(isActive) => toggle.mutate({ id: method.id, isActive })}
                        label={method.is_active ? t('payments.active', 'Active') : t('payments.inactive', 'Inactive')}
                      />
                      <IconButton
                        label={t('common.edit', 'Edit')}
                        tooltipAlign="end"
                        onClick={() => {
                          setEditingId(method.id)
                          setEditingName(method.name)
                          setError('')
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={t('common.delete', 'Delete')}
                        tooltipAlign="end"
                        onClick={() => deleteMutation.mutate(method)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </IconButton>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
