import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { t } from '../../i18n'

type VoidSaleModalProps = {
  open: boolean
  loading?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function VoidSaleModal({ open, loading = false, onClose, onConfirm }: VoidSaleModalProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  const trimmed = reason.trim()
  const ready = trimmed.length >= 3

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sales.voidTitle', 'Why is this being voided?')}
      subtitle={t(
        'sales.voidSubtitle',
        'The items go back into stock. This cannot be undone.',
      )}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!ready}
            onClick={() => ready && onConfirm(trimmed)}
          >
            {t('sales.voidConfirm', 'Void document')}
          </Button>
        </>
      }
    >
      <Textarea
        required
        compact
        rows={4}
        maxLength={500}
        label={t('sales.voidReason', 'Reason')}
        hint={t('sales.voidReasonHint', 'At least 3 characters. This stays on the document.')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  )
}
