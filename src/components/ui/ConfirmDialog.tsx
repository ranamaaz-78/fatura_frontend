import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Modal } from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  tone?: 'danger' | 'warning'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const iconWrap =
    tone === 'danger'
      ? 'rounded-2xl bg-rose-50 p-3 text-rose-600 app-dark:bg-rose-500/15 app-dark:text-rose-300'
      : 'rounded-2xl bg-amber-50 p-3 text-amber-600 app-dark:bg-amber-500/15 app-dark:text-amber-300'

  const footer: ReactNode = (
    <>
      <Button variant="secondary" onClick={onClose} autoFocus>
        {t('common.cancel', 'Cancel')}
      </Button>
      <Button
        variant={tone === 'danger' ? 'danger' : 'primary'}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel ?? t('common.confirm', 'Confirm')}
      </Button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer} maxWidth="sm">
      <div className="flex items-start gap-4 text-left">
        <div className={cn(iconWrap)}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-sm text-ink">{description}</p>
      </div>
    </Modal>
  )
}
