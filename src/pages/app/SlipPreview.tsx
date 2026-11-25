import { FileDown, Loader2, Printer } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { downloadSlip, openPrintWindow, printSlip } from '../../lib/ledgerReceipt'
import type { SlipPreviewState } from './ledgerReceipts'

/** A receipt or payment statement on screen, page by page, with buttons to print it or save it as a PDF. */
export function SlipPreview({ preview, onClose }: { preview: SlipPreviewState; onClose: () => void }) {
  const slip = preview?.slip ?? null
  const { push } = useToast()

  function print() {
    if (!slip) return
    const target = openPrintWindow()
    if (!target) {
      push({ tone: 'danger', title: t('labels.blocked', 'Your browser blocked the print window. Allow pop-ups and try again.') })
      return
    }
    void printSlip(target, slip)
  }

  return (
    <Modal
      open={preview !== null}
      onClose={onClose}
      maxWidth="4xl"
      title={preview?.title ?? ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close', 'Close')}
          </Button>
          <Button variant="secondary" icon={<Printer className="h-4 w-4" />} disabled={slip === null} onClick={print}>
            {t('sales.print', 'Print')}
          </Button>
          <Button icon={<FileDown className="h-4 w-4" />} disabled={slip === null} onClick={() => slip && downloadSlip(slip)}>
            {t('ledger.downloadPdf', 'Download PDF')}
          </Button>
        </>
      }
    >
      {slip === null ? (
        <div className="flex h-80 flex-col items-center justify-center gap-3 text-sm text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          {t('ledger.preparing', 'Preparing…')}
        </div>
      ) : (
        <div className="-mx-1 flex max-h-[70vh] flex-col items-center gap-4 overflow-y-auto rounded-xl bg-page p-4">
          {slip.pages.map((page, index) => (
            <img
              key={index}
              src={page}
              alt={`${slip.title} · ${index + 1}`}
              className="w-full max-w-[720px] rounded-md bg-white shadow-[0_8px_30px_-12px_rgb(15_23_42/0.35)] ring-1 ring-black/5"
            />
          ))}
        </div>
      )}
    </Modal>
  )
}
