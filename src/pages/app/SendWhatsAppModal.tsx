import { useMutation, useQuery } from '@tanstack/react-query'
import { FileText, Send, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { generateSaleDocumentPdfBase64 } from '../../lib/exportSaleSheet'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getWhatsAppStatus, sendWhatsAppDocument } from '../../services/whatsapp'
import type { Company } from '../../types/module01'
import type { SaleDocument } from '../../types/sales'
import { DEFAULT_WHATSAPP_TEMPLATE } from './WhatsAppTab'

export type SendWhatsAppModalProps = {
  open: boolean
  onClose: () => void
  document: SaleDocument
  company: Company | null
  currency: string
}

/** The message as the customer will read it: the saved wording with this document's details filled in. */
function fillTemplate(template: string, document: SaleDocument, company: Company | null, currency: string): string {
  const type = document.type.charAt(0).toUpperCase() + document.type.slice(1)

  return template
    .replace(/\{customer_name\}/g, document.client_name || 'Customer')
    .replace(/\{document_type\}/g, type)
    .replace(/\{document_number\}/g, document.number)
    .replace(/\{total_amount\}/g, formatCents(document.total_cents, currency))
    .replace(/\{company_name\}/g, company?.name || 'YK Digital Solutions')
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
    setCaption(fillTemplate(statusQuery.data?.message_template || DEFAULT_WHATSAPP_TEMPLATE, document, company, currency))
  }, [open, document, company, currency, statusQuery.data?.message_template])

  const send = useMutation({
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
        title: `${t('whatsapp.sentTo', 'Sent to')} +${data.recipient} ${t('whatsapp.onWhatsapp', 'on WhatsApp')}`,
      })
      onClose()
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const connected = statusQuery.data?.status === 'connected'
  const busy = send.isPending || generating

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('whatsapp.sendDocTitle', 'Send on WhatsApp')}
      subtitle={`${document.number} · ${document.client_name}`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="success"
            icon={<Send className="h-4 w-4" />}
            loading={busy}
            disabled={!phone.trim() || !connected}
            onClick={() => send.mutate()}
          >
            {generating ? t('whatsapp.renderingPdf', 'Preparing the PDF…') : t('whatsapp.sendNow', 'Send')}
          </Button>
        </>
      }
    >
      {statusQuery.data && !connected ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 app-dark:border-amber-500/30 app-dark:bg-amber-500/10 app-dark:text-amber-200">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{t('whatsapp.notLinkedTitle', 'Your WhatsApp is not linked yet')}</p>
            <p className="mt-0.5 text-xs">
              {t('whatsapp.notLinkedBody', 'Link it once and you can send documents from here.')}{' '}
              <Link to="/app/settings?tab=whatsapp" className="font-semibold underline" onClick={onClose}>
                {t('whatsapp.linkNow', 'Link WhatsApp')}
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Input
          label={t('whatsapp.recipientPhone', 'Customer WhatsApp number')}
          hint={t('whatsapp.phoneHint', 'With the country code, for example +34 612 345 678.')}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={busy}
        />
        <Textarea
          label={t('whatsapp.captionLabel', 'Message')}
          rows={6}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          disabled={busy}
        />
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-page/70 px-3.5 py-2.5 text-sm">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{document.number}.pdf</span>
            <span className="block text-[11px] text-ink-muted">{t('whatsapp.attachment', 'Attached as a PDF')}</span>
          </span>
        </div>
      </div>
    </Modal>
  )
}

export default SendWhatsAppModal
