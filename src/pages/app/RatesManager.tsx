import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Tooltip } from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import type { TaxRate } from '../../types/catalog'

export type RatesApi = {
  list: () => Promise<TaxRate[]>
  create: (input: { name: string; rate: number }) => Promise<TaxRate>
  update: (id: number, input: { name: string; rate: number }) => Promise<TaxRate>
  remove: (id: number) => Promise<unknown>
}

type RatesManagerProps = {
  queryKey: readonly unknown[]
  api: RatesApi
  hint: string
  namePlaceholder: string
  ratePlaceholder: string
  added: string
  updated: string
  removed: string
  deleteTitle: string
  deleteBody: string
  emptyText?: string
}

const fieldClass =
  'mt-1 h-[38px] w-full rounded-xl border border-line bg-card px-3 text-[13px] font-medium text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'

const isNumber = (value: string) => value.trim() !== '' && !Number.isNaN(Number(value))

/** A named percentage list: add, edit and delete. Used for IVA and for recargo de equivalencia. */
export function RatesManager({
  queryKey,
  api,
  hint,
  namePlaceholder,
  ratePlaceholder,
  added,
  updated,
  removed,
  deleteTitle,
  deleteBody,
  emptyText,
}: RatesManagerProps) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const rates = useQuery({ queryKey, queryFn: api.list })
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [removing, setRemoving] = useState<TaxRate | null>(null)
  const [editing, setEditing] = useState<TaxRate | null>(null)
  const [editName, setEditName] = useState('')
  const [editRate, setEditRate] = useState('')

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey })
  }

  const add = useMutation({
    mutationFn: () => api.create({ name: name.trim(), rate: Number(rate) }),
    onSuccess: () => {
      setName('')
      setRate('')
      void refresh()
      push({ tone: 'success', title: added })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const save = useMutation({
    mutationFn: (item: TaxRate) => api.update(item.id, { name: editName.trim(), rate: Number(editRate) }),
    onSuccess: () => {
      setEditing(null)
      void refresh()
      push({ tone: 'success', title: updated })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (item: TaxRate) => api.remove(item.id),
    onSuccess: () => {
      setRemoving(null)
      void refresh()
      push({ tone: 'success', title: removed })
    },
    onError: (error) => {
      setRemoving(null)
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  function startEdit(item: TaxRate) {
    setEditing(item)
    setEditName(item.name)
    setEditRate(String(item.rate))
  }

  const canAdd = name.trim() !== '' && isNumber(rate)
  const canSave = editName.trim() !== '' && isNumber(editRate)
  const items = rates.data ?? []

  return (
    <div>
      <p className="border-b border-slate-100 px-5 py-3 text-xs text-slate-500">{hint}</p>
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
          {t('settings.rateName', 'Name')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={namePlaceholder}
            className={fieldClass}
          />
        </label>
        <label className="w-full text-[11px] font-semibold text-slate-600 sm:w-28">
          {t('settings.ratePercent', 'Percent')}
          <input
            value={rate}
            inputMode="decimal"
            onChange={(event) => setRate(event.target.value)}
            placeholder={ratePlaceholder}
            className={`${fieldClass} font-mono`}
          />
        </label>
        <button
          type="button"
          disabled={!canAdd || add.isPending}
          onClick={() => add.mutate()}
          className="inline-flex h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t('settings.addRate', 'Add')}
        </button>
      </div>

      {rates.isPending ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_item, index) => (
            <span key={index} className="block h-10 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-500">
          {emptyText ?? t('settings.noRates', 'Nothing here yet. Add one above.')}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) =>
            editing?.id === item.id ? (
              <li key={item.id} className="flex flex-col gap-2 bg-brand-50/40 px-5 py-3 sm:flex-row sm:items-center">
                <input
                  value={editRate}
                  inputMode="decimal"
                  aria-label={t('settings.ratePercent', 'Percent')}
                  onChange={(event) => setEditRate(event.target.value)}
                  className="h-[34px] w-full rounded-lg border border-line bg-card px-3 font-mono text-[13px] font-medium text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 sm:w-24"
                />
                <input
                  value={editName}
                  aria-label={t('settings.rateName', 'Name')}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-[34px] min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-[13px] font-medium text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />
                <span className="flex gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    aria-label={t('common.save', 'Save')}
                    disabled={!canSave || save.isPending}
                    onClick={() => save.mutate(item)}
                    className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg bg-brand-600 text-brand-on hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.cancel', 'Cancel')}
                    onClick={() => setEditing(null)}
                    className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ) : (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-16 font-mono text-sm font-bold text-brand-600">{item.rate}%</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800">{item.name}</span>
                <Tooltip content={t('common.edit', 'Edit')} align="end">
                  <button
                    type="button"
                    aria-label={`${t('common.edit', 'Edit')} ${item.rate}%`}
                    onClick={() => startEdit(item)}
                    className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </Tooltip>
                <Tooltip content={t('common.delete', 'Delete')} align="end">
                  <button
                    type="button"
                    aria-label={`${t('common.delete', 'Delete')} ${item.rate}%`}
                    onClick={() => setRemoving(item)}
                    className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Tooltip>
              </li>
            ),
          )}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
        loading={remove.isPending}
        title={deleteTitle}
        description={deleteBody.replace(':name', removing ? `${removing.rate}% (${removing.name})` : '')}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}
