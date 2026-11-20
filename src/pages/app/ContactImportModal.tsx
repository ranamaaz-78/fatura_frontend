import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Stepper } from '../../components/ui/Stepper'
import { useToast } from '../../components/ui/Toast'
import { t, tp } from '../../i18n'
import { cn } from '../../lib/cn'
import {
  autoMapContacts,
  CONTACT_FIELDS,
  contactProblems,
  downloadContactDemoSheet,
  fieldLabel,
  REQUIRED_CONTACT_FIELDS,
  toContactImportRow,
  type ContactField,
  type ContactGridRow,
  type ContactKind,
  type ContactMap,
} from '../../lib/contactImport'
import { readSheet } from '../../lib/readSheet'
import { getErrorMessage } from '../../services/api'
import { importCustomers } from '../../services/sales'
import { importSuppliers } from '../../services/suppliers'
import type { ImportRowError } from '../../types/catalog'

type Step = 'upload' | 'map' | 'preview'

const CELL_WIDTH: Record<ContactField, string> = {
  name: 'w-44',
  company_name: 'w-36',
  phone: 'w-32',
  email: 'w-44',
  nif: 'w-28',
  address: 'w-48',
  remarks: 'w-44',
}

export type ContactImportModalProps = {
  kind: ContactKind
  open: boolean
  onClose: () => void
  onImported: () => void
}

/**
 * Clients or suppliers from a spreadsheet, in the steps the product import has: upload, confirm the columns,
 * preview and fix, insert. Every row is checked here and again on the server, and nothing is saved unless all pass.
 */
export function ContactImportModal({ kind, open, onClose, onImported }: ContactImportModalProps) {
  const { push } = useToast()
  const { session } = useAuth()
  const fields = CONTACT_FIELDS[kind]
  const [step, setStep] = useState<Step>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [sheetRows, setSheetRows] = useState<string[][]>([])
  const [map, setMap] = useState<ContactMap | null>(null)
  const [grid, setGrid] = useState<ContactGridRow[]>([])
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
        setReadError(
          kind === 'customer'
            ? t('contactImport.emptyClients', 'That sheet has a header row but no clients.')
            : t('contactImport.emptySuppliers', 'That sheet has a header row but no suppliers.'),
        )
        return
      }
      setFileName(file.name)
      setHeaders(sheet.headers)
      setSheetRows(sheet.rows)
      setMap(autoMapContacts(kind, sheet.headers))
      setStep('map')
    } catch {
      setReadError(t('import.unreadable', 'We could not read that file. Try an .xlsx, .xls or .csv export.'))
    }
  }

  function buildGrid() {
    if (!map) return

    setGrid(
      sheetRows.map((source) => {
        const row = {} as ContactGridRow
        for (const field of fields) {
          const column = map[field]
          row[field] = column === null ? '' : String(source[column] ?? '').trim()
        }
        return row
      }),
    )
    setServerErrors({})
    setStep('preview')
  }

  const problems = useMemo(
    () => grid.map((row, index) => [...contactProblems(kind, row, index, grid), ...(serverErrors[index] ?? [])]),
    [grid, kind, serverErrors],
  )
  const badCount = problems.filter((list) => list.length > 0).length

  const importMutation = useMutation({
    mutationFn: () => {
      const rows = grid.map((row) => toContactImportRow(kind, row))
      return kind === 'customer' ? importCustomers(rows) : importSuppliers(rows)
    },
    onSuccess: (result) => {
      push({
        tone: 'success',
        title:
          kind === 'customer'
            ? tp('contactImport.importedClients', '{count} client imported.|{count} clients imported.', result.created)
            : tp('contactImport.importedSuppliers', '{count} supplier imported.|{count} suppliers imported.', result.created),
      })
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

  /** A red row can be taken out of the list instead of fixed. */
  function removeRow(index: number) {
    setGrid((current) => current.filter((_, position) => position !== index))
    // The server's answers were about rows by position; they are asked for again on the next insert.
    setServerErrors({})
  }

  const unmappedRequired = map ? REQUIRED_CONTACT_FIELDS.filter((field) => map[field] === null).map((field) => fieldLabel(field)) : []

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
      subtitle={
        fileName ||
        (kind === 'customer'
          ? t('contactImport.subtitleClients', 'Bring your clients in from a spreadsheet.')
          : t('contactImport.subtitleSuppliers', 'Bring your suppliers in from a spreadsheet.'))
      }
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
            <button
              type="button"
              onClick={() => downloadContactDemoSheet(kind, session?.company?.name)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              {t('products.demoSheetHint', 'Not sure how to fill it? Download the demo sheet')}
            </button>
          </div>
        ) : null}

        {step === 'map' && map ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              {t('import.mapHint', 'We matched your columns to our fields. Change any that we got wrong.')}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <Select
                  key={field}
                  label={fieldLabel(field)}
                  required={REQUIRED_CONTACT_FIELDS.includes(field)}
                  value={map[field] === null ? '' : String(map[field])}
                  onChange={(event) => setMap({ ...map, [field]: event.target.value === '' ? null : Number(event.target.value) })}
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
              <span className="text-slate-500">{t('import.editHint', 'Edit any cell below, just like in Excel.')}</span>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="w-16 border-b border-slate-200 px-2 py-2 text-left font-semibold text-slate-500">#</th>
                    {fields.map((field) => (
                      <th key={field} className="border-b border-slate-200 px-2 py-2 text-left font-semibold whitespace-nowrap text-slate-500">
                        {fieldLabel(field)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, index) => {
                    const bad = problems[index]!.length > 0
                    return (
                      <tr key={index} data-row-state={bad ? 'error' : 'ready'} title={problems[index]!.join(' · ')} className={bad ? 'bg-rose-100' : 'bg-emerald-50'}>
                        <td
                          className={cn(
                            'border-b border-l-4 border-slate-100 px-2 py-1 font-semibold',
                            bad ? 'border-l-rose-500 text-rose-700' : 'border-l-emerald-400 text-emerald-700',
                          )}
                        >
                          <span className="flex items-center justify-between gap-1">
                            {index + 1}
                            <button
                              type="button"
                              aria-label={`${t('contactImport.removeRow', 'Remove this row')} ${index + 1}`}
                              title={t('contactImport.removeRow', 'Remove this row')}
                              onClick={() => removeRow(index)}
                              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </td>
                        {fields.map((field) => (
                          <td key={field} className="border-b border-slate-100 px-1 py-1">
                            <input
                              aria-label={`${fieldLabel(field)} ${index + 1}`}
                              value={row[field]}
                              onChange={(event) =>
                                setGrid((current) => current.map((item, position) => (position === index ? { ...item, [field]: event.target.value } : item)))
                              }
                              className={cn(
                                'rounded border border-transparent bg-card/70 px-1.5 py-1 text-xs',
                                'focus:border-brand-500 focus:bg-card focus:outline-none',
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
