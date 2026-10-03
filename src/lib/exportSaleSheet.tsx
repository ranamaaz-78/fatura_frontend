import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Company } from '../types/module01'
import type { SaleDocument } from '../types/sales'
import { PrintSheetView } from '../pages/app/printSheets'
import { A4_CSS_HEIGHT, A4_CSS_WIDTH, downloadSheetImage, downloadSheetPdf, generateSheetPdfBase64, sheetFileName } from './downloadSheetImage'
import { getPrintTemplates, loadLogoBlob } from '../services/printables'
import { waitForPrintFont } from './printFonts'
import { pickPrintTemplate } from './printTheme'
import { t } from '../i18n'

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function waitForSheetNode(host: HTMLElement): Promise<HTMLElement> {
  const deadline = Date.now() + 4000
  while (Date.now() < deadline) {
    const node = host.querySelector('#printable-invoice')
    if (node instanceof HTMLElement) {
      await waitForPaint()
      return node
    }
    await new Promise((resolve) => window.setTimeout(resolve, 20))
  }
  throw new Error(t('downloadSheetImage.the_document_sheet_is_not_on_the_page', 'The document sheet is not on the page.'))
}

export async function downloadSaleDocumentSheet(
  sale: SaleDocument,
  company: Company | null,
  currency: string,
  format: 'png' | 'pdf',
): Promise<void> {
  const payload = await getPrintTemplates()
  const theme = pickPrintTemplate(payload.templates, sale.type)
  await waitForPrintFont(theme.font_key)
  const logoSrc =
    theme.show_logo && sale.type !== 'albaran'
      ? await loadLogoBlob(payload.logo_url ?? company?.logo_url ?? null)
      : null

  const host = window.document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${A4_CSS_WIDTH}px`,
    `height:${A4_CSS_HEIGHT}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:-1',
  ].join(';')
  window.document.body.appendChild(host)

  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <PrintSheetView
        document={sale}
        company={company}
        currency={currency}
        theme={theme}
        logoSrc={logoSrc}
      />,
    )
  })

  try {
    const node = await waitForSheetNode(host)
    await waitForPrintFont(theme.font_key)
    await waitForPaint()
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

export async function generateSaleDocumentPdfBase64(
  sale: SaleDocument,
  company: Company | null,
  currency: string,
): Promise<string> {
  const payload = await getPrintTemplates()
  const theme = pickPrintTemplate(payload.templates, sale.type)
  await waitForPrintFont(theme.font_key)
  const logoSrc =
    theme.show_logo && sale.type !== 'albaran'
      ? await loadLogoBlob(payload.logo_url ?? company?.logo_url ?? null)
      : null

  const host = window.document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${A4_CSS_WIDTH}px`,
    `height:${A4_CSS_HEIGHT}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:-1',
  ].join(';')
  window.document.body.appendChild(host)

  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <PrintSheetView
        document={sale}
        company={company}
        currency={currency}
        theme={theme}
        logoSrc={logoSrc}
      />,
    )
  })

  try {
    const node = await waitForSheetNode(host)
    await waitForPrintFont(theme.font_key)
    await waitForPaint()
    return await generateSheetPdfBase64(node)
  } finally {
    root.unmount()
    host.remove()
  }
}
