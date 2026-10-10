import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Printer } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Logo } from '../../components/brand/Logo'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { ensurePrintFonts } from '../../lib/printFonts'
import { getPublicInvoice } from '../../services/invoiceVerification'
import { PrintSheet } from '../app/printSheets'

/** The sheet is laid out at A4 width; on a narrow screen it is shrunk to fit instead of scrolling sideways. */
const SHEET_WIDTH = 794
const SHEET_HEIGHT = 1123

/** The whole invoice, as printed, for whoever scanned its QR. */
export default function PublicInvoicePage() {
  const { code = '' } = useParams()
  const query = useQuery({ queryKey: ['public-invoice', code], queryFn: () => getPublicInvoice(code), retry: false })
  const data = query.data

  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    function fit() {
      const width = frame.current?.clientWidth ?? SHEET_WIDTH
      setScale(Math.min(1, width / SHEET_WIDTH))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [data])

  useEffect(() => {
    if (data) ensurePrintFonts(data.template.font_key)
  }, [data])

  return (
    <div className="min-h-screen bg-[#eef2fb] text-[#0b1c30] print:bg-white">
      <header className="mx-auto flex w-full max-w-[860px] items-center justify-between gap-3 px-4 pt-5 print:hidden">
        <Link to={`/verify/${code}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#434655] hover:text-[#004ac6]">
          <ChevronLeft className="h-4 w-4" />
          {t('verify.back', 'Back to verification')}
        </Link>
        <div className="flex items-center gap-3">
          <Logo on="light" className="hidden h-8 sm:block" />
          {data ? (
            <Button variant="secondary" size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              {t('verify.print', 'Print')}
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-3 py-5 print:p-0">
        {query.isPending ? (
          <Skeleton className="mx-auto h-[600px] w-full max-w-[794px] rounded-lg" />
        ) : !data ? (
          <p className="py-20 text-center text-[15px] text-[#434655]">
            {t('verify.missing', 'Invoice not found')}
          </p>
        ) : (
          <div ref={frame} className="mx-auto w-full max-w-[794px]">
            <div style={{ height: SHEET_HEIGHT * scale }} className="relative print:!h-auto">
              <div
                style={{ width: SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
                className="absolute top-0 left-0 print:!static print:!transform-none"
              >
                <PrintSheet
                  document={data.document}
                  company={data.company}
                  currency={data.company.currency}
                  theme={data.template}
                  logoSrc={data.logo}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
