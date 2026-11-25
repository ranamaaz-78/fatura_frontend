import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { buildPaymentReceipt, buildPaymentStatement, downloadSlip, openPrintWindow, printSlip, type Slip } from '../../lib/ledgerReceipt'
import { getErrorMessage } from '../../services/api'
import { getLedgerEntry } from '../../services/ledger'

/** The theme colour as #rrggbb: the sheets are drawn away from the page, where theme variables are not known. */
function brandColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--app-primary').trim()
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#1e3a8a'
}

/** What the preview window shows: the slip being drawn (title only) or ready (with its pages). */
export type SlipPreviewState = { title: string; slip: Slip | null } | null

/**
 * The paper for supplier payments: a receipt for one payment, and a statement of everything paid on an entry, to look at
 * on screen or to save as a PDF. The entry is read again from the server first, so the paper always carries the latest
 * balance and who wrote each payment.
 */
export function useLedgerReceipts() {
  const { session } = useAuth()
  const { push } = useToast()
  const company = session?.company ?? null
  const currency = company?.currency ?? 'EUR'
  const [preview, setPreview] = useState<SlipPreviewState>(null)

  const build = useCallback(
    async (entryId: number, paymentId: number | null): Promise<Slip> => {
      const entry = await getLedgerEntry(entryId)
      const context = { company, currency, brand: brandColor() }
      return paymentId === null ? buildPaymentStatement(entry, context) : buildPaymentReceipt(entry, paymentId, context)
    },
    [company, currency],
  )

  const download = useCallback(
    async (entryId: number, paymentId: number | null) => {
      try {
        downloadSlip(await build(entryId, paymentId))
      } catch (error) {
        push({ tone: 'danger', title: getErrorMessage(error) })
      }
    },
    [build, push],
  )

  /** Prints a slip: the window opens at once (from the click) and is filled when the slip is drawn. */
  const print = useCallback(
    async (entryId: number, paymentId: number | null) => {
      const target = openPrintWindow()
      if (!target) {
        push({ tone: 'danger', title: t('labels.blocked', 'Your browser blocked the print window. Allow pop-ups and try again.') })
        return
      }
      try {
        await printSlip(target, await build(entryId, paymentId))
      } catch (error) {
        target.close()
        push({ tone: 'danger', title: getErrorMessage(error) })
      }
    },
    [build, push],
  )

  /** Opens the preview window at once (it shows a spinner) and fills it when the slip is drawn. */
  const view = useCallback(
    async (entryId: number, paymentId: number | null) => {
      setPreview({ title: paymentId === null ? t('ledger.statementTitle', 'Payment statement') : t('ledger.receiptTitle', 'Payment receipt'), slip: null })
      try {
        const slip = await build(entryId, paymentId)
        setPreview((current) => (current === null ? null : { title: slip.title, slip }))
      } catch (error) {
        setPreview(null)
        push({ tone: 'danger', title: getErrorMessage(error) })
      }
    },
    [build, push],
  )

  const receipt = useCallback((entryId: number, paymentId: number) => download(entryId, paymentId), [download])
  const statement = useCallback((entryId: number) => download(entryId, null), [download])
  const viewReceipt = useCallback((entryId: number, paymentId: number) => view(entryId, paymentId), [view])
  const viewStatement = useCallback((entryId: number) => view(entryId, null), [view])
  const printStatement = useCallback((entryId: number) => print(entryId, null), [print])

  /** "Payment saved." with a button that downloads that payment's receipt. */
  const saved = useCallback(
    (title: string, entryId: number, paymentId: number | undefined) => {
      push({
        tone: 'success',
        title,
        ...(paymentId !== undefined ? { actionLabel: t('ledger.downloadReceipt', 'Download receipt'), onAction: () => void receipt(entryId, paymentId) } : {}),
      })
    },
    [push, receipt],
  )

  return { receipt, statement, viewReceipt, viewStatement, printStatement, preview, closePreview: () => setPreview(null), saved }
}
