import { isAxiosError } from 'axios'
import type { ProductImage, ProductImageUpload, ProductImageUploadError } from '../types/catalog'
import { api, unwrap } from './api'

export function listProductImages(): Promise<ProductImage[]> {
  return unwrap<ProductImage[]>(api.get('/app/product-images'))
}

export async function uploadProductImages(files: File[]): Promise<ProductImageUpload> {
  const form = new FormData()
  for (const file of files) form.append('files[]', file)

  try {
    return await unwrap<ProductImageUpload>(
      // Let the browser set the multipart boundary, and give big drops room.
      api.post('/app/product-images', form, {
        headers: { 'Content-Type': undefined },
        timeout: 60000,
      }),
    )
  } catch (error) {
    // Nothing saved, but the reasons still arrive one per file.
    const failures = uploadFailures(error)
    if (failures) return { images: [], errors: failures }
    throw error
  }
}

function uploadFailures(error: unknown): ProductImageUploadError[] | null {
  if (!isAxiosError(error)) return null
  const data = error.response?.data as { errors?: { files?: ProductImageUploadError[] } } | undefined
  const files = data?.errors?.files
  return Array.isArray(files) && files.length > 0 ? files : null
}

export function renameProductImage(uuid: string, name: string): Promise<ProductImage> {
  return unwrap<ProductImage>(api.patch(`/app/product-images/${uuid}`, { name }))
}

export function deleteProductImage(uuid: string): Promise<unknown> {
  return unwrap(api.delete(`/app/product-images/${uuid}`))
}

/**
 * The bytes live behind the bearer token, so an `<img src>` cannot fetch them.
 * We pull each file once and hand out a blob URL instead.
 */
const blobUrls = new Map<string, Promise<string>>()

export function loadImageBlob(fileUrl: string): Promise<string> {
  const cached = blobUrls.get(fileUrl)
  if (cached) return cached

  const pending = api
    .get<Blob>(fileUrl, { responseType: 'blob' })
    .then((response) => URL.createObjectURL(response.data))
    .catch((error: unknown) => {
      blobUrls.delete(fileUrl)
      throw error
    })

  blobUrls.set(fileUrl, pending)
  return pending
}

export function releaseImageBlob(fileUrl: string): void {
  const pending = blobUrls.get(fileUrl)
  if (!pending) return

  blobUrls.delete(fileUrl)
  void pending.then(URL.revokeObjectURL).catch(() => {})
}
