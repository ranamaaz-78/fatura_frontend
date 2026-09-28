import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ProtectedImage } from '../../components/ui/ProtectedImage'
import { useToast } from '../../components/ui/Toast'
import { Tooltip } from '../../components/ui/Tooltip'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../services/api'
import {
  deleteProductImage,
  listProductImages,
  releaseImageBlob,
  renameProductImage,
  uploadProductImages,
} from '../../services/productImages'
import type { ProductImage } from '../../types/catalog'
import { productImagesKey } from './productImageLookup'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function Lightbox({ image, onClose }: { image: ProductImage; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 flex max-h-full flex-col items-center gap-4">
        <ProtectedImage
          fileUrl={image.file_url}
          alt={image.name}
          className="max-h-[70vh] max-w-[90vw] rounded-2xl bg-white object-contain shadow-2xl"
        />
        <p className="max-w-[90vw] truncate text-center text-sm font-semibold text-white">{image.name}</p>
      </div>
      <span className="absolute top-4 right-4 z-20">
        <Tooltip content={t('common.close', 'Close')} align="end" side="bottom">
          <button
            type="button"
            aria-label={t('common.close', 'Close')}
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </Tooltip>
      </span>
    </div>
  )
}

function ProductImages() {
  const queryClient = useQueryClient()
  const { push } = useToast()

  const inputRef = useRef<HTMLInputElement>(null)
  // dragleave fires for every child, so count the enters instead.
  const dragDepth = useRef(0)
  const skipBlur = useRef(false)

  const [over, setOver] = useState(false)
  const [lightbox, setLightbox] = useState<ProductImage | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState<ProductImage | null>(null)

  const query = useQuery({ queryKey: productImagesKey, queryFn: listProductImages })
  const images = query.data ?? []

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: productImagesKey })
  }

  const uploadMutation = useMutation({
    mutationFn: uploadProductImages,
    onSuccess: (result) => {
      refresh()
      for (const failure of result.errors) {
        push({ tone: 'danger', title: `${failure.file}: ${failure.message}` })
      }
      if (result.images.length > 0) {
        push({
          tone: 'success',
          title: t('images.uploaded', ':count uploaded.').replace(
            ':count',
            String(result.images.length),
          ),
        })
      }
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const renameMutation = useMutation({
    mutationFn: (input: { uuid: string; name: string }) => renameProductImage(input.uuid, input.name),
    onSuccess: refresh,
    onError: (error) => {
      refresh()
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (image: ProductImage) => deleteProductImage(image.uuid),
    onSuccess: (_result, image) => {
      releaseImageBlob(image.file_url)
      queryClient.removeQueries({ queryKey: ['app', 'image-blob', image.file_url] })
      setDeleting(null)
      refresh()
      push({ tone: 'success', title: t('images.deleted', 'File deleted') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function upload(files: FileList | null) {
    if (!files || files.length === 0 || uploadMutation.isPending) return
    uploadMutation.mutate(Array.from(files))
  }

  function startRename(image: ProductImage) {
    skipBlur.current = false
    setDraft(image.name)
    setRenaming(image.uuid)
  }

  function commitRename(image: ProductImage) {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }

    const next = draft.trim()
    setRenaming(null)
    if (next === '' || next === image.name) return

    renameMutation.mutate({ uuid: image.uuid, name: next })
  }

  function cancelRename() {
    // Put the old name back and keep the blur handler from saving it again.
    skipBlur.current = true
    setRenaming(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
            {t('nav.productImages', 'Product images')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {images.length} {t('images.countLabel', 'files in this folder')}
          </p>
        </div>
        <button
          type="button"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#004ac6] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending
            ? t('images.uploading', 'Uploading...')
            : t('images.upload', 'Upload files')}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            upload(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <div
        data-testid="image-folder"
        data-over={over ? 'true' : 'false'}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setOver(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          dragDepth.current -= 1
          if (dragDepth.current <= 0) setOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setOver(false)
          upload(event.dataTransfer.files)
        }}
        className={cn(
          'min-h-[320px] rounded-2xl border-2 border-dashed p-6 transition-colors',
          over ? 'border-[#004ac6] bg-[#eff4ff]' : 'border-slate-200 bg-white',
        )}
      >
        {query.isPending ? (
          <div className="flex flex-wrap gap-5">
            {Array.from({ length: 6 }).map((_item, index) => (
              <span key={index} className="h-[100px] w-[100px] animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-4 rounded-2xl bg-slate-100 p-4">
              <ImagePlus className="h-8 w-8 text-slate-400" />
            </span>
            <h2 className="text-sm font-bold text-slate-900">
              {t('images.emptyTitle', 'This folder is empty')}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {t('images.emptyHint', 'Drag images here, or use Upload files.')}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {images.map((image) => (
              <div key={image.uuid} className="group w-[100px]">
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`${t('images.open', 'Open')} ${image.name}`}
                    onClick={() => setLightbox(image)}
                    className="block h-[100px] w-[100px] cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-colors hover:border-[#004ac6]"
                  >
                    <ProtectedImage
                      fileUrl={image.file_url}
                      alt={image.name}
                      className="h-[100px] w-[100px] object-cover"
                    />
                  </button>
                  <span className="absolute -top-2 -right-2 z-10">
                    <Tooltip content={t('common.delete', 'Delete')} align="end">
                      <button
                        type="button"
                        aria-label={`${t('common.delete', 'Delete')} ${image.name}`}
                        onClick={() => setDeleting(image)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </span>
                </div>

                {renaming === image.uuid ? (
                  <input
                    autoFocus
                    value={draft}
                    disabled={renameMutation.isPending}
                    aria-label={`${t('images.rename', 'Rename')} ${image.name}`}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => commitRename(image)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                      if (event.key === 'Escape') cancelRename()
                    }}
                    className="mt-2 w-full rounded-md border border-[#004ac6] px-1.5 py-1 text-center text-[11px] text-slate-800 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    title={image.name}
                    onClick={() => startRename(image)}
                    className="mt-2 block w-full cursor-text truncate rounded-md px-1.5 py-1 text-center text-[11px] text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {image.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox ? <Lightbox image={lightbox} onClose={() => setLightbox(null)} /> : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        loading={deleteMutation.isPending}
        title={t('images.deleteTitle', 'Delete this file?')}
        description={t(
          'images.deleteBody',
          ':name will be removed from this folder, together with its file.',
        ).replace(':name', deleting?.name ?? '')}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}

export default ProductImages
