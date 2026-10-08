import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { typeLabel } from './documentTypes'
import { downloadSaleDocumentSheet } from '../../lib/exportSaleSheet'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getWhatsAppSettings } from '../../services/whatsapp'
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
  const type = typeLabel(document.type)

  return template
    .replace(/\{customer_name\}/g, document.client_name || t('sales.customer_fallback', 'Customer'))
    .replace(/\{document_type\}/g, type)
    .replace(/\{document_number\}/g, document.number)
    .replace(/\{total_amount\}/g, formatCents(document.total_cents, currency))
    .replace(/\{company_name\}/g, company?.name || t('brand.name', 'YK Digital Solutions'))
}

/** wa.me only takes digits, with the country code and no "+" or spaces. */
function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D+/g, '')}?text=${encodeURIComponent(message)}`
}

export function SendWhatsAppModal({ open, onClose, document, company, currency }: SendWhatsAppModalProps) {
  const { push } = useToast()
  const [phone, setPhone] = useState(document.client_phone ?? '')
  const [caption, setCaption] = useState('')

  const settings = useQuery({ queryKey: ['whatsapp-settings'], queryFn: getWhatsAppSettings, enabled: open })

  useEffect(() => {
    if (!open) return
    setPhone(document.client_phone ?? '')
    setCaption(fillTemplate(settings.data?.message_template || DEFAULT_WHATSAPP_TEMPLATE, document, company, currency))
  }, [open, document, company, currency, settings.data?.message_template])

  const pdf = useMutation({
    mutationFn: () => downloadSaleDocumentSheet(document, company, currency, 'pdf'),
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const digits = phone.replace(/\D+/g, '')

  function openWhatsApp() {
    window.open(whatsappUrl(phone, caption.trim()), '_blank', 'noreferrer')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('whatsapp.sendDocTitle', 'Send on WhatsApp')}
      subtitle={`${document.number} · ${document.client_name}`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="success" icon={<MessageCircle className="h-4 w-4" />} disabled={digits.length < 8} onClick={openWhatsApp}>
            {t('whatsapp.openChat', 'Open WhatsApp')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t('whatsapp.recipientPhone', 'Customer WhatsApp number')}
          hint={t('whatsapp.phoneHint', 'With the country code, for example +34 612 345 678.')}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <Textarea
          label={t('whatsapp.captionLabel', 'Message')}
          rows={6}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-page/70 px-3.5 py-3 text-sm">
          <span className="min-w-0 text-xs text-ink-muted">
            {t(
              'whatsapp.attachHint',
              'WhatsApp opens with this message ready. Download the PDF and attach it in the chat before you press send.',
            )}
          </span>
          <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} loading={pdf.isPending} onClick={() => pdf.mutate()}>
            {t('whatsapp.downloadPdf', 'Download PDF')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SendWhatsAppModal
