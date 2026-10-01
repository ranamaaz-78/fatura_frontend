import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, UserRound, Users, X } from 'lucide-react'
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
import { AVATAR_TONES, TONE_AMBER, TONE_GREEN } from '../../lib/status'
import { getErrorMessage } from '../../services/api'
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  setCustomerActive,
  updateCustomer,
} from '../../services/sales'
import type { Customer } from '../../types/sales'

const clientsKey = ['app', 'customers', 'all']

const AVATARS = AVATAR_TONES

type Draft = {
  name: string
  company_name: string
  phone: string
  nif: string
  address: string
}

function taxId(customer: { nif: string | null; nie: string | null }): string {
  return customer.nif || customer.nie || ''
}

type StatusFilter = 'all' | 'active' | 'inactive'

const emptyDraft: Draft = { name: '', company_name: '', phone: '', nif: '', address: '' }

function fromCustomer(customer: Customer): Draft {
  return {
    name: customer.name,
    company_name: customer.company_name ?? '',
    phone: customer.phone ?? '',
    nif: taxId(customer),
    address: customer.address ?? '',
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return letters || '?'
}

function Customers() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(timer)
  }, [search])

  const query = useQuery({
    queryKey: [...clientsKey, debounced],
    queryFn: () => listCustomers(debounced),
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
    await queryClient.cancelQueries({ queryKey: ['app', 'customers'] })
    await queryClient.invalidateQueries({ queryKey: ['app', 'customers'] })
  }

  function startCreate() {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function startEdit(customer: Customer) {
    setEditing(customer)
    setDraft(fromCustomer(customer))
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
        address: draft.address.trim() || null,
      }
      return editing ? updateCustomer(editing.id, input) : createCustomer(input)
    },
    onSuccess: () => {
      setOpen(false)
      void refresh()
      push({
        tone: 'success',
        title: editing ? t('clients.updated', 'Client updated.') : t('clients.created', 'Client created.'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (customer: Customer) => deleteCustomer(customer.id),
    onSuccess: () => {
      setDeleting(null)
      void refresh()
      push({ tone: 'success', title: t('clients.deleted', 'Client deleted.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setCustomerActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      setTogglingId(id)
      await queryClient.cancelQueries({ queryKey: ['app', 'customers'] })
      const snapshots = queryClient.getQueriesData<Customer[]>({ queryKey: ['app', 'customers'] })
      queryClient.setQueriesData<Customer[]>({ queryKey: ['app', 'customers'] }, (current) =>
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
    { id: 'all', label: t('clients.filterAll', 'All'), count: counts.all },
    { id: 'active', label: t('clients.active', 'Active'), count: counts.active },
    { id: 'inactive', label: t('clients.inactive', 'Inactive'), count: counts.inactive },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
              {t('nav.customers', 'Clients')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {counts.all} {counts.all === 1 ? t('clients.countOne', 'client') : t('clients.count', 'clients')} · {counts.active}{' '}
              {t('clients.active', 'Active').toLowerCase()} · {counts.inactive} {t('clients.inactive', 'Inactive').toLowerCase()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on shadow-xs hover:bg-brand-500"
        >
          <Plus className="h-4 w-4" />
          {t('clients.new', 'New client')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label={t('clients.active', 'Active')}
          value={counts.active}
          hint={t('clients.activeHint', 'Can be picked on a sale')}
          tile={TONE_GREEN}
          icon={<UserRound className="h-5 w-5" />}
        />
        <Stat
          label={t('clients.inactive', 'Inactive')}
          value={counts.inactive}
          hint={t('clients.inactiveHint', 'Hidden from the sale search')}
          tile={TONE_AMBER}
          icon={<UserRound className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3">
          <span className="relative w-full max-w-[360px] flex-grow">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('clients.search', 'Search name, company, phone, N.I.F/N.I.E or code')}
              className="h-[38px] w-full rounded-xl border border-line bg-card pr-9 pl-8.5 text-[13px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
            {search ? (
              <Tooltip content={t('clients.clearSearch', 'Clear search')} align="end" className="absolute top-1/2 right-2 -translate-y-1/2">
                <button
                  type="button"
                  aria-label={t('clients.clearSearch', 'Clear search')}
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
                      ? 'bg-brand-50 text-brand-600'
                      : 'border border-line bg-card text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {chip.label}
                  <span className={cn('font-mono text-[11px]', on ? 'text-brand-500' : 'text-slate-400')}>
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
            icon={Users}
            title={debounced ? t('clients.noMatch', 'No clients match that search') : t('clients.emptyTitle', 'No clients yet')}
            description={
              debounced
                ? t('clients.noMatchBody', 'Try another name, phone, N.I.F/N.I.E or code.')
                : t('clients.emptyBody', 'Add one here, or save a client from a sale.')
            }
            primaryAction={
              debounced ? undefined : (
                <Button icon={<Plus className="h-4 w-4" />} onClick={startCreate}>
                  {t('clients.new', 'New client')}
                </Button>
              )
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('clients.filterEmpty', 'Nothing in this filter')}
            description={t('clients.filterEmptyBody', 'Switch back to All to see every client.')}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="flex items-center bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                <span className="min-w-0 flex-1">{t('clients.name', 'Name')}</span>
                <span className="w-36">{t('clients.phone', 'Telephone')}</span>
                <span className="w-40">{t('clients.taxId', 'N.I.F/N.I.E')}</span>
                <span className="w-56 pr-4">{t('clients.address', 'Address')}</span>
                <span className="w-36">{t('clients.status', 'Status')}</span>
                <span className="w-20 text-right">{t('products.actions', 'Actions')}</span>
              </div>
              {rows.map((customer) => (
                <div
                  key={customer.id}
                  className={cn(
                    'flex items-center border-t border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50/70',
                    !customer.is_active && 'bg-slate-50/80',
                  )}
                >
                  <Identity customer={customer} />
                  <span className="w-36 truncate font-mono text-xs text-slate-600">{customer.phone ?? '—'}</span>
                  <span className="w-40 truncate font-mono text-xs text-slate-600">{taxId(customer) || '—'}</span>
                  <span title={customer.address ?? undefined} className="w-56 truncate pr-4 text-xs text-slate-600">
                    {customer.address || '—'}
                  </span>
                  <span className="w-36">
                    <ActiveSwitch
                      customer={customer}
                      disabled={togglingId === customer.id}
                      onChange={(isActive) => toggle.mutate({ id: customer.id, isActive })}
                    />
                  </span>
                  <span className="flex w-20 justify-end gap-1">
                    <RowActions customer={customer} onEdit={startEdit} onDelete={setDeleting} />
                  </span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((customer) => (
                <div key={customer.id} className={cn('flex flex-col gap-3 p-4', !customer.is_active && 'bg-slate-50/80')}>
                  <div className="flex items-start gap-3">
                    <Identity customer={customer} />
                    <div className="flex shrink-0 gap-1">
                      <RowActions customer={customer} onEdit={startEdit} onDelete={setDeleting} />
                    </div>
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-500">
                    {[customer.phone, taxId(customer)].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {customer.address ? <p className="-mt-2 truncate text-[11px] text-slate-500">{customer.address}</p> : null}
                  <ActiveSwitch
                    customer={customer}
                    disabled={togglingId === customer.id}
                    onChange={(isActive) => toggle.mutate({ id: customer.id, isActive })}
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
        title={editing ? t('clients.edit', 'Edit client') : t('clients.new', 'New client')}
        subtitle={editing?.code ?? t('clients.codeHint', 'A code is assigned when you save.')}
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
          <Input compact label={t('clients.name', 'Name')} required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Input compact label={t('clients.company', 'Company')} value={draft.company_name} onChange={(event) => setDraft({ ...draft, company_name: event.target.value })} />
          <Input compact label={t('clients.phone', 'Telephone')} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          <Input compact label={t('clients.taxId', 'N.I.F/N.I.E')} value={draft.nif} onChange={(event) => setDraft({ ...draft, nif: event.target.value.toUpperCase() })} />
          <Input compact label={t('clients.address', 'Address')} maxLength={255} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
        loading={remove.isPending}
        title={t('clients.deleteTitle', 'Delete this client?')}
        description={t('clients.deleteBody', ':name will be removed. Documents already issued keep their copy.').replace(
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
    <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tile)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">{label}</p>
        <p className="font-mono text-lg font-bold text-slate-900">{value}</p>
        <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

function Identity({ customer }: { customer: Customer }) {
  const ink = AVATARS[customer.id % AVATARS.length]
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          customer.is_active ? ink : 'bg-slate-100 text-slate-400',
        )}
      >
        {initials(customer.name)}
      </span>
      <div className="min-w-0">
        <p className={cn('truncate text-[13px] font-semibold', customer.is_active ? 'text-slate-900' : 'text-slate-400')}>
          {customer.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate">
          <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-600">
            {customer.code}
          </span>
          {customer.company_name ? (
            <span className="truncate text-[11px] text-slate-500">{customer.company_name}</span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

function ActiveSwitch({
  customer,
  disabled,
  onChange,
}: {
  customer: Customer
  disabled: boolean
  onChange: (isActive: boolean) => void
}) {
  return (
    <Toggle
      checked={customer.is_active}
      disabled={disabled}
      onChange={onChange}
      label={customer.is_active ? t('clients.active', 'Active') : t('clients.inactive', 'Inactive')}
    />
  )
}

function RowActions({
  customer,
  onEdit,
  onDelete,
}: {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}) {
  const button = 'flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg text-slate-400'
  const editLabel = t('common.edit', 'Edit')
  const deleteLabel = t('common.delete', 'Delete')
  return (
    <>
      <Tooltip content={editLabel} align="end">
        <button type="button" aria-label={`${editLabel} ${customer.name}`} className={`${button} hover:bg-slate-100 hover:text-slate-600`} onClick={() => onEdit(customer)}>
          <Pencil className="h-4 w-4" />
        </button>
      </Tooltip>
      <Tooltip content={deleteLabel} align="end">
        <button type="button" aria-label={`${deleteLabel} ${customer.name}`} className={`${button} hover:bg-rose-50 hover:text-rose-600`} onClick={() => onDelete(customer)}>
          <Trash2 className="h-4 w-4" />
        </button>
      </Tooltip>
    </>
  )
}

export default Customers
