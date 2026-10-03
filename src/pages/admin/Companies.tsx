import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  CalendarX2,
  CheckCircle2,
  Eye,
  Layers,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { PageHeader } from '../../components/ui/PageHeader'
import { RowMenu, type RowMenuItem } from '../../components/ui/RowMenu'
import { useToast } from '../../components/ui/Toast'
import { t, tp } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { daysText, STATE_LABEL, STATE_STYLE, subscriptionInfo } from '../../lib/subscription'
import { getErrorMessage } from '../../services/api'
import { cancelSubscription, listCompanies, resendAccess, setCompanyStatus, whatsappFromError } from '../../services/admin/companies'
import type { Company, CompanyCounts, CompanyStatus, SubscriptionState } from '../../types/module01'
import { RenewSubscriptionModal } from './RenewSubscriptionModal'
import { localCountry } from '../../lib/countries'

type TabId = 'all' | SubscriptionState | 'suspended'

const TILES: { id: TabId; label: string; icon: LucideIcon; tone: string }[] = [
  { id: 'all', label: t('companies.all_companies', 'All companies'), icon: Layers, tone: 'bg-slate-100 text-slate-600 app-dark:bg-white/10 app-dark:text-slate-300' },
  { id: 'active', label: t('clients.active', 'Active'), icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600 app-dark:bg-emerald-500/15 app-dark:text-emerald-300' },
  { id: 'expiring', label: t('companies.expiring_soon', 'Expiring soon'), icon: Timer, tone: 'bg-amber-50 text-amber-600 app-dark:bg-amber-500/15 app-dark:text-amber-300' },
  { id: 'expired', label: t('admin.expired', 'Expired'), icon: CalendarX2, tone: 'bg-rose-50 text-rose-600 app-dark:bg-rose-500/15 app-dark:text-rose-300' },
  { id: 'none', label: t('companies.no_plan', 'No plan'), icon: AlertTriangle, tone: 'bg-blue-50 text-blue-600 app-dark:bg-blue-500/15 app-dark:text-blue-300' },
  { id: 'suspended', label: t('status.SUSPENDED', 'Suspended'), icon: PauseCircle, tone: 'bg-slate-100 text-slate-600 app-dark:bg-white/10 app-dark:text-slate-300' },
]

const COUNT_KEY: Record<TabId, keyof CompanyCounts> = {
  all: 'all',
  active: 'active',
  expiring: 'expiring',
  expired: 'expired',
  none: 'none',
  suspended: 'suspended',
}

/** Where the term stands, as a coloured bar with the dates underneath. */
function TermCell({ company }: { company: Company }) {
  const info = subscriptionInfo(company)
  const style = STATE_STYLE[info.state]

  if (!info.subscription) {
    return <span className="text-xs text-ink-muted">{t('admin.noSubscription', 'No subscription yet.')}</span>
  }

  return (
    <div className="w-[200px]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink">{info.subscription.plan_name}</span>
        {info.state === 'active' ? null : (
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', style.badge)}>
            {STATE_LABEL[info.state]}
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${Math.max(info.percent, 4)}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink">{daysText(info)}</span>
        {' · '}
        {info.state === 'expired'
          ? t('admin.ended_on', 'ended {date}', { date: formatDate(info.subscription.ends_at) })
          : t('admin.ends_on', 'ends {date}', { date: formatDate(info.subscription.ends_at) })}
      </p>
    </div>
  )
}

function reminderLink(company: Company): string | null {
  const number = (company.whatsapp ?? company.owner?.phone ?? '').replace(/\D/g, '')
  if (!number) return null
  const info = subscriptionInfo(company)
  const when =
    info.state === 'expired'
      ? t('admin.reminder_expired', 'has expired')
      : info.state === 'none'
        ? t('admin.reminder_inactive', 'is not active yet')
        : t('admin.reminder_ends', 'ends on {date}', { date: formatDate(info.subscription?.ends_at ?? new Date()) })
  const text = t(
    'admin.reminder_message',
    'Hello {owner}, your YK Digital Solutions subscription for {company} {when}. Reply here and we will renew it for you.',
    { owner: company.owner?.name ?? '', company: company.name, when },
  )
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function AdminCompanies() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [tab, setTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [renewing, setRenewing] = useState<Company | null>(null)
  const [suspending, setSuspending] = useState<Company | null>(null)
  const [cancelling, setCancelling] = useState<Company | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'companies', tab, search, page],
    queryFn: () =>
      listCompanies({
        status: tab === 'suspended' ? 'suspended' : undefined,
        subscription: tab === 'all' || tab === 'suspended' ? undefined : tab,
        search,
        page,
      }),
  })

  const rows = query.data?.items ?? []
  const meta = query.data?.meta
  const counts = query.data?.counts

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  const statusMutation = useMutation({
    mutationFn: (input: { id: number; status: CompanyStatus }) => setCompanyStatus(input.id, input.status),
    onSuccess: (_data, input) => {
      refresh()
      setSuspending(null)
      push({
        tone: 'success',
        title: input.status === 'suspended' ? t('admin.companySuspended', 'Company suspended') : t('admin.companyReactivated', 'Company reactivated'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: number) => cancelSubscription(subscriptionId),
    onSuccess: () => {
      refresh()
      setCancelling(null)
      push({ tone: 'success', title: t('admin.subscriptionCancelled', 'Subscription cancelled') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const resendMutation = useMutation({
    mutationFn: (company: Company) => resendAccess(company.id),
    onSuccess: (data) =>
      push({
        tone: 'success',
        title: t('admin.accessSent', 'A fresh set-password link was emailed'),
        actionLabel: data.whatsapp_url ? t('admin.openWhatsapp', 'Send the link on WhatsApp') : undefined,
        onAction: data.whatsapp_url ? () => window.open(data.whatsapp_url as string, '_blank', 'noreferrer') : undefined,
      }),
    onError: (error) => {
      const whatsapp = whatsappFromError(error)
      push({
        tone: 'danger',
        title: getErrorMessage(error),
        actionLabel: whatsapp ? t('admin.openWhatsapp', 'Send the link on WhatsApp') : undefined,
        onAction: whatsapp ? () => window.open(whatsapp, '_blank', 'noreferrer') : undefined,
      })
    },
  })

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: t('admin.company', 'Company'),
      cell: (row) => (
        <Link to={`/admin/companies/${row.id}`} className="flex max-w-[210px] min-w-0 items-center gap-3">
          <Avatar name={row.name} size="lg" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink hover:text-brand-600">{row.name}</span>
            <span className="block truncate text-xs text-ink-muted">
              {[row.city, localCountry(row.country)].filter(Boolean).join(', ') || row.email}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: 'owner',
      header: t('admin.owner', 'Owner'),
      cell: (row) => (
        <div className="max-w-[190px] min-w-0">
          <p className="truncate text-sm text-ink">{row.owner?.name ?? '—'}</p>
          <p className="truncate text-xs text-ink-muted">{row.owner?.email ?? ''}</p>
          {row.owner && !row.owner.has_password ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
              <Send className="h-3 w-3" /> {t('companies.invite_pending', 'Invite pending')}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'term', header: t('admin.subscription', 'Subscription'), cell: (row) => <TermCell company={row} /> },
    {
      key: 'status',
      header: t('common.status', 'Status'),
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Badge status={row.status.toUpperCase()} />
          {row.users_count !== undefined ? (
            <span className="text-[11px] text-ink-muted">
              {tp('admin.users_count', '{count} user|{count} users', row.users_count)}
            </span>
          ) : null}
        </div>
      ),
    },
  ]

  function actionsFor(row: Company): ReactNode {
    const info = subscriptionInfo(row)
    const needsRenewal = info.state !== 'active'
    const reminder = reminderLink(row)
    const suspended = row.status === 'suspended'

    const menu: RowMenuItem[] = [
      { label: t('admin.viewCompany', 'View company'), icon: Eye, onSelect: () => navigate(`/admin/companies/${row.id}`) },
      { label: t('admin.resendAccess', 'Resend access link'), icon: Send, onSelect: () => resendMutation.mutate(row) },
      suspended
        ? { label: t('admin.reactivate', 'Reactivate'), icon: PlayCircle, onSelect: () => statusMutation.mutate({ id: row.id, status: 'active' }) }
        : { label: t('admin.suspend', 'Suspend'), icon: PauseCircle, destructive: true, onSelect: () => setSuspending(row) },
    ]
    if (row.active_subscription) {
      menu.push({
        label: t('admin.cancelSubscription', 'Cancel subscription'),
        icon: XCircle,
        destructive: true,
        onSelect: () => setCancelling(row),
      })
    }

    return (
      <>
        <Button
          size="sm"
          variant={needsRenewal ? 'primary' : 'secondary'}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={() => setRenewing(row)}
          className="mr-1 whitespace-nowrap"
        >
          {info.state === 'none' ? t('admin.startPlan', 'Start plan') : t('admin.renewShort', 'Renew')}
        </Button>
        {reminder ? (
          <IconButton
            label={t('admin.remindWhatsapp', 'Message on WhatsApp')}
            onClick={() => window.open(reminder, '_blank', 'noreferrer')}
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
          </IconButton>
        ) : null}
        <RowMenu items={menu} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('nav.companies', 'Companies')}
        subtitle={t('admin.companiesSubtitle', 'Live accounts and where each subscription stands. Renew, message or pause a company right from the list.')}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TILES.map((tile) => {
          const on = tab === tile.id
          const count = counts?.[COUNT_KEY[tile.id]] ?? 0
          const Icon = tile.icon
          const alert = (tile.id === 'expiring' || tile.id === 'expired') && count > 0
          return (
            <button
              key={tile.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setTab(tile.id)
                setPage(1)
              }}
              className={cn(
                'relative flex items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-all hover:shadow-md focus:ring-2 focus:ring-brand-500/30 focus:outline-none',
                on ? 'border-brand-500 ring-1 ring-brand-500/40' : 'border-line/80',
              )}
            >
              <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tile.tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl leading-none font-bold tracking-tight text-ink">{count}</span>
                <span className="mt-1 block truncate text-xs font-medium text-ink-muted">{tile.label}</span>
              </span>
              {alert ? (
                <span
                  className={cn(
                    'absolute top-3 right-3 h-2 w-2 rounded-full',
                    tile.id === 'expired' ? 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.2)]' : 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.2)]',
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        loading={query.isPending}
        search={search}
        onSearch={(value) => {
          setSearch(value)
          setPage(1)
        }}
        page={meta?.current_page}
        pageCount={meta?.last_page}
        onPageChange={setPage}
        summary={meta ? t('common.total_count', '{count} total', { count: meta.total }) : undefined}
        rowActionsVisible
        empty={
          <EmptyState
            icon={Building2}
            title={t('common.noResults', 'No results')}
            description={
              tab === 'all' && !search
                ? t('admin.companiesEmpty', 'Companies appear here once you convert an application.')
                : t('admin.companiesNoMatch', 'No companies match this filter.')
            }
          />
        }
        rowActions={actionsFor}
      />

      <RenewSubscriptionModal company={renewing} onClose={() => setRenewing(null)} />

      <ConfirmDialog
        open={suspending !== null}
        onClose={() => setSuspending(null)}
        onConfirm={() => suspending && statusMutation.mutate({ id: suspending.id, status: 'suspended' })}
        loading={statusMutation.isPending}
        tone="warning"
        title={t('admin.suspendTitle', 'Suspend this company?')}
        description={t('companyDetail.suspend_body', '{name} will not be able to sign in until you reactivate it. Nothing is deleted.', { name: suspending?.name ?? '' })}
        confirmLabel={t('admin.suspend', 'Suspend')}
      />

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling?.active_subscription && cancelMutation.mutate(cancelling.active_subscription.id)}
        loading={cancelMutation.isPending}
        title={t('admin.cancelSubscription', 'Cancel subscription')}
        description={t('companies.cancel_body', '{name} loses access to the workspace as soon as this is cancelled.', { name: cancelling?.name ?? '' })}
        confirmLabel={t('admin.cancelSubscription', 'Cancel subscription')}
      />
    </>
  )
}

export default AdminCompanies
