import { createRoot } from 'react-dom/client'
import type { Company } from '../types/module01'
import type { SaleDocument } from '../types/sales'
import { PrintSheet } from '../pages/app/printSheets'
import { A4_CSS_HEIGHT, A4_CSS_WIDTH, downloadSheetImage, downloadSheetPdf, sheetFileName } from './downloadSheetImage'

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

export async function downloadSaleDocumentSheet(
  sale: SaleDocument,
  company: Company | null,
  currency: string,
  format: 'png' | 'pdf',
): Promise<void> {
  const host = window.document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${A4_CSS_WIDTH}px`,
    `height:${A4_CSS_HEIGHT}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:-1',
  ].join(';')
  window.document.body.appendChild(host)

  const root = createRoot(host)
  root.render(<PrintSheet document={sale} company={company} currency={currency} />)

  try {
    if (window.document.fonts?.ready) {
      await window.document.fonts.ready
    }
    await waitForPaint()
    const node = host.querySelector('article')
    if (!(node instanceof HTMLElement)) {
      throw new Error('The document sheet is not on the page.')
    }
    if (format === 'pdf') {
      await downloadSheetPdf(sheetFileName(sale.number, 'pdf'), node)
    } else {
      await downloadSheetImage(sheetFileName(sale.number), node)
    }
  } finally {
    root.unmount()
    host.remove()
  }
}
