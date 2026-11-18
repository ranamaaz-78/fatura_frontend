import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { ProtectedImage } from '../../components/ui/ProtectedImage'
import { useToast } from '../../components/ui/Toast'
import { Tooltip } from '../../components/ui/Tooltip'
import { usePermissions } from '../../auth/permissions'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { getErrorMessage } from '../../services/api'
import {
  bulkDeleteProductImages,
  deleteProductImage,
  listProductImages,
  releaseImageBlob,
  renameProductImage,
  replaceProductImage,
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
  const { can } = usePermissions()
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
  const [selected, setSelected] = useState<string[]>([])
  const [deletingMany, setDeletingMany] = useState(false)

  // Files whose name is already in the folder wait here while the person picks replace or skip for each.
  const [conflicts, setConflicts] = useState<{ file: File; uuid: string; name: string }[]>([])
  const [applyToAll, setApplyToAll] = useState(false)

  const query = useQuery({ queryKey: productImagesKey, queryFn: listProductImages })
  const images = query.data ?? []

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: productImagesKey })
  }

  const uploadMutation = useMutation({
    mutationFn: uploadProductImages,
    onSuccess: (result, files) => {
      refresh()
      const waiting: { file: File; uuid: string; name: string }[] = []
      for (const failure of result.errors) {
        const file = failure.duplicate_of ? files.find((item) => item.name === failure.file) : undefined
        if (file && failure.duplicate_of) waiting.push({ file, uuid: failure.duplicate_of, name: failure.file })
        else push({ tone: 'danger', title: `${failure.file}: ${failure.message}` })
      }
      if (waiting.length > 0) {
        setApplyToAll(false)
        setConflicts(waiting)
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

  const bulkDelete = useMutation({
    mutationFn: (uuids: string[]) => bulkDeleteProductImages(uuids),
    onSuccess: (result) => {
      for (const image of images) {
        if (result.done.includes(image.uuid)) {
          releaseImageBlob(image.file_url)
          queryClient.removeQueries({ queryKey: ['app', 'image-blob', image.file_url] })
        }
      }
      setSelected((current) => current.filter((uuid) => !result.done.includes(uuid)))
      setDeletingMany(false)
      refresh()
      if (result.done.length > 0) push({ tone: 'success', title: t('images.bulkDeleted', '{count} files deleted.', { count: result.done.length }) })
      if (result.failed.length > 0) {
        push({ tone: 'danger', title: t('images.bulkFailed', '{count} could not be removed from storage: {names}', { count: result.failed.length, names: result.failed.map((item) => item.name).join(', ') }) })
      }
    },
    onError: (error) => {
      setDeletingMany(false)
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const mayDelete = can('product_images.delete')
  // The selection never keeps a file that is no longer in the folder.
  useEffect(() => {
    const here = new Set(images.map((image) => image.uuid))
    setSelected((current) => {
      const next = current.filter((uuid) => here.has(uuid))
      return next.length === current.length ? current : next
    })
  }, [images])
  const allSelected = images.length > 0 && images.every((image) => selected.includes(image.uuid))

  const replaceMutation = useMutation({
    mutationFn: (item: { file: File; uuid: string }) => replaceProductImage(item.uuid, item.file),
    // The list comes back with a new file_url version, so the new picture loads under a new cache key.
    onSuccess: refresh,
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  /** Answers the first waiting file: replace it or skip it. "All" gives the same answer to every one left. */
  async function resolveConflict(replace: boolean) {
    const batch = applyToAll ? conflicts : conflicts.slice(0, 1)
    setConflicts((current) => current.slice(batch.length))
    if (!replace) return

    let done = 0
    for (const item of batch) {
      try {
        await replaceMutation.mutateAsync(item)
        done += 1
      } catch {
        // The mutation already showed the reason for this file; carry on with the rest.
      }
    }
    if (done > 0) {
      push({ tone: 'success', title: t('images.replaced', ':count replaced.').replace(':count', String(done)) })
    }
  }

  function upload(files: FileList | null) {
    if (!files || files.length === 0 || uploadMutation.isPending || !can('product_images.create')) return
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
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
            {t('nav.productImages', 'Product images')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {images.length} {t('images.countLabel', 'files in this folder')}
          </p>
        </div>
        {can('product_images.create') ? (
        <button
          type="button"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on shadow-xs transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending
            ? t('images.uploading', 'Uploading...')
            : t('images.upload', 'Upload files')}
        </button>
        ) : null}
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
          over ? 'border-brand-600 bg-brand-50' : 'border-line bg-card',
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
          <>
          {mayDelete ? (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-page px-3 py-2 text-[13px]">
              <Checkbox
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : images.map((image) => image.uuid))}
                label={t('sales.selectAll', 'Select all')}
              />
              {selected.length > 0 ? (
                <>
                  <span className="font-semibold text-ink">{t('sales.selectedCount', '{count} selected', { count: selected.length })}</span>
                  <button
                    type="button"
                    disabled={bulkDelete.isPending}
                    onClick={() => setDeletingMany(true)}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('sales.deleteSelected', 'Delete selected')}
                  </button>
                  <button type="button" onClick={() => setSelected([])} className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">
                    {t('sales.clearSelection', 'Clear')}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-5">
            {images.map((image) => (
              <div key={image.uuid} className="group w-[100px]">
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`${t('images.open', 'Open')} ${image.name}`}
                    onClick={() => setLightbox(image)}
                    className="block h-[100px] w-[100px] cursor-pointer overflow-hidden rounded-xl border border-line bg-page transition-colors hover:border-brand-600"
                  >
                    <ProtectedImage
                      fileUrl={image.file_url}
                      alt={image.name}
                      className="h-[100px] w-[100px] object-cover"
                    />
                  </button>
                  {mayDelete ? (
                    <span className="absolute top-1.5 left-1.5 z-10 rounded bg-card/90 p-0.5 shadow-xs">
                      <input
                        type="checkbox"
                        aria-label={`${t('sales.select', 'Select')} ${image.name}`}
                        checked={selected.includes(image.uuid)}
                        onChange={() => setSelected((current) => (current.includes(image.uuid) ? current.filter((uuid) => uuid !== image.uuid) : [...current, image.uuid]))}
                        className="block h-4 w-4 cursor-pointer accent-brand-600"
                      />
                    </span>
                  ) : null}
                  {mayDelete ? (
                  <span className="absolute -top-2 -right-2 z-10">
                    <Tooltip content={t('common.delete', 'Delete')} align="end">
                      <button
                        type="button"
                        aria-label={`${t('common.delete', 'Delete')} ${image.name}`}
                        onClick={() => setDeleting(image)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-slate-500 shadow-xs hover:bg-rose-50 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </span>
                  ) : null}
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
                    className="mt-2 w-full rounded-md border border-brand-600 px-1.5 py-1 text-center text-[11px] text-slate-800 outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    title={image.name}
                    onClick={() => can('product_images.update') && startRename(image)}
                    className="mt-2 block w-full cursor-text truncate rounded-md px-1.5 py-1 text-center text-[11px] text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {image.name}
                  </button>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {lightbox ? <Lightbox image={lightbox} onClose={() => setLightbox(null)} /> : null}

      <Modal
        open={conflicts.length > 0}
        onClose={() => void resolveConflict(false)}
        title={t('images.existsTitle', 'This file already exists')}
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => void resolveConflict(false)}>
              {t('images.skip', 'Skip')}
            </Button>
            <Button onClick={() => void resolveConflict(true)} loading={replaceMutation.isPending}>
              {t('images.replace', 'Replace')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          {t('images.existsBody', ':name is already in this folder. Replace it with the new file, or skip it?').replace(
            ':name',
            conflicts[0]?.name ?? '',
          )}
        </p>
        {conflicts.length > 1 ? (
          <div className="mt-4">
            <Checkbox
              checked={applyToAll}
              onChange={(event) => setApplyToAll(event.target.checked)}
              label={t('images.applyToAll', 'Do this for all :count remaining files').replace(':count', String(conflicts.length))}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deletingMany}
        onClose={() => setDeletingMany(false)}
        onConfirm={() => bulkDelete.mutate(selected)}
        loading={bulkDelete.isPending}
        title={t('images.deleteManyTitle', 'Delete {count} files?', { count: selected.length })}
        description={t('images.deleteManyBody', 'They will be removed from this folder, together with their files. This cannot be undone.')}
        confirmLabel={t('common.delete', 'Delete')}
      />

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
