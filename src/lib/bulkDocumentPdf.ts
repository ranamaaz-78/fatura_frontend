import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type { Company } from '../types/module01'
import { getSale } from '../services/sales'
import { t } from '../i18n'
import { createSaleSheetRenderer } from './exportSaleSheet'
import type { SaleDocument } from '../types/sales'
import { triggerBlobDownload } from './downloadSheetImage'
import { saleFileName } from './exportSaleSheet'

export type BulkProgress = { done: number; total: number }

type BulkOptions = {
  ids: number[]
  company: Company | null
  currency: string
  /** Name of the file that is downloaded, without the extension (see downloadFileName). */
  fileName: string
  onProgress?: (progress: BulkProgress) => void
  signal?: AbortSignal
}

export class BulkCancelled extends Error {
  constructor() {
    super(t('reportDownloads.cancelled', 'Cancelled.'))
  }
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new BulkCancelled()
}

/**
 * Prints the documents one after the other (one A4 sheet each, exactly as the single download does) and hands every
 * sheet to `add` together with the document number.
 */
async function eachSheet(options: BulkOptions, add: (sheet: string, sale: SaleDocument, index: number) => void): Promise<void> {
  const renderer = await createSaleSheetRenderer(options.company, options.currency)
  try {
    for (let index = 0; index < options.ids.length; index += 1) {
      checkCancelled(options.signal)
      const sale = await getSale(options.ids[index])
      checkCancelled(options.signal)
      add(await renderer.render(sale), sale, index)
      options.onProgress?.({ done: index + 1, total: options.ids.length })
    }
  } finally {
    renderer.dispose()
  }
}

function newPdf(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
}

/** One PDF per document, all inside one ZIP. */
export async function downloadDocumentsZip(options: BulkOptions): Promise<void> {
  const zip = new JSZip()
  const used = new Set<string>()

  await eachSheet(options, (sheet, sale) => {
    const pdf = newPdf()
    pdf.addImage(sheet, 'PNG', 0, 0, 210, 297, undefined, 'FAST')

    // Inside the zip each file is named like a single download: Company - Invoice F-202610-00002 - 2026-10-19.pdf
    let name = saleFileName(sale, options.company, 'pdf')
    for (let copy = 2; used.has(name); copy += 1) name = saleFileName({ ...sale, number: `${sale.number} (${copy})` }, options.company, 'pdf')
    used.add(name)
    zip.file(name, pdf.output('arraybuffer'))
  })

  checkCancelled(options.signal)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  triggerBlobDownload(`${options.fileName}.zip`, blob)
}

/** Every document on its own page of one PDF. */
export async function downloadDocumentsPdf(options: BulkOptions): Promise<void> {
  const pdf = newPdf()

  await eachSheet(options, (sheet, _sale, index) => {
    if (index > 0) pdf.addPage('a4', 'portrait')
    pdf.addImage(sheet, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
  })

  checkCancelled(options.signal)
  triggerBlobDownload(`${options.fileName}.pdf`, pdf.output('blob'))
}
