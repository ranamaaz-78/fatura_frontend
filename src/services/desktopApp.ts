import { api, unwrap } from './api'

/** The Windows app installer the website offers ("Download for Windows"). */
export type DesktopRelease = {
  version: string
  notes: string | null
  file_name: string
  size_bytes: number
  sha256: string
  published_at: string | null
  download_url: string
}

export type DesktopAdminPayload = { release: DesktopRelease | null; chunk_size: number }

export type DesktopUpload = { upload_id: string; chunk_size: number }

/** The installer on offer, or null before one is uploaded. */
export function getDesktopRelease(): Promise<DesktopRelease | null> {
  return unwrap<DesktopRelease | null>(api.get('/public/desktop-app'))
}

/** The address the browser downloads the installer from (a plain link: the browser shows its own progress). */
export function desktopDownloadUrl(): string {
  return `${String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')}/public/desktop-app/download`
}

/** "91 MB" */
export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/* ------------------------------------------------------------------ the admin panel */

export function getAdminDesktopRelease(): Promise<DesktopAdminPayload> {
  return unwrap<DesktopAdminPayload>(api.get('/admin/desktop-app'))
}

export function startDesktopUpload(input: { file_name: string; size_bytes: number; version: string; notes: string | null }): Promise<DesktopUpload> {
  return unwrap<DesktopUpload>(api.post('/admin/desktop-app/uploads', input))
}

/** One piece of the installer. A big file goes up in pieces the server can always accept. */
export function uploadDesktopChunk(uploadId: string, index: number, chunk: Blob, signal?: AbortSignal): Promise<{ received: number; size_bytes: number }> {
  const form = new FormData()
  form.append('index', String(index))
  form.append('chunk', chunk, 'chunk')
  return unwrap(api.post(`/admin/desktop-app/uploads/${uploadId}/chunks`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000, signal }))
}

export function completeDesktopUpload(uploadId: string): Promise<{ release: DesktopRelease }> {
  return unwrap(api.post(`/admin/desktop-app/uploads/${uploadId}/complete`, {}, { timeout: 120_000 }))
}

export function removeDesktopRelease(): Promise<unknown> {
  return unwrap(api.delete('/admin/desktop-app'))
}
