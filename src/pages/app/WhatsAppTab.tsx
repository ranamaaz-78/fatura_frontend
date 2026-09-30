import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../services/api'
import {
  getWhatsAppStatus,
  initWhatsAppInstance,
  logoutWhatsAppInstance,
  sendWhatsAppTest,
  updateWhatsAppSettings,
} from '../../services/whatsapp'

const DEFAULT_TEMPLATE = `Dear {customer_name},

Please find attached your {document_type} *#{document_number}* from *{company_name}* for *{total_amount}*.

Thank you for choosing us!`

export function WhatsAppTab() {
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const company = session?.company ?? null

  const [instanceName, setInstanceName] = useState('')
  const [autoSend, setAutoSend] = useState(true)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [testPhone, setTestPhone] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)

  // Fetch live WhatsApp status & auto-poll while waiting for QR scan
  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: getWhatsAppStatus,
    refetchInterval: (query) => {
      const current = query.state.data?.status
      return current === 'qrcode' || current === 'connecting' ? 2500 : 15000
    },
  })

  // Sync settings when loaded
  useEffect(() => {
    if (statusQuery.data) {
      setAutoSend(statusQuery.data.auto_send)
      if (statusQuery.data.message_template) {
        setTemplate(statusQuery.data.message_template)
      }
      if (statusQuery.data.instance_name) {
        setInstanceName(statusQuery.data.instance_name)
      }
    }
  }, [statusQuery.data])

  const connectMutation = useMutation({
    mutationFn: () => initWhatsAppInstance(),
    onSuccess: (data) => {
      queryClient.setQueryData(['whatsapp-status'], data)
      push({
        tone: 'success',
        title: t('whatsapp.qrReady', 'QR code generated. Scan with WhatsApp on your phone.'),
      })
    },
    onError: (err) => {
      push({
        tone: 'danger',
        title: getErrorMessage(err),
      })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutWhatsAppInstance,
    onSuccess: () => {
      setLogoutOpen(false)
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
      push({
        tone: 'info',
        title: t('whatsapp.loggedOut', 'WhatsApp session disconnected.'),
      })
    },
    onError: (err) => {
      push({
        tone: 'danger',
        title: getErrorMessage(err),
      })
    },
  })

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      updateWhatsAppSettings({
        auto_send: autoSend,
        message_template: template,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] })
      push({
        tone: 'success',
        title: t('whatsapp.settingsSaved', 'WhatsApp automation settings saved.'),
      })
    },
    onError: (err) => {
      push({
        tone: 'danger',
        title: getErrorMessage(err),
      })
    },
  })

  const testMutation = useMutation({
    mutationFn: () => sendWhatsAppTest(testPhone.trim()),
    onSuccess: () => {
      push({
        tone: 'success',
        title: t('whatsapp.testSuccess', 'Test message sent successfully!'),
      })
      setTestPhone('')
    },
    onError: (err) => {
      push({
        tone: 'danger',
        title: getErrorMessage(err),
      })
    },
  })

  const isConnected = statusQuery.data?.status === 'connected'
  const isQr = !isConnected && (statusQuery.data?.status === 'qrcode' || Boolean(statusQuery.data?.qrcode))
  const isConnecting = !isConnected && !isQr && (connectMutation.isPending || statusQuery.data?.status === 'connecting')
  const serviceAlive = statusQuery.data?.service_alive !== false

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      {/* Service Offline Warning */}
      {!serviceAlive && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-amber-950">
              {t('whatsapp.serviceOffline', 'WhatsApp microservice is offline')}
            </span>
            <span>
              {t(
                'whatsapp.serviceOfflineHelp',
                'Ensure the WhatsApp service (node index.js in whatsapp_service) is running on port 3333.',
              )}
            </span>
          </div>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="rounded-2xl border border-line/80 bg-page/40 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xs',
                isConnected ? 'bg-emerald-500' : isQr || isConnecting ? 'bg-amber-500' : 'bg-slate-500',
              )}
            >
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">
                  {t('whatsapp.integrationTitle', 'WhatsApp Integration')}
                </h2>
                <Badge
                  tone={isConnected ? 'success' : isQr || isConnecting ? 'warning' : 'neutral'}
                  className="font-medium"
                >
                  {isConnected
                    ? t('whatsapp.connected', 'Connected')
                    : isQr
                      ? t('whatsapp.scanQr', 'Scan QR Code')
                      : isConnecting
                        ? t('whatsapp.connecting', 'Connecting...')
                        : t('whatsapp.disconnected', 'Disconnected')}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                {isConnected
                  ? t(
                      'whatsapp.connectedDesc',
                      'Your WhatsApp account is active and ready to deliver printable documents to customers.',
                    )
                  : t(
                      'whatsapp.disconnectedDesc',
                      'Connect your WhatsApp account to automatically dispatch invoices, quotes, albaranes, and proformas.',
                    )}
              </p>
            </div>
          </div>

          {isConnected && (
            <Button
              type="button"
              tone="danger"
              variant="outline"
              size="sm"
              onClick={() => setLogoutOpen(true)}
              className="gap-2 shrink-0"
            >
              <LogOut className="h-4 w-4" />
              {t('whatsapp.disconnect', 'Disconnect')}
            </Button>
          )}
        </div>

        {/* State 1: Connected Details */}
        {isConnected && (
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-2.5">
              <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-emerald-800 uppercase">
                  {t('whatsapp.linkedNumber', 'Linked Number')}
                </span>
                <span className="text-xs font-bold text-emerald-950">
                  +{statusQuery.data?.connected_phone || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-emerald-800 uppercase">
                  {t('whatsapp.instance', 'Instance Name')}
                </span>
                <span className="text-xs font-bold text-emerald-950">
                  {statusQuery.data?.instance_name || instanceName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="block text-[10px] font-semibold tracking-wider text-emerald-800 uppercase">
                  {t('whatsapp.accountName', 'Account Name')}
                </span>
                <span className="text-xs font-bold text-emerald-950 truncate max-w-[140px]">
                  {statusQuery.data?.connected_name || company?.name || 'Active Session'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State 2: QR Code Scanning */}
        {!isConnected && isQr && (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-line bg-card p-6 text-center">
            <div className="relative flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-3 shadow-inner">
              {statusQuery.data?.qrcode ? (
                <img
                  src={statusQuery.data.qrcode}
                  alt="WhatsApp QR Code"
                  className="h-64 w-64 rounded-xl object-contain shadow-xs bg-white p-2"
                />
              ) : (
                <div className="flex h-64 w-64 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  <span className="text-xs text-ink-muted">Generating QR code...</span>
                </div>
              )}
            </div>

            <div className="flex max-w-md flex-col gap-2">
              <h3 className="text-sm font-bold text-ink flex items-center justify-center gap-1.5">
                <QrCode className="h-4 w-4 text-brand-600" />
                {t('whatsapp.scanQrTitle', 'Scan this QR Code with WhatsApp')}
              </h3>
              <ol className="text-left text-xs text-ink-muted list-decimal list-inside space-y-1 bg-page/70 p-3 rounded-xl border border-line/60">
                <li>
                  {t('whatsapp.step1', 'Open WhatsApp on your mobile device')}
                </li>
                <li>
                  {t('whatsapp.step2', 'Tap Menu or Settings > Linked Devices')}
                </li>
                <li>
                  {t('whatsapp.step3', 'Tap Link a Device and point your phone at this screen')}
                </li>
              </ol>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="gap-1.5"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', connectMutation.isPending && 'animate-spin')} />
                {t('whatsapp.refreshQr', 'Refresh QR Code')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* State: Connecting */}
        {!isConnected && !isQr && isConnecting && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-card p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            <h3 className="text-sm font-bold text-ink">
              {t('whatsapp.generatingQr', 'Starting WhatsApp session...')}
            </h3>
            <p className="text-xs text-ink-muted">
              {t('whatsapp.waitQr', 'Generating QR code, please wait a moment.')}
            </p>
          </div>
        )}

        {/* State 3: Disconnected / Initial State */}
        {!isConnected && !isQr && !isConnecting && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="max-w-md flex flex-col gap-2">
              <label htmlFor="wa-instance" className="text-xs font-semibold text-ink">
                {t('whatsapp.instanceNameLabel', 'WhatsApp Instance Name')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="wa-instance"
                  value={instanceName}
                  readOnly
                  className="font-mono text-xs"
                  disabled
                />
                <Button
                  type="button"
                  tone="brand"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="gap-2 shrink-0"
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {t('whatsapp.connectBtn', 'Connect WhatsApp')}
                </Button>
              </div>
              <span className="text-[11px] text-ink-muted">
                {t(
                  'whatsapp.instanceHint',
                  'A unique identifier for your WhatsApp connection (letters, numbers, underscores).',
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Automation Rules & Template */}
      <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
        <h3 className="text-sm font-bold text-ink">
          {t('whatsapp.automationTitle', 'Document Dispatch Settings')}
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {t(
            'whatsapp.automationDesc',
            'Configure automatic document delivery when invoices, quotes, albaranes, and proformas are created.',
          )}
        </p>

        <div className="mt-4 flex flex-col gap-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink">
                {t(
                  'whatsapp.autoSendOnCreate',
                  'Automatically send PDF via WhatsApp upon document creation',
                )}
              </span>
              <span className="text-[11px] text-ink-muted">
                {t(
                  'whatsapp.autoSendHelp',
                  'When a new Factura, Albarán, Quotation, or Proforma is issued, it will immediately be sent to the customer if their phone number is on WhatsApp.',
                )}
              </span>
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="wa-template" className="text-xs font-semibold text-ink">
                {t('whatsapp.messageTemplate', 'Message Caption Template')}
              </label>
              <button
                type="button"
                onClick={() => setTemplate(DEFAULT_TEMPLATE)}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                {t('whatsapp.resetDefault', 'Reset to default')}
              </button>
            </div>

            <Textarea
              id="wa-template"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="text-xs font-sans leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
              <span className="font-semibold">{t('whatsapp.availableTags', 'Available tags:')}</span>
              {[
                '{customer_name}',
                '{document_type}',
                '{document_number}',
                '{total_amount}',
                '{company_name}',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTemplate((prev) => `${prev} ${tag}`)}
                  className="rounded-md border border-line bg-page px-1.5 py-0.5 font-mono text-[10px] text-ink hover:bg-card"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              tone="brand"
              size="sm"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="gap-2"
            >
              {saveSettingsMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('common.save', 'Save Settings')}
            </Button>
          </div>
        </div>
      </div>

      {/* Test Message Card */}
      {isConnected && (
        <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
          <h3 className="text-sm font-bold text-ink">
            {t('whatsapp.testTitle', 'Send a Test Message')}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t(
              'whatsapp.testDesc',
              'Send a quick test message to any WhatsApp phone number to verify your connection.',
            )}
          </p>

          <div className="mt-4 flex max-w-md gap-2">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. +34612345678 or +923001234567"
              className="text-xs"
              disabled={testMutation.isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !testPhone.trim()}
              className="gap-1.5 shrink-0"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t('whatsapp.sendTest', 'Send Test')}
            </Button>
          </div>
        </div>
      )}

      {/* Disconnect Dialog */}
      <ConfirmDialog
        open={logoutOpen}
        title={t('whatsapp.disconnectConfirmTitle', 'Disconnect WhatsApp Session?')}
        description={t(
          'whatsapp.disconnectConfirmDesc',
          'Automated WhatsApp messages will be paused until you link your WhatsApp again.',
        )}
        confirmLabel={t('whatsapp.disconnect', 'Disconnect')}
        tone="danger"
        confirming={logoutMutation.isPending}
        onConfirm={() => logoutMutation.mutate()}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  )
}
export default WhatsAppTab

