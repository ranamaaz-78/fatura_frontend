import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, FileCheck2, Monitor, Trash2, UploadCloud, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FileDropzone } from '../../components/ui/FileDropzone'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { intlLocale, t } from '../../i18n'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  completeDesktopUpload,
  desktopDownloadUrl,
  formatMegabytes,
  getAdminDesktopRelease,
  removeDesktopRelease,
  startDesktopUpload,
  uploadDesktopChunk,
} from '../../services/desktopApp'

const KEY = ['admin', 'desktop-app']

/** A failed piece is tried this many more times before the upload stops. */
const RETRIES = 2

/** "YK Digital Solutions Setup 1.1.0.exe" → "1.1.0" */
function versionFromName(name: string): string {
  return name.match(/(\d+\.\d+\.\d+)/)?.[1] ?? ''
}

/**
 * The Windows app installer the public website offers ("Download for Windows"). A new version is uploaded here in
 * small pieces, so a 90 MB installer goes up whatever the server's upload limit is.
 */
export default function AdminDesktopApp() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const query = useQuery({ queryKey: KEY, queryFn: getAdminDesktopRelease })
  const [file, setFile] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<number | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const release = query.data?.release ?? null
  const uploading = sent !== null

  function pick(next: File) {
    if (!next.name.toLowerCase().endsWith('.exe')) {
      push({ tone: 'danger', title: t('desktopAdmin.onlyExe', 'Choose the Windows installer (.exe).') })
      return
    }
    setFile(next)
    setVersion(versionFromName(next.name))
    setErrors({})
  }

  async function publish() {
    if (!file) return
    const controller = new AbortController()
    abortRef.current = controller
    setErrors({})
    setSent(0)

    try {
      const upload = await startDesktopUpload({ file_name: file.name, size_bytes: file.size, version: version.trim(), notes: notes.trim() || null })
      const total = Math.ceil(file.size / upload.chunk_size)

      for (let index = 0; index < total; index += 1) {
        const piece = file.slice(index * upload.chunk_size, (index + 1) * upload.chunk_size)
        for (let attempt = 0; ; attempt += 1) {
          try {
            await uploadDesktopChunk(upload.upload_id, index, piece, controller.signal)
            break
          } catch (error) {
            if (controller.signal.aborted || attempt >= RETRIES) throw error
          }
        }
        setSent(Math.min(file.size, (index + 1) * upload.chunk_size))
      }

      await completeDesktopUpload(upload.upload_id)
      push({ tone: 'success', title: t('desktopAdmin.published', 'The Windows app is on the website.') })
      setFile(null)
      setVersion('')
      setNotes('')
      void queryClient.invalidateQueries({ queryKey: KEY })
      void queryClient.invalidateQueries({ queryKey: ['public', 'desktop-app'] })
    } catch (error) {
      if (controller.signal.aborted) {
        push({ tone: 'info', title: t('desktopAdmin.cancelled', 'Upload cancelled.') })
      } else {
        const mapped = mapValidationErrors(error)
        setErrors(mapped)
        push({ tone: 'danger', title: getErrorMessage(error) })
      }
    } finally {
      abortRef.current = null
      setSent(null)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await removeDesktopRelease()
      setRemoveOpen(false)
      void queryClient.invalidateQueries({ queryKey: KEY })
      void queryClient.invalidateQueries({ queryKey: ['public', 'desktop-app'] })
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
    } finally {
      setRemoving(false)
    }
  }

  const percent = file && sent !== null ? Math.round((sent / file.size) * 100) : 0

  return (
    <>
      <PageHeader
        title={t('desktopAdmin.title', 'Windows app')}
        subtitle={t('desktopAdmin.subtitle', 'The installer the website offers under “Download for Windows”.')}
      />

      {query.isPending ? (
        <SkeletonCard />
      ) : (
        <Card title={t('desktopAdmin.current', 'On the website now')}>
          {release ? (
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Monitor className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-ink">v{release.version}</p>
                  <p className="text-xs text-ink-muted">
                    {release.file_name} · {formatMegabytes(release.size_bytes)}
                    {release.published_at ? ` · ${new Date(release.published_at).toLocaleString(intlLocale())}` : ''}
                  </p>
                  {release.notes ? <p className="mt-2 text-sm whitespace-pre-wrap text-ink">{release.notes}</p> : null}
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(release.sha256)
                      push({ tone: 'success', title: t('desktopAdmin.copied', 'Checksum copied.') })
                    }}
                    className="mt-2 inline-flex max-w-full cursor-pointer items-center gap-1.5 truncate rounded-lg bg-page px-2 py-1 text-[11px] text-ink-muted hover:text-ink"
                    title={t('desktopAdmin.copyChecksum', 'Copy the SHA-256 checksum')}
                  >
                    <Copy className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">SHA-256 {release.sha256}</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={desktopDownloadUrl()}
                  download={release.file_name}
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-xs font-semibold text-ink hover:bg-page"
                >
                  <Download className="h-4 w-4" />
                  {t('desktopAdmin.tryDownload', 'Download')}
                </a>
                <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setRemoveOpen(true)}>
                  {t('desktopAdmin.remove', 'Take off the website')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {t('desktopAdmin.none', 'Nothing uploaded yet. The website shows “Coming soon for Windows” until you publish an installer.')}
            </p>
          )}
        </Card>
      )}

      <Card
        title={release ? t('desktopAdmin.uploadNew', 'Publish a new version') : t('desktopAdmin.uploadFirst', 'Publish the installer')}
        subtitle={t('desktopAdmin.uploadHint', 'Use the Setup .exe from fatura_desktop/release. It replaces the version on the website.')}
      >
        <div className="space-y-4">
          {file ? (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-page p-4">
              <FileCheck2 className="h-6 w-6 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                <p className="text-xs text-ink-muted">{formatMegabytes(file.size)}</p>
              </div>
              {!uploading ? (
                <button type="button" aria-label={t('common.remove', 'Remove')} onClick={() => setFile(null)} className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:bg-line hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ) : (
            <FileDropzone accept=".exe,application/vnd.microsoft.portable-executable,application/x-msdownload" onFile={pick}>
              <UploadCloud className="h-8 w-8 text-ink-muted" />
              <p className="mt-2 text-sm font-semibold text-ink">{t('desktopAdmin.drop', 'Drop the installer here or click to choose it')}</p>
              <p className="mt-1 text-xs text-ink-muted">{t('desktopAdmin.dropHint', 'YK Digital Solutions Setup x.y.z.exe')}</p>
            </FileDropzone>
          )}

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Input
              label={t('desktopAdmin.version', 'Version')}
              placeholder="1.1.0"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              error={errors.version}
              disabled={uploading}
              required
            />
            <Textarea
              label={t('desktopAdmin.notes', 'What is new (optional)')}
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              error={errors.notes}
              disabled={uploading}
            />
          </div>

          {uploading && file ? (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-page">
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {percent}% · {formatMegabytes(sent ?? 0)} / {formatMegabytes(file.size)}
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            {uploading ? (
              <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
                {t('common.cancel', 'Cancel')}
              </Button>
            ) : null}
            <Button icon={<UploadCloud className="h-4 w-4" />} loading={uploading} disabled={!file || version.trim() === ''} onClick={() => void publish()}>
              {uploading ? t('desktopAdmin.uploading', 'Uploading…') : t('desktopAdmin.publish', 'Publish on the website')}
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={removeOpen}
        loading={removing}
        title={t('desktopAdmin.removeTitle', 'Take the Windows app off the website?')}
        description={t('desktopAdmin.removeBody', 'The download button turns into “Coming soon” until you publish an installer again. Copies people already installed keep working.')}
        confirmLabel={t('desktopAdmin.remove', 'Take off the website')}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => void remove()}
      />
    </>
  )
}
