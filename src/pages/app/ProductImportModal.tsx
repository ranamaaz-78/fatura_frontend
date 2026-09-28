import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '../../components/ui/Button'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Stepper } from '../../components/ui/Stepper'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { parseAmountToCents, parseNumber } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { importProducts } from '../../services/catalog'
import type { ImportRow, ImportRowError } from '../../types/catalog'
import {
  autoMapColumns,
  FIELD_LABELS,
  IMPORT_FIELDS,
  REQUIRED_FIELDS,
  type ColumnMap,
  type ImportField,
} from './importMapping'
import { isAxiosError } from 'axios'

type Step = 'upload' | 'map' | 'preview'

type GridRow = Record<ImportField, string>

const CELL_WIDTH: Record<ImportField, string> = {
  sr_number: 'w-28',
  article: 'w-44',
  description: 'w-32',
  category: 'w-28',
  supplier: 'w-32',
  brand: 'w-24',
  image_code: 'w-24',
  barcode: 'w-32',
  quantity: 'w-14',
  minimum_stock: 'w-14',
  buying_price: 'w-24',
  iva_percent: 'w-14',
  selling_price: 'w-24',
}

function readSheet(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const first = workbook.SheetNames[0]
    if (!first) throw new Error('empty workbook')

    const matrix = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[first], {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    })

    const [headerRow = [], ...body] = matrix
    return {
      headers: headerRow.map((cell) => String(cell ?? '').trim()),
      rows: body.filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')),
    }
  })
}

/** Problems that keep a row out of the catalog, in the user's words. */
function rowProblems(row: GridRow, index: number, all: GridRow[]): string[] {
  const problems: string[] = []

  if (row.article.trim() === '') problems.push(t('import.needArticle', 'Article is missing'))

  const buying = parseAmountToCents(row.buying_price)
  const selling = parseAmountToCents(row.selling_price)
  const iva = parseNumber(row.iva_percent) ?? 0

  if (buying === null || buying < 0) {
    problems.push(t('import.badBuying', 'Buying price is not a number'))
  }
  if (selling === null || selling < 0) {
    problems.push(t('import.badSelling', 'Selling price is not a number'))
  } else if (buying !== null && selling <= buying) {
    problems.push(t('products.sellingAbove', 'Selling price must be higher than the buying price.'))
  }
  if (iva < 0 || iva > 100) {
    problems.push(t('import.badPercent', 'IVA is out of range'))
  }

  for (const key of ['quantity', 'minimum_stock'] as const) {
    const value = parseNumber(row[key])
    if (value === null || value < 0 || !Number.isInteger(value)) {
      problems.push(`${FIELD_LABELS[key]} ${t('import.mustBeWhole', 'must be a whole number')}`)
    }
  }

  for (const key of ['barcode', 'sr_number'] as const) {
    const value = row[key].trim()
    if (value === '') continue
    const twin = all.findIndex((other, position) => position !== index && other[key].trim() === value)
    if (twin >= 0) {
      problems.push(`${FIELD_LABELS[key]} ${t('import.repeated', 'is repeated in the file')}`)
    }
  }

  return problems
}

function toImportRow(row: GridRow): ImportRow {
  const buying = parseAmountToCents(row.buying_price) ?? 0
  return {
    sr_number: row.sr_number.trim() || null,
    article: row.article.trim(),
    description: row.description.trim() || null,
    category: row.category.trim() || null,
    supplier: row.supplier.trim() || null,
    brand: row.brand.trim() || null,
    image_code: row.image_code.trim() || null,
    barcode: row.barcode.trim() || null,
    quantity: Math.round(parseNumber(row.quantity) ?? 0),
    minimum_stock: Math.round(parseNumber(row.minimum_stock) ?? 0),
    buying_price: buying,
    iva_percent: parseNumber(row.iva_percent) ?? 0,
    selling_price: parseAmountToCents(row.selling_price) ?? 0,
  }
}

