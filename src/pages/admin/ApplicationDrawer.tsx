import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  Mail,
  MessageCircle,
  Phone,
  UserPlus,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage } from '../../services/api'
import {
  getApplication,
  getApplicationWhatsAppLink,
  logApplicationActivity,
  saveApplicationNotes,
  updateApplicationStatus,
} from '../../services/admin/applications'
import { ConvertWizard } from './ConvertWizard'

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Application received',
  status_changed: 'Status changed',
  note: 'Note',
  call: 'Call logged',
  whatsapp: 'WhatsApp logged',
  email: 'Email logged',
  converted: 'Converted',
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}

export type ApplicationDrawerProps = {
  applicationId: number | null
  onClose: () => void
}

export function ApplicationDrawer({ applicationId, onClose }: ApplicationDrawerProps) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [notes, setNotes] = useState('')
  const [note, setNote] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)

  const query = useQuery({
    queryKey: ['admin', 'application', applicationId],
    queryFn: () => getApplication(applicationId as number),
    enabled: applicationId !== null,
  })

  const application = query.data

  useEffect(() => {
    setNotes(application?.notes ?? '')
    setNote('')
  }, [application?.id, application?.notes])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'applications'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'application', applicationId] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: 'contacted' | 'rejected' | 'new') =>
      updateApplicationStatus(applicationId as number, { status }),
    onSuccess: invalidate,
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const notesMutation = useMutation({
    mutationFn: () => saveApplicationNotes(applicationId as number, notes),
    onSuccess: () => {
      invalidate()
      push({ tone: 'success', title: t('common.save', 'Save') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const activityMutation = useMutation({
    mutationFn: (payload: { type: 'note' | 'call' | 'whatsapp' | 'email'; body?: string }) =>
      logApplicationActivity(applicationId as number, payload),
    onSuccess: () => {
      setNote('')
      invalidate()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const whatsappMutation = useMutation({
    mutationFn: () => getApplicationWhatsAppLink(applicationId as number),
    onSuccess: (data) => {
      window.open(data.whatsapp_url, '_blank', 'noreferrer')
      activityMutation.mutate({ type: 'whatsapp', body: 'Opened WhatsApp chat.' })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  return (
    <>
      <Drawer open={applicationId !== null} onClose={onClose} side="right" width="w-full sm:w-[30rem]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              {t('admin.applicationDetail', 'Application')}
            </p>
            <h2 className="truncate text-lg font-bold text-slate-900">
              {application?.company_name ?? '—'}
            </h2>
          </div>
          <IconButton label={t('common.close', 'Close')} tooltipAlign="end" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {query.isPending ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : application ? (
          <div className="space-y-6 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={application.status.toUpperCase()} />
              {application.plan ? (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600">
                  {application.plan.name}
                </span>
              ) : null}
              <span className="font-mono text-[11px] text-slate-400">
                {formatDateTime(application.created_at)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${application.phone}`}
                onClick={() => activityMutation.mutate({ type: 'call', body: 'Dialled from the inbox.' })}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Phone className="h-4 w-4 text-blue-600" />
                {t('admin.call', 'Call')}
              </a>
              <button
                type="button"
                onClick={() => whatsappMutation.mutate()}
                disabled={!application.whatsapp_number}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {t('admin.whatsapp', 'WhatsApp')}
              </button>
              <a
                href={`mailto:${application.email}`}
                onClick={() => activityMutation.mutate({ type: 'email', body: 'Opened an email draft.' })}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4 text-indigo-600" />
                {t('admin.emailAction', 'Email')}
              </a>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t('apply.contactName', 'Your name')} value={application.contact_name} />
              <Field label={t('apply.email', 'Email')} value={application.email} />
              <Field label={t('apply.phone', 'Phone')} value={application.phone} />
              <Field label={t('apply.whatsapp', 'WhatsApp')} value={application.whatsapp} />
              <Field label={t('apply.city', 'City')} value={application.city} />
              <Field label={t('apply.country', 'Country')} value={application.country} />
              <Field label={t('apply.businessType', 'What do you do?')} value={application.business_type} />
              <Field label={t('apply.teamSize', 'Team size')} value={application.team_size} />
            </dl>

            {application.message ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {application.message}
              </div>
            ) : null}

            {application.converted_company_id ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold text-emerald-800">
                  {t('admin.alreadyConverted', 'Converted to a live company.')}
                </p>
                <Link
                  to={`/admin/companies/${application.converted_company_id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {t('admin.viewCompany', 'View company')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setWizardOpen(true)}
                >
                  {t('admin.createAccount', 'Create account')}
                </Button>
                {application.status !== 'contacted' ? (
                  <Button
                    variant="secondary"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate('contacted')}
                  >
                    {t('admin.markContacted', 'Mark contacted')}
                  </Button>
                ) : null}
                {application.status !== 'rejected' ? (
                  <Button
                    variant="ghost"
                    loading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate('rejected')}
                  >
                    {t('admin.markRejected', 'Reject')}
                  </Button>
                ) : null}
              </div>
            )}

            <div>
              <Textarea
                label={t('admin.internalNotes', 'Internal notes')}
                rows={3}
                placeholder={t('admin.notesPlaceholder', 'Anything the team should know about this lead.')}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  loading={notesMutation.isPending}
                  onClick={() => notesMutation.mutate()}
                >
                  {t('common.save', 'Save')}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('admin.timeline', 'Timeline')}
              </p>
              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('admin.addNote', 'Add a note')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <Button
                  size="sm"
                  disabled={note.trim() === ''}
                  loading={activityMutation.isPending}
                  onClick={() => activityMutation.mutate({ type: 'note', body: note.trim() })}
                >
                  {t('admin.logNote', 'Log note')}
                </Button>
              </div>

              <ol className="mt-4 space-y-4 border-l border-slate-200 pl-4">
                {(application.activities ?? []).map((activity) => (
                  <li key={activity.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                    <p className="text-xs font-semibold text-slate-800">
                      {ACTIVITY_LABELS[activity.type] ?? activity.type}
                    </p>
                    {activity.body ? <p className="text-xs text-slate-600">{activity.body}</p> : null}
                    <p className="font-mono text-[10px] text-slate-400">
                      {formatDateTime(activity.created_at)}
                      {activity.user ? ` · ${activity.user.name}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </Drawer>

      {application && wizardOpen ? (
        <ConvertWizard
          application={application}
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onConverted={invalidate}
        />
      ) : null}
    </>
  )
}
