import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Building2,
  CheckCheck,
  Eye,
  Inbox,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { Modal } from '../../components/ui/Modal'
import { RowMenu, type RowMenuItem } from '../../components/ui/RowMenu'
import { PageHeader } from '../../components/ui/PageHeader'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t, intlLocale } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import {
  getApplicationWhatsAppLink,
  listApplications,
  logApplicationActivity,
  updateApplicationStatus,
} from '../../services/admin/applications'
import type { Application, ApplicationStatus } from '../../types/module01'
import { ApplicationDrawer } from './ApplicationDrawer'
import { ConvertWizard } from './ConvertWizard'
import { localCountry } from '../../lib/countries'

type TabId = ApplicationStatus | 'all'

const TILES: { id: TabId; label: string; fallback: string; icon: LucideIcon; tone: string }[] = [
  { id: 'new', label: 'status.NEW', fallback: 'New', icon: Inbox, tone: 'bg-blue-50 text-blue-600 app-dark:bg-blue-500/15 app-dark:text-blue-300' },
  { id: 'contacted', label: 'status.CONTACTED', fallback: 'Contacted', icon: Phone, tone: 'bg-amber-50 text-amber-600 app-dark:bg-amber-500/15 app-dark:text-amber-300' },
  { id: 'approved', label: 'status.APPROVED', fallback: 'Approved', icon: Building2, tone: 'bg-emerald-50 text-emerald-600 app-dark:bg-emerald-500/15 app-dark:text-emerald-300' },
  { id: 'rejected', label: 'status.REJECTED', fallback: 'Rejected', icon: Ban, tone: 'bg-rose-50 text-rose-600 app-dark:bg-rose-500/15 app-dark:text-rose-300' },
  { id: 'all', label: 'common.all', fallback: 'All', icon: Users, tone: 'bg-slate-100 text-slate-600 app-dark:bg-white/10 app-dark:text-slate-300' },
]

/** "5 min ago", "3 h ago", "2 d ago", then the plain date. */
function timeAgo(value: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return t('admin.justNow', 'Just now')
  if (minutes < 60) return t('admin.min_ago', '{n} min ago', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('admin.h_ago', '{n} h ago', { n: hours })
  const days = Math.round(hours / 24)
  if (days < 14) return t('admin.d_ago', '{n} d ago', { n: days })
  return new Date(value).toLocaleDateString(intlLocale())
}

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-xs text-ink-muted">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  )
}

