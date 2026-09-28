import { useQuery } from '@tanstack/react-query'
import { Eye, Inbox } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { t } from '../../i18n'
import { formatDate } from '../../lib/format'
import { listApplications } from '../../services/admin/applications'
import type { Application, ApplicationStatus } from '../../types/module01'
import { ApplicationDrawer } from './ApplicationDrawer'

type TabId = ApplicationStatus | 'all'

function AdminApplications() {
  const [tab, setTab] = useState<TabId>('new')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'applications', tab, search, page],
    queryFn: () => listApplications({ status: tab, search, page }),
  })

  const counts = query.data?.counts
  const rows = query.data?.items ?? []
  const meta = query.data?.meta

  const columns: DataTableColumn<Application>[] = [
    {
      key: 'company',
      header: 'Business',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{row.company_name}</p>
          <p className="truncate text-xs text-slate-500">{row.contact_name}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', cell: (row) => <span className="font-mono text-xs">{row.email}</span> },
    { key: 'phone', header: 'Phone', cell: (row) => <span className="font-mono text-xs">{row.phone}</span> },
    { key: 'plan', header: 'Plan', cell: (row) => row.plan?.name ?? '—' },
    { key: 'created', header: 'Received', cell: (row) => formatDate(row.created_at) },
    { key: 'status', header: 'Status', cell: (row) => <Badge status={row.status.toUpperCase()} /> },
  ]

  return (
    <>
      <PageHeader
        title={t('nav.applications', 'Applications')}
        subtitle={t('admin.applicationsSubtitle', 'Leads from the public site. Convert one to create a live account.')}
      />

      <Tabs
        value={tab}
        onChange={(id) => {
          setTab(id as TabId)
          setPage(1)
        }}
        items={[
          { id: 'new', label: `${t('status.NEW', 'New')} (${counts?.new ?? 0})` },
          { id: 'contacted', label: `${t('status.CONTACTED', 'Contacted')} (${counts?.contacted ?? 0})` },
          { id: 'approved', label: `${t('status.APPROVED', 'Approved')} (${counts?.approved ?? 0})` },
          { id: 'rejected', label: `${t('status.REJECTED', 'Rejected')} (${counts?.rejected ?? 0})` },
          { id: 'all', label: `${t('common.all', 'All')} (${counts?.all ?? 0})` },
        ]}
      />

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
        summary={meta ? `${meta.total} total` : undefined}
        empty={
          <EmptyState
            icon={Inbox}
            title={t('common.noResults', 'No results')}
            description="No applications match this filter yet."
            primaryAction={
              search ? <Button variant="secondary" onClick={() => setSearch('')}>{t('common.remove', 'Remove')}</Button> : undefined
            }
          />
        }
        rowActions={(row) => (
          <IconButton
            label={t('admin.applicationDetail', 'Application')}
            tooltipAlign="end"
            onClick={() => setSelected(row.id)}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
        )}
      />

      <ApplicationDrawer applicationId={selected} onClose={() => setSelected(null)} />
    </>
  )
}

export default AdminApplications
