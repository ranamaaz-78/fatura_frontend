import {
  CreditCard,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { Radio } from '../../components/ui/Radio'
import { SearchInput } from '../../components/ui/SearchInput'
import { SectionDivider } from '../../components/ui/SectionDivider'
import { Select } from '../../components/ui/Select'
import { Skeleton, SkeletonCard, SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { Stepper } from '../../components/ui/Stepper'
import { Tabs } from '../../components/ui/Tabs'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { Tooltip } from '../../components/ui/Tooltip'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '../../lib/format'
import { STATUS_STYLES } from '../../lib/status'

type SampleRow = {
  id: string
  customer: string
  amount: number
  status: string
}

const sampleRows: SampleRow[] = [
  { id: 'F-2026-001', customer: 'Northwind Traders', amount: 1280.5, status: 'PAID' },
  { id: 'F-2026-002', customer: 'Contoso Ltd', amount: 640, status: 'PENDING' },
  { id: 'F-2026-003', customer: 'Adventure Works', amount: 90.25, status: 'OVERDUE' },
]

function UiGallery() {
  const { push } = useToast()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState('open')
  const [pill, setPill] = useState('all')
  const [search, setSearch] = useState('')
  const [toggleOn, setToggleOn] = useState(true)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState('id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [name, setName] = useState('')
  const [fileName, setFileName] = useState('')
  const [step, setStep] = useState(1)

  const columns: DataTableColumn<SampleRow>[] = useMemo(
    () => [
      {
        key: 'id',
        header: t('gallery.document', 'Document'),
        cell: (row) => row.id,
        mono: true,
        sortable: true,
      },
      {
        key: 'customer',
        header: t('gallery.customer', 'Customer'),
        cell: (row) => row.customer,
        sortable: true,
      },
      {
        key: 'amount',
        header: t('gallery.amount', 'Amount'),
        cell: (row) => formatCurrency(row.amount, 'EUR', 'en-GB'),
        numeric: true,
        sortable: true,
      },
      {
        key: 'status',
        header: t('gallery.status', 'Status'),
        cell: (row) => <Badge status={row.status} />,
      },
    ],
    [],
  )

  const filteredRows = sampleRows.filter((row) =>
    `${row.id} ${row.customer}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-svh bg-slate-50 p-4 sm:p-6 space-y-6 max-w-[1280px] mx-auto">
      <PageHeader
        title={t('gallery.title', 'Component gallery')}
        subtitle={t('gallery.subtitle', 'Visual check of the Fatura UI library. Not part of the product.')}
        actions={
          <>
            <Button variant="ghost" icon={<LayoutDashboard className="w-4 h-4" />}>
              <span className="hidden sm:inline">{t('gallery.dashboard', 'Dashboard')}</span>
            </Button>
            <Button
              icon={<Plus className="w-4 h-4" />}
              loading={loading}
              onClick={() => {
                setLoading(true)
                window.setTimeout(() => setLoading(false), 1200)
              }}
            >
              {t('gallery.newInvoice', 'New invoice')}
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.buttons', 'Buttons')}</h2>
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button>{t('gallery.primary', 'Primary')}</Button>
            <Button variant="secondary">{t('gallery.secondary', 'Secondary')}</Button>
            <Button variant="ghost">{t('gallery.ghost', 'Ghost')}</Button>
            <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
              {t('gallery.danger', 'Danger')}
            </Button>
            <Button variant="success">{t('gallery.success', 'Success')}</Button>
            <Button size="sm">{t('gallery.small', 'Small')}</Button>
            <Button size="lg">{t('gallery.large', 'Large')}</Button>
            <Button disabled>{t('gallery.disabled', 'Disabled')}</Button>
            <Button loading>{t('common.loading', 'Loading')}</Button>
            <IconButton label={t('gallery.edit', 'Edit')}>
              <Pencil className="w-4 h-4" />
            </IconButton>
            <IconButton label={t('common.remove', 'Remove')} destructive>
              <Trash2 className="w-4 h-4" />
            </IconButton>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.stats', 'Stat cards')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('gallery.revenue', 'Revenue')}
            value={formatCurrency(12840, 'EUR', 'en-GB')}
            change="+12%"
            isPositive
            icon={<TrendingUp className="w-5 h-5" />}
            subtext={t('gallery.thisMonth', 'This month')}
          />
          <StatCard
            title={t('gallery.invoices', 'Invoices')}
            value={formatNumber(42, 0)}
            icon={<Receipt className="w-5 h-5" />}
          />
          <StatCard
            title={t('gallery.lowStock', 'Low stock')}
            value={formatNumber(3, 0)}
            icon={<Package className="w-5 h-5" />}
            iconColor="bg-amber-50 text-amber-600"
            isPositive={false}
            change="3"
          />
          <StatCard
            title={t('gallery.payments', 'Payments')}
            value={formatPercent(96)}
            icon={<CreditCard className="w-5 h-5" />}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.badges', 'Badges')}</h2>
        <Card>
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATUS_STYLES).map((status) => (
              <Badge key={status} status={status} />
            ))}
            <Badge status="UNKNOWN" />
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.forms', 'Forms')}</h2>
        <Card title={t('gallery.formControls', 'Form controls')} subtitle={t('gallery.formHint', 'Validate on blur in real forms.')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="name"
              label={t('gallery.customerName', 'Customer name')}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              name="amount"
              label={t('gallery.amount', 'Amount')}
              inputMode="decimal"
              suffix="EUR"
              defaultValue="120.00"
            />
            <Input
              name="broken"
              label={t('gallery.withError', 'With error')}
              error={t('gallery.requiredField', 'This field is required')}
              defaultValue=""
            />
            <Select name="tax" label={t('gallery.tax', 'Tax')} defaultValue="20">
              <option value="0">0%</option>
              <option value="10">10%</option>
              <option value="20">20%</option>
            </Select>
            <Textarea name="notes" label={t('gallery.notes', 'Notes')} rows={3} hint={t('gallery.notesHint', 'Shown on the document.')} />
            <div className="space-y-3">
              <Toggle checked={toggleOn} onChange={setToggleOn} label={t('gallery.scannerReady', 'Scanner ready')} />
              <Checkbox name="terms" label={t('gallery.accept', 'I accept the terms')} defaultChecked />
              <div className="flex gap-4">
                <Radio name="channel" value="email" label={t('gallery.email', 'Email')} defaultChecked />
                <Radio name="channel" value="print" label={t('gallery.print', 'Print')} />
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.tabsSearch', 'Tabs and search')}</h2>
        <Card>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'open', label: t('gallery.open', 'Open') },
              { id: 'paid', label: t('gallery.paid', 'Paid') },
              { id: 'all', label: t('gallery.all', 'All') },
            ]}
          />
          <div className="pt-4 space-y-4">
            <Tabs
              variant="pill"
              value={pill}
              onChange={setPill}
              items={[
                { id: 'all', label: t('gallery.all', 'All') },
                { id: 'low', label: t('gallery.lowStock', 'Low stock') },
              ]}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              results={[
                { id: '1', label: 'F-2026-001 · Northwind' },
                { id: '2', label: 'F-2026-002 · Contoso' },
              ]}
              onSelect={(id) => push({ tone: 'info', title: id })}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.table', 'Data table')}</h2>
        <DataTable
          columns={columns}
          rows={filteredRows}
          rowKey={(row) => row.id}
          search={search}
          onSearch={setSearch}
          selectedKeys={['F-2026-001']}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(key) => {
            setSortKey(key)
            setSortDir((current) => (sortKey === key && current === 'asc' ? 'desc' : 'asc'))
          }}
          rowActions={() => (
            <>
              <IconButton label={t('gallery.edit', 'Edit')} tooltipAlign="end">
                <Pencil className="w-4 h-4" />
              </IconButton>
              <IconButton label={t('common.remove', 'Remove')} tooltipAlign="end" destructive>
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </>
          )}
          empty={
            <EmptyState
              icon={Receipt}
              title={t('common.noResults', 'No results')}
              description={t('gallery.clearFilters', 'Try clearing the search.')}
            />
          }
          page={page}
          pageCount={3}
          onPageChange={setPage}
          summary={`${formatDate(new Date())} · ${filteredRows.length}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.feedback', 'Feedback')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title={t('gallery.empty', 'Empty')}>
            <EmptyState
              icon={Package}
              title={t('common.empty', 'Nothing here yet')}
              description={t('gallery.emptyProducts', 'Add your first product to start invoicing.')}
              primaryAction={<Button size="sm">{t('gallery.addProduct', 'Add product')}</Button>}
            />
          </Card>
          <Card title={t('gallery.skeletons', 'Skeletons')}>
            <SkeletonCard />
            <div className="mt-4">
              <Skeleton className="h-8 w-48 mb-3" />
              <SkeletonTable rows={3} />
            </div>
          </Card>
        </div>
        <SkeletonStatGrid />
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => push({ tone: 'success', title: t('gallery.saved', 'Saved') })}>
              {t('gallery.toastSuccess', 'Success toast')}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                push({
                  tone: 'danger',
                  title: t('gallery.saveFailed', 'Could not save'),
                  actionLabel: t('common.retry', 'Retry'),
                  onAction: () => push({ tone: 'info', title: t('gallery.retrying', 'Retrying') }),
                })
              }
            >
              {t('gallery.toastError', 'Error toast')}
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              {t('gallery.openModal', 'Open modal')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              {t('gallery.openConfirm', 'Open confirm')}
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              {t('gallery.openDrawer', 'Open drawer')}
            </Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">{t('gallery.other', 'Other')}</h2>
        <Card>
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Avatar name="Ada Lovelace" />
              <Tooltip content={t('gallery.accountOwner', 'Account owner')}>
                <span className="text-sm text-slate-700">Ada Lovelace</span>
              </Tooltip>
            </div>
            <Stepper
              current={step}
              steps={[
                { id: 'upload', label: t('gallery.upload', 'Upload') },
                { id: 'map', label: t('gallery.map', 'Map columns') },
                { id: 'validate', label: t('gallery.validate', 'Validate') },
                { id: 'confirm', label: t('gallery.confirmStep', 'Confirm') },
              ]}
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep((current) => Math.max(0, current - 1))}>
                {t('common.previous', 'Previous')}
              </Button>
              <Button size="sm" onClick={() => setStep((current) => Math.min(3, current + 1))}>
                {t('common.next', 'Next')}
              </Button>
            </div>
            <FileDropzone
              accept=".csv,.xlsx"
              onFile={(file) => setFileName(file.name)}
            />
            {fileName ? <p className="text-xs text-slate-500 font-mono">{fileName}</p> : null}
            <SectionDivider label={t('gallery.meta', 'Meta')} />
            <Pagination page={page} pageCount={5} onPageChange={setPage} summary={t('gallery.pageSummary', 'Page of results')} />
          </div>
        </Card>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('gallery.modalTitle', 'Create customer')}
        subtitle={t('gallery.modalSubtitle', 'Becomes a bottom sheet on phones.')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => setModalOpen(false)}>{t('gallery.save', 'Save')}</Button>
          </>
        }
      >
        <Input name="modal-name" label={t('gallery.customerName', 'Customer name')} />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title={t('gallery.deleteTitle', 'Delete invoice')}
        description={t('gallery.deleteBody', 'This cannot be undone. The document will be cancelled.')}
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="p-4 space-y-2">
          <p className="text-sm font-bold text-slate-900">{t('gallery.drawer', 'Drawer')}</p>
          <p className="text-xs text-slate-500">{t('gallery.drawerBody', 'Used later for the mobile sidebar.')}</p>
          <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
            {t('common.close', 'Close')}
          </Button>
        </div>
      </Drawer>
    </div>
  )
}

export default UiGallery
