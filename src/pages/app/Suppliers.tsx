import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, Truck, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { Toggle } from '../../components/ui/Toggle'
import { Tooltip } from '../../components/ui/Tooltip'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../services/api'
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  setSupplierActive,
  updateSupplier,
} from '../../services/suppliers'
import type { Supplier } from '../../types/suppliers'

const suppliersKey = ['app', 'suppliers', 'all']

const AVATARS = [
  'bg-[#eff4ff] text-[#004ac6]',
  'bg-[#ecfdf5] text-[#047857]',
  'bg-[#fffbeb] text-[#b45309]',
  'bg-[#fdf2f8] text-[#be123c]',
  'bg-[#f5f3ff] text-[#6d28d9]',
]

type Draft = {
  name: string
  company_name: string
  phone: string
  nif: string
}

function taxId(supplier: { nif: string | null; nie: string | null }): string {
  return supplier.nif || supplier.nie || ''
}

type StatusFilter = 'all' | 'active' | 'inactive'

const emptyDraft: Draft = { name: '', company_name: '', phone: '', nif: '' }

function fromSupplier(supplier: Supplier): Draft {
  return {
    name: supplier.name,
    company_name: supplier.company_name ?? '',
    phone: supplier.phone ?? '',
    nif: taxId(supplier),
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '?'
}

function Suppliers() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const query = useQuery({
    queryKey: [...suppliersKey, debounced],
    queryFn: () => listSuppliers(debounced),
  })

  const all = query.data ?? []
  const counts = {
    all: all.length,
    active: all.filter((row) => row.is_active).length,
    inactive: all.filter((row) => !row.is_active).length,
  }
  const rows = all.filter((row) => {
    if (status === 'active') return row.is_active
    if (status === 'inactive') return !row.is_active
    return true
  })

  async function refresh() {
    await queryClient.cancelQueries({ queryKey: ['app', 'suppliers'] })
    await queryClient.invalidateQueries({ queryKey: ['app', 'suppliers'] })
  }

  function startCreate() {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function startEdit(supplier: Supplier) {
    setEditing(supplier)
    setDraft(fromSupplier(supplier))
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: () => {
      const input = {
        name: draft.name.trim(),
        company_name: draft.company_name.trim() || null,
        phone: draft.phone.trim() || null,
        nif: draft.nif.trim() || null,
        nie: null,
      }
      return editing ? updateSupplier(editing.id, input) : createSupplier(input)
    },
    onSuccess: () => {
      setOpen(false)
      void refresh()
      push({
        tone: 'success',
        title: editing ? t('suppliers.updated', 'Supplier updated.') : t('suppliers.created', 'Supplier created.'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (supplier: Supplier) => deleteSupplier(supplier.id),
    onSuccess: () => {
      setDeleting(null)
      void refresh()
      push({ tone: 'success', title: t('suppliers.deleted', 'Supplier deleted.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setSupplierActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      setTogglingId(id)
      await queryClient.cancelQueries({ queryKey: ['app', 'suppliers'] })
      const snapshots = queryClient.getQueriesData<Supplier[]>({ queryKey: ['app', 'suppliers'] })
      queryClient.setQueriesData<Supplier[]>({ queryKey: ['app', 'suppliers'] }, (current) =>
        current?.map((row) => (row.id === id ? { ...row, is_active: isActive } : row)),
      )
      return { snapshots }
    },
    onError: (error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
    onSettled: () => setTogglingId(null),
  })

  const chips: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t('suppliers.filterAll', 'All'), count: counts.all },
    { id: 'active', label: t('suppliers.active', 'Active'), count: counts.active },
    { id: 'inactive', label: t('suppliers.inactive', 'Inactive'), count: counts.inactive },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff4ff] text-[#004ac6]">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
              {t('nav.suppliers', 'Suppliers')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {counts.all} {counts.all === 1 ? t('suppliers.countOne', 'supplier') : t('suppliers.count', 'suppliers')} · {counts.active}{' '}
              {t('suppliers.active', 'Active').toLowerCase()} · {counts.inactive}{' '}
              {t('suppliers.inactive', 'Inactive').toLowerCase()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#004ac6] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#2563eb]"
        >
          <Plus className="h-4 w-4" />
          {t('suppliers.new', 'New supplier')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label={t('suppliers.active', 'Active')}
          value={counts.active}
          hint={t('suppliers.activeHint', 'Can be picked on a product')}
          tile="bg-[#ecfdf5] text-[#047857]"
          icon={<Truck className="h-5 w-5" />}
        />
        <Stat
          label={t('suppliers.inactive', 'Inactive')}
          value={counts.inactive}
          hint={t('suppliers.inactiveHint', 'Hidden from the product list')}
          tile="bg-[#fffbeb] text-[#b45309]"
          icon={<Truck className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3">
          <span className="relative w-full max-w-[360px] flex-grow">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('suppliers.search', 'Search name, company, phone, N.I.F/N.I.E or code')}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white pr-9 pl-8.5 text-[13px] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
            {search ? (
              <Tooltip content={t('suppliers.clearSearch', 'Clear search')} align="end" className="absolute top-1/2 right-2 -translate-y-1/2">
                <button
                  type="button"
                  aria-label={t('suppliers.clearSearch', 'Clear search')}
                  onClick={() => setSearch('')}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            ) : null}
          </span>
          <div className="flex flex-wrap gap-1.5 md:ml-auto">
            {chips.map((chip) => {
              const on = status === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStatus(chip.id)}
                  className={cn(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors',
                    on
                      ? 'bg-[#eff4ff] text-[#004ac6]'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {chip.label}
                  <span className={cn('font-mono text-[11px]', on ? 'text-[#2563eb]' : 'text-slate-400')}>
                    {chip.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {query.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_item, index) => (
              <span key={index} className="block h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : all.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={debounced ? t('suppliers.noMatch', 'No suppliers match that search') : t('suppliers.emptyTitle', 'No suppliers yet')}
            description={
              debounced
                ? t('suppliers.noMatchBody', 'Try another name, phone, N.I.F/N.I.E or code.')
                : t('suppliers.emptyBody', 'Add a supplier, then attach it when you save a product.')
            }
            primaryAction={
              debounced ? undefined : (
                <Button icon={<Plus className="h-4 w-4" />} onClick={startCreate}>
                  {t('suppliers.new', 'New supplier')}
                </Button>
              )
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={t('suppliers.filterEmpty', 'Nothing in this filter')}
            description={t('suppliers.filterEmptyBody', 'Switch back to All to see every supplier.')}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="flex items-center bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                <span className="min-w-0 flex-1">{t('suppliers.name', 'Name')}</span>
                <span className="w-36">{t('suppliers.phone', 'Telephone')}</span>
                <span className="w-40">{t('suppliers.taxId', 'N.I.F/N.I.E')}</span>
                <span className="w-36">{t('suppliers.status', 'Status')}</span>
                <span className="w-20 text-right">{t('products.actions', 'Actions')}</span>
              </div>
              {rows.map((supplier) => (
                <div
                  key={supplier.id}
                  className={cn(
                    'flex items-center border-t border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70',
                    !supplier.is_active && 'bg-slate-50/80',
                  )}
                >
                  <Identity supplier={supplier} />
                  <span className="w-36 truncate font-mono text-xs text-slate-600">{supplier.phone ?? '—'}</span>
                  <span className="w-40 truncate font-mono text-xs text-slate-600">{taxId(supplier) || '—'}</span>
                  <span className="w-36">
                    <ActiveSwitch
                      supplier={supplier}
                      disabled={togglingId === supplier.id}
                      onChange={(isActive) => toggle.mutate({ id: supplier.id, isActive })}
                    />
                  </span>
                  <span className="flex w-20 justify-end gap-1">
                    <RowActions supplier={supplier} onEdit={startEdit} onDelete={setDeleting} />
                  </span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((supplier) => (
                <div key={supplier.id} className={cn('flex flex-col gap-3 p-4', !supplier.is_active && 'bg-slate-50/80')}>
                  <div className="flex items-start gap-3">
                    <Identity supplier={supplier} />
                    <div className="flex shrink-0 gap-1">
                      <RowActions supplier={supplier} onEdit={startEdit} onDelete={setDeleting} />
                    </div>
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-500">
                    {[supplier.phone, taxId(supplier)].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <ActiveSwitch
                    supplier={supplier}
                    disabled={togglingId === supplier.id}
                    onChange={(isActive) => toggle.mutate({ id: supplier.id, isActive })}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('suppliers.edit', 'Edit supplier') : t('suppliers.new', 'New supplier')}
        subtitle={editing?.code ?? t('suppliers.codeHint', 'A code is assigned when you save.')}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()} disabled={draft.name.trim() === ''}>
              {save.isPending ? t('common.saving', 'Saving') : t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input compact label={t('suppliers.name', 'Name')} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Input compact label={t('suppliers.company', 'Company')} value={draft.company_name} onChange={(event) => setDraft({ ...draft, company_name: event.target.value })} />
          <Input compact label={t('suppliers.phone', 'Telephone')} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          <Input compact label={t('suppliers.taxId', 'N.I.F/N.I.E')} value={draft.nif} onChange={(event) => setDraft({ ...draft, nif: event.target.value.toUpperCase() })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
        loading={remove.isPending}
        title={t('suppliers.deleteTitle', 'Delete this supplier?')}
        description={t('suppliers.deleteBody', ':name will be removed. Products keep their other details.').replace(
          ':name',
          deleting?.name ?? '',
        )}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tile,
  icon,
}: {
  label: string
  value: number
  hint: string
  tile: string
  icon: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tile)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">{label}</p>
        <p className="font-mono text-lg font-bold text-slate-900">{value}</p>
        <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

function Identity({ supplier }: { supplier: Supplier }) {
  const ink = AVATARS[supplier.id % AVATARS.length]
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          supplier.is_active ? ink : 'bg-slate-100 text-slate-400',
        )}
      >
        {initials(supplier.name)}
      </span>
      <div className="min-w-0">
        <p className={cn('truncate text-[13px] font-semibold', supplier.is_active ? 'text-slate-900' : 'text-slate-400')}>
          {supplier.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate">
          <span className="rounded-md bg-[#eff4ff] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#004ac6]">
            {supplier.code}
          </span>
          {supplier.company_name ? (
            <span className="truncate text-[11px] text-slate-500">{supplier.company_name}</span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

function ActiveSwitch({
  supplier,
  disabled,
  onChange,
}: {
  supplier: Supplier
  disabled: boolean
  onChange: (isActive: boolean) => void
}) {
  return (
    <Toggle
      checked={supplier.is_active}
      disabled={disabled}
      onChange={onChange}
      label={supplier.is_active ? t('suppliers.active', 'Active') : t('suppliers.inactive', 'Inactive')}
    />
  )
}

function RowActions({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier
  onEdit: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
}) {
  const button = 'flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-400'
  const editLabel = t('common.edit', 'Edit')
  const deleteLabel = t('common.delete', 'Delete')
  return (
    <>
      <Tooltip content={editLabel} align="end">
        <button type="button" aria-label={`${editLabel} ${supplier.name}`} className={`${button} hover:bg-slate-100 hover:text-slate-600`} onClick={() => onEdit(supplier)}>
          <Pencil className="h-4 w-4" />
        </button>
      </Tooltip>
      <Tooltip content={deleteLabel} align="end">
        <button type="button" aria-label={`${deleteLabel} ${supplier.name}`} className={`${button} hover:bg-rose-50 hover:text-rose-600`} onClick={() => onDelete(supplier)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </Tooltip>
    </>
  )
}

export default Suppliers
