import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { generateSaleDocumentPdfBase64 } from '../../lib/exportSaleSheet'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getWhatsAppStatus, sendWhatsAppDocument } from '../../services/whatsapp'
import type { Company } from '../../types/module01'
import type { SaleDocument } from '../../types/sales'

export type SendWhatsAppModalProps = {
  open: boolean
  onClose: () => void
  document: SaleDocument
  company: Company | null
  currency: string
}

export function SendWhatsAppModal({ open, onClose, document, company, currency }: SendWhatsAppModalProps) {
  const { push } = useToast()
  const [phone, setPhone] = useState(document.client_phone ?? '')
  const [caption, setCaption] = useState('')
  const [generating, setGenerating] = useState(false)

  const statusQuery = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: getWhatsAppStatus,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setPhone(document.client_phone ?? '')

    const tmpl = statusQuery.data?.message_template
    const docType = document.type.charAt(0).toUpperCase() + document.type.slice(1)
    const totalStr = formatCents(document.total_cents, currency)
    const compName = company?.name || 'Fatura'
    const custName = document.client_name || 'Customer'

    if (tmpl) {
      const msg = tmpl
        .replace(/\{customer_name\}/g, custName)
        .replace(/\{document_type\}/g, docType)
        .replace(/\{document_number\}/g, document.number)
        .replace(/\{total_amount\}/g, totalStr)
        .replace(/\{company_name\}/g, compName)
      setCaption(msg)
    } else {
      setCaption(
        `Dear ${custName},\n\nPlease find attached your ${docType} *#${document.number}* from *${compName}* for *${totalStr}*.\n\nThank you for choosing us!`,
      )
    }
  }, [open, document, company, currency, statusQuery.data])

  const sendMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true)
      try {
        const fileBase64 = await generateSaleDocumentPdfBase64(document, company, currency)
        return await sendWhatsAppDocument({
          sale_id: document.id,
          number: phone.trim(),
          fileBase64,
          filename: `${document.number}.pdf`,
          caption: caption.trim(),
        })
      } finally {
        setGenerating(false)
      }
    },
    onSuccess: (data) => {
      push({
        tone: 'success',
        title: t('whatsapp.sentSuccess', `Document #${document.number} sent to ${data.recipient} via WhatsApp!`),
      })
      onClose()
    },
    onError: (err) => {
      push({
        tone: 'danger',
        title: getErrorMessage(err),
      })
    },
  })

  if (!open) return null

  const isConnected = statusQuery.data?.status === 'connected'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink">
                {t('whatsapp.sendDocTitle', 'Send Document via WhatsApp')}
              </h3>
              <p className="text-[11px] text-ink-muted">
                {document.number} • {document.client_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-muted hover:bg-page hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isConnected && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <span className="font-semibold block">{t('whatsapp.notConnectedWarn', 'WhatsApp not linked')}</span>
            <span>
              {t(
                'whatsapp.connectInSettingsHelp',
                'Please link your WhatsApp account in Settings > WhatsApp to send documents directly.',
              )}
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="wa-recipient-phone" className="text-xs font-semibold text-ink">
              {t('whatsapp.recipientPhone', 'Recipient WhatsApp Number')}
            </label>
            <Input
              id="wa-recipient-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +34612345678 or +923001234567"
              className="text-xs"
              disabled={sendMutation.isPending || generating}
            />
            <span className="text-[10px] text-ink-muted">
              {t('whatsapp.phoneHint', 'Include country code (e.g. +34 or +92).')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="wa-caption-msg" className="text-xs font-semibold text-ink">
              {t('whatsapp.captionLabel', 'Message Caption')}
            </label>
            <Textarea
              id="wa-caption-msg"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="text-xs leading-relaxed"
              disabled={sendMutation.isPending || generating}
            />
          </div>

          <div className="rounded-xl border border-line bg-page/70 p-3 text-[11px] text-ink-muted flex items-center justify-between">
            <span>{t('whatsapp.attachment', 'Attachment:')}</span>
            <span className="font-mono font-medium text-ink">{document.number}.pdf</span>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={sendMutation.isPending || generating}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            tone="brand"
            size="sm"
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || generating || !phone.trim() || !isConnected}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {sendMutation.isPending || generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {generating
              ? t('whatsapp.renderingPdf', 'Generating PDF...')
              : sendMutation.isPending
                ? t('whatsapp.sending', 'Sending...')
                : t('whatsapp.sendNow', 'Send PDF via WhatsApp')}
          </Button>
        </div>
      </div>
    </div>
  )
}
export default SendWhatsAppModal

