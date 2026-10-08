import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { getWhatsAppSettings, updateWhatsAppSettings } from '../../services/whatsapp'

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

/** The wording of the message that opens in the owner's WhatsApp when a document is sent to a customer. */
export function WhatsAppTab() {
  const { session } = useAuth()
  const { push } = useToast()
  const queryClient = useQueryClient()
  const company = session?.company ?? null
  const currency = company?.currency ?? 'EUR'

  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE)
  const loaded = useRef(false)

  const settings = useQuery({ queryKey: ['whatsapp-settings'], queryFn: getWhatsAppSettings })

  // Fill the form once from what is saved.
  useEffect(() => {
    if (!settings.data || loaded.current) return
    loaded.current = true
    setTemplate(settings.data.message_template || DEFAULT_WHATSAPP_TEMPLATE)
  }, [settings.data])

  const saved = settings.data?.message_template || DEFAULT_WHATSAPP_TEMPLATE
  const dirty = template !== saved

  const save = useMutation({
    mutationFn: () =>
      updateWhatsAppSettings({
        message_template: template.trim() === DEFAULT_WHATSAPP_TEMPLATE.trim() ? null : template,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
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

  if (settings.isPending) {
    return (
      <div className="flex items-center gap-2.5 p-6 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.loading', 'Loading')}
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5 p-5 sm:p-6">
      <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
        <h3 className="text-base font-bold text-ink">{t('whatsapp.wordingTitle', 'WhatsApp message')}</h3>
        <p className="mt-0.5 mb-5 text-xs text-ink-muted">
          {t(
            'whatsapp.wordingBody',
            'This is the message that opens in your WhatsApp when you send a document to a customer. You can change it before sending.',
          )}
        </p>

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
                  onClick={() =>
                    setTemplate((current) => `${current}${current.endsWith(' ') || current.endsWith('\n') || current === '' ? '' : ' '}${item.tag}`)
                  }
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
                <WhatsAppText text={preview} />
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
    </div>
  )
}

export default WhatsAppTab