function AdminApplications() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [tab, setTab] = useState<TabId>('new')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [converting, setConverting] = useState<Application | null>(null)
  const [rejecting, setRejecting] = useState<Application | null>(null)
  const [reason, setReason] = useState('')

  const query = useQuery({
    queryKey: ['admin', 'applications', tab, search, page],
    queryFn: () => listApplications({ status: tab, search, page }),
  })

  const counts = query.data?.counts
  const rows = query.data?.items ?? []
  const meta = query.data?.meta

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'application'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const statusMutation = useMutation({
    mutationFn: (input: { id: number; status: ApplicationStatus; note?: string }) =>
      updateApplicationStatus(input.id, { status: input.status, note: input.note }),
    onSuccess: (_data, input) => {
      refresh()
      setRejecting(null)
      setReason('')
      push({
        tone: 'success',
        title:
          input.status === 'rejected'
            ? t('admin.appRejected', 'Application rejected')
            : input.status === 'contacted'
              ? t('admin.appContacted', 'Marked as contacted')
              : t('admin.appReopened', 'Application reopened'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const logMutation = useMutation({
    mutationFn: (input: { id: number; type: 'call' | 'whatsapp' | 'email'; body: string }) =>
      logApplicationActivity(input.id, { type: input.type, body: input.body }),
    onSuccess: refresh,
  })

  const whatsappMutation = useMutation({
    mutationFn: (row: Application) => getApplicationWhatsAppLink(row.id),
    onSuccess: (data, row) => {
      window.open(data.whatsapp_url, '_blank', 'noreferrer')
      logMutation.mutate({ id: row.id, type: 'whatsapp', body: t('applicationDrawer.opened_whatsapp_chat', 'Opened WhatsApp chat.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'company',
      header: t('admin.business', 'Business'),
      cell: (row) => (
        <button type="button" onClick={() => setSelected(row.id)} className="flex max-w-[190px] min-w-0 items-center gap-3 text-left">
          <Avatar name={row.company_name} size="lg" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink hover:text-brand-600">{row.company_name}</span>
            <span className="block truncate text-xs text-ink-muted">{row.contact_name}</span>
          </span>
        </button>
      ),
    },
    {
      key: 'contact',
      header: t('admin.contact', 'Contact'),
      cell: (row) => (
        <div className="flex max-w-[190px] min-w-0 flex-col gap-1">
          <Chip icon={Mail}>{row.email}</Chip>
          <Chip icon={Phone}>{row.phone}</Chip>
        </div>
      ),
    },
    {
      key: 'where',
      header: t('admin.location', 'Location'),
      cell: (row) =>
        row.city || row.country ? (
          <span className="block max-w-[120px]">
            <Chip icon={MapPin}>{[row.city, localCountry(row.country)].filter(Boolean).join(', ')}</Chip>
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: 'created',
      header: t('admin.received', 'Received'),
      cell: (row) => (
        <span title={formatDateTime(row.created_at)} className="text-xs whitespace-nowrap text-ink-muted">
          {timeAgo(row.created_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status', 'Status'),
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Badge status={row.status.toUpperCase()} />
          {row.plan ? <span className="text-[11px] text-ink-muted">{row.plan.name}</span> : null}
        </div>
      ),
    },
  ]

  function actionsFor(row: Application): ReactNode {
    const converted = row.converted_company_id !== null
    const menu: RowMenuItem[] = [
      { label: t('admin.viewDetails', 'View details'), icon: Eye, onSelect: () => setSelected(row.id) },
      {
        label: t('admin.emailAction', 'Email'),
        icon: Mail,
        onSelect: () => {
          window.location.href = `mailto:${row.email}`
          logMutation.mutate({ id: row.id, type: 'email', body: t('applicationDrawer.opened_an_email_draft', 'Opened an email draft.') })
        },
      },
    ]
    if (!converted) {
      if (row.status === 'new') {
        menu.push({
          label: t('admin.markContacted', 'Mark contacted'),
          icon: CheckCheck,
          onSelect: () => statusMutation.mutate({ id: row.id, status: 'contacted' }),
        })
      }
      if (row.status === 'rejected') {
        menu.push({
          label: t('admin.reopen', 'Reopen'),
          icon: RotateCcw,
          onSelect: () => statusMutation.mutate({ id: row.id, status: 'new' }),
        })
      } else {
        menu.push({
          label: t('admin.markRejected', 'Reject'),
          icon: Ban,
          destructive: true,
          onSelect: () => {
            setReason('')
            setRejecting(row)
          },
        })
      }
    }

    return (
      <>
        {converted ? (
          <Link
            to={`/admin/companies/${row.converted_company_id}`}
            className="mr-1 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap text-ink hover:bg-page"
          >
            <Building2 className="h-3.5 w-3.5" />
            {t('admin.viewCompany', 'View company')}
          </Link>
        ) : row.status === 'rejected' ? null : (
          <Button size="sm" icon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setConverting(row)} className="mr-1 whitespace-nowrap">
            {t('admin.createAccount', 'Create account')}
          </Button>
        )}
        <IconButton
          label={t('admin.whatsapp', 'WhatsApp')}
          disabled={!row.whatsapp_number}
          onClick={() => whatsappMutation.mutate(row)}
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
        </IconButton>
        <RowMenu items={menu} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('nav.applications', 'Applications')}
        subtitle={t('admin.applicationsSubtitle', 'Leads from the public site. Call, message or create an account right from the list.')}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((tile) => {
          const on = tab === tile.id
          const count = counts?.[tile.id] ?? 0
          const Icon = tile.icon
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => {
                setTab(tile.id)
                setPage(1)
              }}
              aria-pressed={on}
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
                <span className="mt-1 block truncate text-xs font-medium text-ink-muted">{t(tile.label, tile.fallback)}</span>
              </span>
              {tile.id === 'new' && count > 0 ? (
                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]" />
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
            icon={Inbox}
            title={t('common.noResults', 'No results')}
            description={t('admin.noApplications', 'No applications match this filter yet.')}
            primaryAction={
              search ? (
                <Button variant="secondary" onClick={() => setSearch('')}>
                  {t('common.clear', 'Clear search')}
                </Button>
              ) : undefined
            }
          />
        }
        rowActions={actionsFor}
      />

      <ApplicationDrawer applicationId={selected} onClose={() => setSelected(null)} />

      {converting ? (
        <ConvertWizard application={converting} open onClose={() => setConverting(null)} onConverted={refresh} />
      ) : null}

      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={t('admin.rejectTitle', 'Reject this application?')}
        subtitle={rejecting?.company_name}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              loading={statusMutation.isPending}
              onClick={() =>
                rejecting && statusMutation.mutate({ id: rejecting.id, status: 'rejected', note: reason.trim() || undefined })
              }
            >
              {t('admin.markRejected', 'Reject')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-muted">
          {t('admin.rejectBody', 'They can apply again with the same email after a rejection. You can also reopen it later.')}
        </p>
        <Textarea
          label={t('admin.rejectReason', 'Reason (optional, kept in the timeline)')}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </>
  )
}

export default AdminApplications
