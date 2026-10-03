import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  CloudOff,
  Loader2,
  LogOut,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import {
  getWhatsAppStatus,
  initWhatsAppInstance,
  logoutWhatsAppInstance,
  sendWhatsAppTest,
  updateWhatsAppSettings,
} from '../../services/whatsapp'
import type { WhatsAppState, WhatsAppStatus } from '../../types/whatsapp'

export const DEFAULT_WHATSAPP_TEMPLATE = t(
  'whatsapp.default_template',
  'Dear {customer_name},\n\nPlease find attached your {document_type} *#{document_number}* from *{company_name}* for *{total_amount}*.\n\nThank you for choosing us!',
)

const TAGS: { tag: string; label: string }[] = [
  { tag: '{customer_name}', label: t('whatsapp.tagCustomer', 'Customer') },
  { tag: '{document_type}', label: t('whatsapp.tagType', 'Document type') },
  { tag: '{document_number}', label: t('whatsapp.tagNumber', 'Number') },
  { tag: '{total_amount}', label: t('whatsapp.tagTotal', 'Total') },
  { tag: '{company_name}', label: t('whatsapp.tagCompany', 'Your company') },
]

const PILL: Record<'ok' | 'wait' | 'off' | 'bad', string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 app-dark:bg-emerald-500/15 app-dark:text-emerald-300 app-dark:ring-emerald-500/30',
  wait: 'bg-amber-50 text-amber-700 ring-amber-200 app-dark:bg-amber-500/15 app-dark:text-amber-300 app-dark:ring-amber-500/30',
  off: 'bg-slate-100 text-slate-600 ring-slate-200 app-dark:bg-white/10 app-dark:text-slate-300 app-dark:ring-white/15',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200 app-dark:bg-rose-500/15 app-dark:text-rose-300 app-dark:ring-rose-500/30',
}

function statusPill(status: WhatsAppStatus): { tone: keyof typeof PILL; label: string } {
  switch (status) {
    case 'connected':
      return { tone: 'ok', label: t('whatsapp.connected', 'Connected') }
    case 'qrcode':
      return { tone: 'wait', label: t('whatsapp.waitingScan', 'Waiting for scan') }
    case 'connecting':
      return { tone: 'wait', label: t('whatsapp.connecting', 'Connecting') }
    case 'service_offline':
    case 'service_misconfigured':
      return { tone: 'bad', label: t('whatsapp.unavailable', 'Unavailable') }
    default:
      return { tone: 'off', label: t('whatsapp.notConnected', 'Not connected') }
  }
}

/** WhatsApp shows *words between stars* in bold; the preview does the same. */
function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*\n]+\*)/g).map((part, index) =>
        /^\*[^*\n]+\*$/.test(part) ? <strong key={index}>{part.slice(1, -1)}</strong> : <span key={index}>{part}</span>,
      )}
    </>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
        {n}
      </span>
      <span className="text-sm leading-snug text-ink">{children}</span>
    </li>
  )
}

function Benefit({ icon: Icon, children }: { icon: typeof Zap; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-ink-muted">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      {children}
    </li>
  )
}

