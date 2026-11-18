import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { t } from '../../i18n'
import { downloadSlip } from '../../lib/ledgerReceipt'
import type { SlipPreviewState } from './ledgerReceipts'

/** A receipt or payment statement on screen, page by page, with a button to save it as a PDF. */
export function SlipPreview({ preview, onClose }: { preview: SlipPreviewState; onClose: () => void }) {
  const slip = preview?.slip ?? null

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