export type ProductImportModalProps = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ProductImportModal({ open, onClose, onImported }: ProductImportModalProps) {
  const { push } = useToast()
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [sheetRows, setSheetRows] = useState<string[][]>([])
  const [map, setMap] = useState<ColumnMap | null>(null)
  const [grid, setGrid] = useState<GridRow[]>([])
  const [serverErrors, setServerErrors] = useState<Record<number, string[]>>({})
  const [readError, setReadError] = useState('')

  function reset() {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setSheetRows([])
    setMap(null)
    setGrid([])
    setServerErrors({})
    setReadError('')
  }

  function close() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setReadError('')
    try {
      const sheet = await readSheet(file)
      if (sheet.rows.length === 0) {
        setReadError(t('import.emptyFile', 'That sheet has a header row but no products.'))
        return
      }
      setFileName(file.name)
      setHeaders(sheet.headers)
      setSheetRows(sheet.rows)
      setMap(autoMapColumns(sheet.headers))
      setStep('map')
    } catch {
      setReadError(t('import.unreadable', 'We could not read that file. Try an .xlsx, .xls or .csv export.'))
    }
  }

  function buildGrid() {
    if (!map) return

    const next = sheetRows.map((source) => {
      const row = Object.fromEntries(
        IMPORT_FIELDS.map((field) => {
          const column = map[field]
          const value = column === null ? '' : String(source[column] ?? '').trim()
          return [field, value]
        }),
      ) as GridRow

      if (row.quantity === '') row.quantity = '0'
      if (row.minimum_stock === '') row.minimum_stock = '0'

      return row
    })

    setGrid(next)
    setServerErrors({})
    setStep('preview')
  }

  const problems = useMemo(
    () => grid.map((row, index) => [...rowProblems(row, index, grid), ...(serverErrors[index] ?? [])]),
    [grid, serverErrors],
  )
  const badCount = problems.filter((list) => list.length > 0).length

  const importMutation = useMutation({
    mutationFn: () => importProducts(grid.map(toImportRow)),
    onSuccess: (result) => {
      push({ tone: 'success', title: `${result.created} ${t('import.inserted', 'products imported.')}` })
      onImported()
      close()
    },
    onError: (caught) => {
      const rows = isAxiosError(caught)
        ? ((caught.response?.data as { errors?: { rows?: ImportRowError[] } } | undefined)?.errors?.rows ?? [])
        : []

      if (rows.length > 0) {
        setServerErrors(Object.fromEntries(rows.map((entry) => [entry.row, entry.messages])))
      }
      push({ tone: 'danger', title: getErrorMessage(caught) })
    },
  })

  const unmappedRequired = map
    ? REQUIRED_FIELDS.filter((field) => map[field] === null).map((field) => FIELD_LABELS[field])
    : []

  const steps = [
    { id: 'upload', label: t('import.stepUpload', 'Upload') },
    { id: 'map', label: t('import.stepMap', 'Confirm columns') },
    { id: 'preview', label: t('import.stepPreview', 'Preview and insert') },
  ]
  const stepIndex = steps.findIndex((item) => item.id === step)

  return (
    <Modal
      open={open}
      onClose={close}
      maxWidth="4xl"
      title={t('products.importExcel', 'Import Excel')}
      subtitle={fileName || t('import.subtitle', 'Bring your whole catalog in from a spreadsheet.')}
      footer={
        step === 'upload' ? (
          <Button variant="secondary" onClick={close}>
            {t('common.cancel', 'Cancel')}
          </Button>
        ) : step === 'map' ? (
          <>
            <Button variant="secondary" onClick={() => setStep('upload')}>
              {t('common.back', 'Back')}
            </Button>
            <Button disabled={unmappedRequired.length > 0} onClick={buildGrid}>
              {t('common.next', 'Next')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setStep('map')}>
              {t('common.back', 'Back')}
            </Button>
            <Button
              variant="success"
              loading={importMutation.isPending}
              disabled={badCount > 0 || grid.length === 0}
              onClick={() => importMutation.mutate()}
            >
              {t('import.insert', 'Insert')} ({grid.length})
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <Stepper steps={steps} current={stepIndex} />

        {step === 'upload' ? (
          <div className="space-y-3">
            <FileDropzone accept=".xlsx,.xls,.csv" onFile={(file) => void handleFile(file)}>
              <div className="flex flex-col items-center gap-2">
                <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <Upload className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-slate-800">
                  {t('import.dropTitle', 'Drop your spreadsheet here, or click to browse')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('import.dropHint', 'We read the first sheet of an .xlsx, .xls or .csv file.')}
                </p>
              </div>
            </FileDropzone>
            {readError ? <p className="text-xs text-rose-600">{readError}</p> : null}
          </div>
        ) : null}

        {step === 'map' && map ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {t('import.mapHint', 'We matched your columns to our fields. Change any that we got wrong.')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((field) => (
                <Select
                  key={field}
                  label={FIELD_LABELS[field]}
                  required={REQUIRED_FIELDS.includes(field)}
                  value={map[field] === null ? '' : String(map[field])}
                  onChange={(event) =>
                    setMap({ ...map, [field]: event.target.value === '' ? null : Number(event.target.value) })
                  }
                >
                  <option value="">{t('import.noColumn', 'Not in the file')}</option>
                  {headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={String(index)}>
                      {header === '' ? `${t('import.column', 'Column')} ${index + 1}` : header}
                    </option>
                  ))}
                </Select>
              ))}
            </div>
            {unmappedRequired.length > 0 ? (
              <p className="text-xs text-rose-600">
                {t('import.missingRequired', 'Pick a column for')} {unmappedRequired.join(', ')}.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 'preview' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {grid.length - badCount} {t('import.readyRows', 'ready')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                {badCount} {t('import.badRows', 'need a fix')}
              </span>
              <span className="text-slate-500">
                {t('import.editHint', 'Edit any cell below, just like in Excel.')}
              </span>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="w-10 border-b border-slate-200 px-2 py-2 text-left font-semibold text-slate-500">
                      #
                    </th>
                    {IMPORT_FIELDS.map((field) => (
                      <th
                        key={field}
                        className="border-b border-slate-200 px-2 py-2 text-left font-semibold whitespace-nowrap text-slate-500"
                      >
                        {FIELD_LABELS[field]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, index) => {
                    const bad = problems[index]!.length > 0
                    return (
                      <tr
                        key={index}
                        data-row-state={bad ? 'error' : 'ready'}
                        title={problems[index]!.join(' · ')}
                        className={bad ? 'bg-rose-100' : 'bg-emerald-50'}
                      >
                        <td
                          className={cn(
                            'border-b border-l-4 border-slate-100 px-2 py-1 font-semibold',
                            bad ? 'border-l-rose-500 text-rose-700' : 'border-l-emerald-400 text-emerald-700',
                          )}
                        >
                          {index + 1}
                        </td>
                        {IMPORT_FIELDS.map((field) => (
                          <td key={field} className="border-b border-slate-100 px-1 py-1">
                            <input
                              aria-label={`${FIELD_LABELS[field]} ${index + 1}`}
                              value={row[field]}
                              onChange={(event) =>
                                setGrid((current) =>
                                  current.map((item, position) =>
                                    position === index ? { ...item, [field]: event.target.value } : item,
                                  ),
                                )
                              }
                              className={cn(
                                'rounded border border-transparent bg-white/70 px-1.5 py-1 text-xs',
                                'focus:border-blue-400 focus:bg-white focus:outline-none',
                                CELL_WIDTH[field],
                              )}
                            />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {badCount > 0 ? (
              <ul className="space-y-1 text-[11px] text-rose-600">
                {problems.map((list, index) =>
                  list.length === 0 ? null : (
                    <li key={index}>
                      {t('import.row', 'Row')} {index + 1}: {list.join(' · ')}
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                <FileSpreadsheet className="h-4 w-4" />
                {t('import.allReady', 'Every row checks out. Insert when you are ready.')}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