export function WhatsAppTab() {
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const company = session?.company ?? null
  const currency = company?.currency ?? 'EUR'

  const [logoutOpen, setLogoutOpen] = useState(false)
  const [autoSend, setAutoSend] = useState(true)
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE)
  const previous = useRef<WhatsAppStatus | null>(null)
  const loaded = useRef(false)

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: getWhatsAppStatus,
    // Quick while somebody is scanning, relaxed otherwise.
    refetchInterval: (query) => {
      const current = query.state.data?.status
      if (current === 'qrcode' || current === 'connecting') return 2000
      return current === 'connected' ? 30000 : 15000
    },
  })

  const state: WhatsAppState | undefined = statusQuery.data
  const status: WhatsAppStatus = state?.status ?? 'disconnected'
  const unavailable = status === 'service_offline' || status === 'service_misconfigured'

  // Fill the form once from what is saved.
  useEffect(() => {
    if (!state || loaded.current) return
    loaded.current = true
    setAutoSend(state.auto_send)
    setTemplate(state.message_template || DEFAULT_WHATSAPP_TEMPLATE)
  }, [state])

  // A scan that just worked deserves a clear "done".
  useEffect(() => {
    const current = state?.status
    if (!current) return
    // Only a change seen while the page is open counts, not opening it already connected.
    if (previous.current && previous.current !== 'connected' && current === 'connected') {
      push({ tone: 'success', title: t('whatsapp.nowConnected', 'WhatsApp connected. You are ready to send.') })
    }
    previous.current = current
  }, [state?.status, push])

  const connect = useMutation({
    mutationFn: (fresh: boolean) => initWhatsAppInstance(fresh),
    onSuccess: (data) => queryClient.setQueryData(['whatsapp-status'], data),
    onError: (error) => {
      push({ tone: 'danger', title: getErrorMessage(error) })
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
    },
  })

  const disconnect = useMutation({
    mutationFn: logoutWhatsAppInstance,
    onSuccess: (data) => {
      setLogoutOpen(false)
      queryClient.setQueryData(['whatsapp-status'], data)
      push({ tone: 'info', title: t('whatsapp.disconnected', 'WhatsApp disconnected.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const test = useMutation({
    mutationFn: () => sendWhatsAppTest(),
    onSuccess: () =>
      push({ tone: 'success', title: t('whatsapp.testSent', 'Test message sent. Check WhatsApp on your phone.') }),
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const saved = {
    autoSend: state?.auto_send ?? true,
    template: state?.message_template || DEFAULT_WHATSAPP_TEMPLATE,
  }
  const dirty = autoSend !== saved.autoSend || template !== saved.template

  const save = useMutation({
    mutationFn: () =>
      updateWhatsAppSettings({
        auto_send: autoSend,
        message_template: template.trim() === DEFAULT_WHATSAPP_TEMPLATE.trim() ? null : template,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
      push({ tone: 'success', title: t('whatsapp.settingsSaved', 'Saved.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const preview = useMemo(
    () =>
      template
        .replace(/\{customer_name\}/g, 'Marta Rivas')
        .replace(/\{document_type\}/g, 'Invoice')
        .replace(/\{document_number\}/g, 'F-2026/0185')
        .replace(/\{total_amount\}/g, formatCents(41250, currency))
        .replace(/\{company_name\}/g, company?.name ?? t('whatsapp.your_company', 'Your company')),
    [template, currency, company?.name],
  )

  const pill = statusPill(status)
  const starting = connect.isPending || status === 'connecting'

  return (
    <div className="flex max-w-3xl flex-col gap-5 p-5 sm:p-6">
      {/* The connection */}
      <section className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25d366] text-white">
              <MessageCircle className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink">{t('whatsapp.title', 'Your WhatsApp')}</h2>
              <p className="truncate text-xs text-ink-muted">
                {t('whatsapp.subtitle', 'Send invoices and quotes to customers from your own number.')}
              </p>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1', PILL[pill.tone])}>
            {pill.label}
          </span>
        </header>

        <div className="p-5">
          {statusQuery.isPending ? (
            <div className="flex items-center gap-2.5 py-6 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading')}
            </div>
          ) : unavailable ? (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 app-dark:border-amber-500/30 app-dark:bg-amber-500/10">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CloudOff className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-950 app-dark:text-amber-100">
                  {status === 'service_misconfigured'
                    ? t('whatsapp.notSetUp', 'WhatsApp is not set up correctly on the server')
                    : t('whatsapp.tempUnavailable', 'WhatsApp is not available right now')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/80 app-dark:text-amber-200/80">
                  {status === 'service_misconfigured'
                    ? t('whatsapp.contactSupport', 'Please contact support and we will fix it for you.')
                    : t('whatsapp.tryAgainSoon', 'This is on our side, not yours. Try again in a minute.')}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw className={cn('h-3.5 w-3.5', statusQuery.isFetching && 'animate-spin')} />}
                onClick={() => void statusQuery.refetch()}
              >
                {t('whatsapp.tryAgain', 'Try again')}
              </Button>
            </div>
          ) : status === 'connected' ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 app-dark:border-emerald-500/30 app-dark:bg-emerald-500/10">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase app-dark:text-emerald-300">
                    {t('whatsapp.linkedAs', 'Linked as')}
                  </p>
                  <p className="truncate text-lg font-bold text-emerald-950 app-dark:text-emerald-50">
                    {state?.connected_phone ? `+${state.connected_phone}` : t('whatsapp.yourNumber', 'Your number')}
                  </p>
                  {state?.connected_name ? (
                    <p className="truncate text-xs text-emerald-800/80 app-dark:text-emerald-200/80">{state.connected_name}</p>
                  ) : null}
                </div>
              </div>
              <p className="text-sm text-ink-muted">
                {t('whatsapp.connectedBody', 'Documents are sent from this number. Customers see it as a normal WhatsApp message.')}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="secondary"
                  icon={<Send className="h-4 w-4" />}
                  loading={test.isPending}
                  onClick={() => test.mutate()}
                >
                  {t('whatsapp.testMe', 'Send a test to myself')}
                </Button>
                <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={() => setLogoutOpen(true)}>
                  {t('whatsapp.disconnectBtn', 'Disconnect')}
                </Button>
              </div>
            </div>
          ) : status === 'qrcode' && state?.qrcode ? (
            <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
              <div className="mx-auto w-[260px] rounded-2xl border border-line bg-white p-3 shadow-xs">
                <img src={state.qrcode} alt={t('whatsapp.qrAlt', 'WhatsApp QR code')} className="block h-auto w-full" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">{t('whatsapp.scanTitle', 'Scan this code with your phone')}</h3>
                <ol className="mt-4 flex flex-col gap-3.5">
                  <Step n={1}>{t('whatsapp.step1', 'Open WhatsApp on your phone.')}</Step>
                  <Step n={2}>{t('whatsapp.step2', 'Tap Settings, then Linked devices, then Link a device.')}</Step>
                  <Step n={3}>{t('whatsapp.step3', 'Point the camera at this code. That is all.')}</Step>
                </ol>
                <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  {t('whatsapp.waitingHint', 'Waiting for you to scan. The code refreshes by itself.')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className={cn('h-3.5 w-3.5', connect.isPending && 'animate-spin')} />}
                    disabled={connect.isPending}
                    onClick={() => connect.mutate(true)}
                  >
                    {t('whatsapp.newCode', 'Get a new code')}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            </div>
          ) : starting ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold text-ink">{t('whatsapp.preparing', 'Getting your code ready…')}</p>
              <p className="text-xs text-ink-muted">{t('whatsapp.preparingHint', 'This takes a few seconds.')}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <h3 className="text-base font-bold text-ink">{t('whatsapp.offerTitle', 'Link your WhatsApp in a minute')}</h3>
                <ul className="mt-3 flex flex-col gap-2.5">
                  <Benefit icon={Send}>{t('whatsapp.benefit1', 'Send an invoice or quote as a PDF straight from the sale.')}</Benefit>
                  <Benefit icon={Zap}>{t('whatsapp.benefit2', 'Optional: send automatically the moment a document is issued.')}</Benefit>
                  <Benefit icon={ShieldCheck}>{t('whatsapp.benefit3', 'It uses your own number. Nobody else can use your link.')}</Benefit>
                </ul>
              </div>
              <Button
                size="lg"
                variant="success"
                icon={<Smartphone className="h-5 w-5" />}
                loading={connect.isPending}
                onClick={() => connect.mutate(false)}
              >
                {t('whatsapp.connectBtn', 'Connect WhatsApp')}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* What gets sent */}
      <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">{t('whatsapp.autoTitle', 'Send automatically')}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              {t('whatsapp.autoBody', 'When you issue a document and the customer has a phone number, it goes to their WhatsApp on its own.')}
            </p>
          </div>
          <Toggle checked={autoSend} onChange={setAutoSend} id="wa-auto" />
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="wa-template" className="text-sm font-semibold text-ink">
              {t('whatsapp.messageLabel', 'Message')}
            </label>
            {template !== DEFAULT_WHATSAPP_TEMPLATE ? (
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-500"
                onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
              >
                {t('whatsapp.useDefault', 'Use the standard message')}
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <Textarea
                id="wa-template"
                rows={9}
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                className="text-sm leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink-muted">{t('whatsapp.insert', 'Insert:')}</span>
                {TAGS.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    title={item.tag}
                    onClick={() => setTemplate((current) => `${current}${current.endsWith(' ') || current.endsWith('\n') || current === '' ? '' : ' '}${item.tag}`)}
                    className="cursor-pointer rounded-full border border-line bg-page px-2.5 py-1 text-[11px] font-medium text-ink hover:border-brand-500/40 hover:bg-card"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                {t('whatsapp.preview', 'How it looks')}
              </p>
              <div className="rounded-2xl bg-[#e7ddd3] p-3 app-dark:bg-[#1d2b24]">
                <div className="ml-auto max-w-[92%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap text-[#111b21] shadow-xs">
                  <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-white/60 px-2.5 py-2 text-xs font-medium">
                    <span className="inline-flex h-7 w-6 items-center justify-center rounded bg-rose-500 text-[8px] font-bold text-white">PDF</span>
                    F-2026/0185.pdf
                  </div>
                  <WhatsAppText text={preview} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {dirty ? <span className="text-xs text-ink-muted">{t('whatsapp.unsaved', 'You have unsaved changes')}</span> : null}
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => disconnect.mutate()}
        loading={disconnect.isPending}
        tone="warning"
        title={t('whatsapp.disconnectTitle', 'Disconnect your WhatsApp?')}
        description={t(
          'whatsapp.disconnectBody',
          'Documents will stop going out on WhatsApp until you link a number again. Nothing is deleted.',
        )}
        confirmLabel={t('whatsapp.disconnectBtn', 'Disconnect')}
      />
    </div>
  )
}

export default WhatsAppTab
