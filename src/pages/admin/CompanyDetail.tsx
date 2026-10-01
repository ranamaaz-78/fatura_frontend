import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarX2,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  PauseCircle,
  Phone,
  PlayCircle,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { RowMenu, type RowMenuItem } from '../../components/ui/RowMenu'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCurrency, formatDate } from '../../lib/format'
import { daysText, STATE_LABEL, STATE_STYLE, subscriptionInfo } from '../../lib/subscription'
import { getErrorMessage } from '../../services/api'
import {
  cancelSubscription,
  disconnectCompanyWhatsApp,
  getCompany,
  getCompanyWhatsApp,
  resendAccess,
  setCompanyStatus,
  whatsappFromError,
} from '../../services/admin/companies'
import { RenewSubscriptionModal } from './RenewSubscriptionModal'

function Detail({ icon: Icon, children }: { icon: typeof Mail; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-sm text-ink">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

function CompanyDetail() {
  const { id } = useParams()
  const companyId = Number(id)
  const queryClient = useQueryClient()
  const { push } = useToast()

  const [renewOpen, setRenewOpen] = useState(false)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'company', companyId],
    queryFn: () => getCompany(companyId),
    enabled: Number.isFinite(companyId),
  })

  const company = query.data

  const whatsapp = useQuery({
    queryKey: ['admin', 'company', companyId, 'whatsapp'],
    queryFn: () => getCompanyWhatsApp(companyId),
    enabled: Number.isFinite(companyId),
    refetchInterval: 30000,
  })
  const [whatsappOff, setWhatsappOff] = useState(false)
  const disconnectWhatsApp = useMutation({
    mutationFn: () => disconnectCompanyWhatsApp(companyId),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'company', companyId, 'whatsapp'], data)
      setWhatsappOff(false)
      push({ tone: 'success', title: t('admin.whatsappDisconnected', 'WhatsApp disconnected') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'suspended') => setCompanyStatus(companyId, status),
    onSuccess: (_data, status) => {
      invalidate()
      setSuspendOpen(false)
      push({
        tone: 'success',
        title: status === 'suspended' ? t('admin.companySuspended', 'Company suspended') : t('admin.companyReactivated', 'Company reactivated'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: number) => cancelSubscription(subscriptionId),
    onSuccess: () => {
      setCancelId(null)
      invalidate()
      push({ tone: 'success', title: t('admin.subscriptionCancelled', 'Subscription cancelled') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const resendMutation = useMutation({
    mutationFn: () => resendAccess(companyId),
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

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('nav.companies', 'Companies')} />
        <SkeletonCard />
      </>
    )
  }

  if (!company) {
    return (
      <Card>
        <EmptyState icon={XCircle} title={t('common.error', 'Something went wrong')} description={getErrorMessage(query.error)} />
      </Card>
    )
  }

  const info = subscriptionInfo(company)
  const style = STATE_STYLE[info.state]
  const active = company.active_subscription
  const suspended = company.status === 'suspended'
  const history = company.subscriptions ?? []

  const menu: RowMenuItem[] = [
    suspended
      ? { label: t('admin.reactivate', 'Reactivate'), icon: PlayCircle, onSelect: () => statusMutation.mutate('active') }
      : { label: t('admin.suspend', 'Suspend'), icon: PauseCircle, destructive: true, onSelect: () => setSuspendOpen(true) },
  ]
  if (active) {
    menu.push({
      label: t('admin.cancelSubscription', 'Cancel subscription'),
      icon: XCircle,
      destructive: true,
      onSelect: () => setCancelId(active.id),
    })
  }

  const whatsappNumber = (company.whatsapp ?? company.owner?.phone ?? '').replace(/\D/g, '')

  return (
    <>
      <Link to="/admin/companies" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('nav.companies', 'Companies')}
      </Link>

      <PageHeader
        title={company.name}
        subtitle={`${company.email}${company.city ? ` · ${company.city}` : ''}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              loading={resendMutation.isPending}
              onClick={() => resendMutation.mutate()}
            >
              {t('admin.resendAccess', 'Resend access link')}
            </Button>
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => setRenewOpen(true)}>
              {info.state === 'none' ? t('admin.startPlan', 'Start plan') : t('admin.renew', 'Renew or change plan')}
            </Button>
            <RowMenu items={menu} />
          </>
        }
      />

      {suspended ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 p-4 app-dark:border-white/15 app-dark:bg-white/8">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            <PauseCircle className="h-5 w-5 text-slate-500" />
            {t('admin.suspendedBanner', 'This company is suspended and cannot sign in.')}
          </p>
          <Button size="sm" variant="secondary" loading={statusMutation.isPending} onClick={() => statusMutation.mutate('active')}>
            {t('admin.reactivate', 'Reactivate')}
          </Button>
        </div>
      ) : null}

      {info.state === 'expired' || info.state === 'expiring' || info.state === 'none' ? (
        <div
          className={cn(
            'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4',
            info.state === 'expired' && 'border-rose-200 bg-rose-50 app-dark:border-rose-500/30 app-dark:bg-rose-500/10',
            info.state === 'expiring' && 'border-amber-200 bg-amber-50 app-dark:border-amber-500/30 app-dark:bg-amber-500/10',
            info.state === 'none' && 'border-blue-200 bg-blue-50 app-dark:border-blue-500/30 app-dark:bg-blue-500/10',
          )}
        >
          <p className="flex items-center gap-2.5 text-sm font-semibold text-ink">
            {info.state === 'expired' ? (
              <CalendarX2 className="h-5 w-5 text-rose-600" />
            ) : (
              <AlertTriangle className={cn('h-5 w-5', info.state === 'expiring' ? 'text-amber-600' : 'text-blue-600')} />
            )}
            {info.state === 'expired'
              ? `The subscription ended on ${formatDate(info.subscription?.ends_at ?? new Date())}. The workspace is locked until it is renewed.`
              : info.state === 'expiring'
                ? `The subscription ends on ${formatDate(info.subscription?.ends_at ?? new Date())} (${daysText(info).toLowerCase()}).`
                : 'This company has no subscription yet, so its owner cannot use the workspace.'}
          </p>
          <div className="flex gap-2">
            {whatsappNumber ? (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-page"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp
              </a>
            ) : null}
            <Button size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setRenewOpen(true)}>
              {info.state === 'none' ? t('admin.startPlan', 'Start plan') : t('admin.renewShort', 'Renew')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={t('admin.subscription', 'Subscription')}
          className="lg:col-span-2"
          actions={
            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', style.badge)}>{STATE_LABEL[info.state]}</span>
          }
        >
          {info.subscription ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-ink">{info.subscription.plan_name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatCurrency(info.subscription.plan_price, info.subscription.plan_currency, 'en-US')} / {info.subscription.plan_interval}
                  </p>
                </div>
                <p className={cn('text-2xl font-bold tracking-tight', info.state === 'expired' ? 'text-rose-600' : info.state === 'expiring' ? 'text-amber-600' : 'text-ink')}>
                  {daysText(info)}
                </p>
              </div>

              <div>
                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                  <div className={cn('h-full rounded-full transition-all', style.bar)} style={{ width: `${Math.max(info.percent, 3)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-muted">
                  <span>
                    {t('admin.startedOn', 'Started')} {formatDate(info.subscription.starts_at)}
                  </span>
                  <span>
                    {info.state === 'expired' ? t('admin.endedOn', 'Ended') : t('admin.renewsOn', 'Renews on')} {formatDate(info.subscription.ends_at)}
                  </span>
                </div>
              </div>

              {info.subscription.plan_features.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {info.subscription.plan_features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <EmptyState
              icon={RefreshCw}
              title={t('admin.noSubscription', 'No subscription yet.')}
              description={t('admin.noSubscriptionHelp', 'Start a subscription so the owner can use the workspace.')}
              primaryAction={<Button onClick={() => setRenewOpen(true)}>{t('admin.startPlan', 'Start plan')}</Button>}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card title={t('admin.owner', 'Owner')}>
            {company.owner ? (
              <div className="flex items-start gap-3">
                <Avatar name={company.owner.name} size="lg" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-ink">{company.owner.name}</p>
                  <p className="truncate text-xs text-ink-muted">{company.owner.email}</p>
                  {company.owner.phone ? <p className="text-xs text-ink-muted">{company.owner.phone}</p> : null}
                  <p className="pt-1 text-xs">
                    {company.owner.has_password ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Password set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                        <Send className="h-3.5 w-3.5" /> Waiting for the invite link
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">—</p>
            )}
          </Card>

          <Card title={t('admin.company', 'Company')} actions={<Badge status={company.status.toUpperCase()} />}>
            <div className="space-y-2.5">
              <Detail icon={Mail}>{company.email}</Detail>
              {company.tax_id ? <Detail icon={FileText}>NIF/NIE/CIF: {company.tax_id}</Detail> : null}
              {company.phone ? <Detail icon={Phone}>{company.phone}</Detail> : null}
              {company.whatsapp ? <Detail icon={MessageCircle}>{company.whatsapp}</Detail> : null}
              {company.address || company.city || company.country ? (
                <Detail icon={MapPin}>
                  {[company.address, [company.postal_code, company.city].filter(Boolean).join(' '), company.country].filter(Boolean).join(', ')}
                </Detail>
              ) : null}
              {company.users_count !== undefined ? (
                <Detail icon={Users}>
                  {company.users_count} {company.users_count === 1 ? 'user' : 'users'}
                </Detail>
              ) : null}
              <p className="pt-1 text-xs text-ink-muted">
                {t('admin.customerSince', 'Customer since')} {formatDate(company.created_at)}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card
        title={t('admin.whatsappTitle', 'WhatsApp')}
        className="mt-4"
        actions={
          whatsapp.data ? (
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                whatsapp.data.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : whatsapp.data.status === 'disconnected'
                    ? 'bg-slate-100 text-slate-600 ring-slate-200'
                    : 'bg-amber-50 text-amber-700 ring-amber-200',
              )}
            >
              {whatsapp.data.status === 'connected'
                ? t('admin.waConnected', 'Connected')
                : whatsapp.data.status === 'disconnected'
                  ? t('admin.waNotConnected', 'Not connected')
                  : t('admin.waLinking', 'Linking')}
            </span>
          ) : null
        }
      >
        {whatsapp.isPending ? (
          <p className="text-xs text-ink-muted">{t('common.loading', 'Loading')}</p>
        ) : whatsapp.data ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="text-ink">
                {whatsapp.data.status === 'connected' && whatsapp.data.connected_phone
                  ? `+${whatsapp.data.connected_phone}${whatsapp.data.connected_name ? ` · ${whatsapp.data.connected_name}` : ''}`
                  : t('admin.waNone', 'This company has not linked a WhatsApp number.')}
              </p>
              <p className="text-xs text-ink-muted">
                {t('admin.waInstance', 'Own session')}: <span className="font-medium text-ink">{whatsapp.data.instance_name}</span>
                {!whatsapp.data.service_alive ? (
                  <span className="ml-2 font-semibold text-rose-600">{t('admin.waServiceDown', 'WhatsApp service is not running')}</span>
                ) : null}
              </p>
            </div>
            {whatsapp.data.has_instance ? (
              <Button variant="secondary" size="sm" onClick={() => setWhatsappOff(true)}>
                {t('admin.waDisconnect', 'Disconnect')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={whatsappOff}
        onClose={() => setWhatsappOff(false)}
        onConfirm={() => disconnectWhatsApp.mutate()}
        loading={disconnectWhatsApp.isPending}
        tone="warning"
        title={t('admin.waDisconnectTitle', 'Disconnect this company\'s WhatsApp?')}
        description={`${company?.name ?? ''} will have to scan a new QR code before it can send documents on WhatsApp again.`}
        confirmLabel={t('admin.waDisconnect', 'Disconnect')}
      />

      <Card title={t('admin.subscriptionHistory', 'Subscription history')} className="mt-4">
        {history.length === 0 ? (
          <p className="text-xs text-ink-muted">{t('admin.noSubscription', 'No subscription yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((subscription) => (
              <li key={subscription.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{subscription.plan_name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(subscription.starts_at)} → {formatDate(subscription.ends_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-ink-muted">
                      {formatCurrency(subscription.plan_price, subscription.plan_currency, 'en-US')}
                    </span>
                    <Badge status={subscription.status.toUpperCase()} />
                  </div>
                </div>
                {(subscription.payments ?? []).length > 0 ? (
                  <ul className="mt-3 space-y-1.5 rounded-xl bg-page p-3">
                    {(subscription.payments ?? []).map((payment) => (
                      <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-ink-muted">
                          {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                          {payment.payment_method ? ` · ${payment.payment_method.name}` : ''}
                          {payment.reference ? ` · ${payment.reference}` : ''}
                        </span>
                        <span className="font-semibold text-ink">{formatCurrency(payment.amount, payment.currency, 'en-US')}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RenewSubscriptionModal company={renewOpen ? company : null} onClose={() => setRenewOpen(false)} />

      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        onConfirm={() => statusMutation.mutate('suspended')}
        loading={statusMutation.isPending}
        tone="warning"
        title={t('admin.suspendTitle', 'Suspend this company?')}
        description={`${company.name} will not be able to sign in until you reactivate it. Nothing is deleted.`}
        confirmLabel={t('admin.suspend', 'Suspend')}
      />

      <ConfirmDialog
        open={cancelId !== null}
        onClose={() => setCancelId(null)}
        onConfirm={() => cancelMutation.mutate(cancelId as number)}
        loading={cancelMutation.isPending}
        title={t('admin.cancelSubscription', 'Cancel subscription')}
        description="The company loses access to the workspace as soon as this is cancelled."
        confirmLabel={t('admin.cancelSubscription', 'Cancel subscription')}
      />
    </>
  )
}

export default CompanyDetail
