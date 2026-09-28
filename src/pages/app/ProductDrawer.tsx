import { useQuery } from '@tanstack/react-query'
import { ImageOff, Pencil, Printer, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { BarcodeSvg } from '../../components/ui/BarcodeSvg'
import { Drawer } from '../../components/ui/Drawer'
import { IconButton } from '../../components/ui/IconButton'
import { ProtectedImage } from '../../components/ui/ProtectedImage'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { TONE_AMBER, TONE_GREEN, TONE_ROSE } from '../../lib/status'
import { formatCents } from '../../lib/money'
import { getProduct } from '../../services/catalog'
import type { Product } from '../../types/catalog'
import { useProductImageLookup } from './productImageLookup'

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-wider text-slate-500 uppercase">{label}</dt>
      <dd className="truncate text-sm text-slate-800">{value}</dd>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={cn('text-xs', strong ? 'font-semibold text-slate-700' : 'text-slate-500')}>
        {label}
      </span>
      <span
        className={cn(
          'font-mono tabular-nums',
          strong ? 'text-base font-bold text-brand-600' : 'text-[13px] text-slate-800',
        )}
      >
        {value}
      </span>
    </div>
  )
}

const drawerAction =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 ' +
  'text-xs font-semibold text-slate-700 transition-colors cursor-pointer hover:bg-slate-50'

export type ProductDrawerProps = {
  product: Product | null
  currency: string
  onClose: () => void
  onEdit: (product: Product) => void
  onPrint: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductDrawer({ product, currency, onClose, onEdit, onPrint, onDelete }: ProductDrawerProps) {
  // The row already has a copy, but refetching keeps the panel right after an edit.
  const query = useQuery({
    queryKey: ['app', 'product', product?.id],
    queryFn: () => getProduct(product!.id),
    enabled: product !== null,
    initialData: product ?? undefined,
  })

  const findImage = useProductImageLookup()
  const current = query.data ?? product
  const file = findImage(current?.image_code ?? null)
  const stockTone =
    !current || current.quantity <= 0
      ? TONE_ROSE
      : current.quantity <= current.minimum_stock
        ? TONE_AMBER
        : TONE_GREEN

  const profit = current ? current.selling_price - current.buying_price : 0

  return (
    <Drawer open={product !== null} onClose={onClose} side="right" width="w-full sm:w-[30rem]">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-card px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-wider text-slate-500 uppercase">
            {t('products.detail', 'Product')}
          </p>
          <h2 className="truncate text-lg font-bold text-slate-900">{current?.article ?? '—'}</h2>
        </div>
          <IconButton label={t('common.close', 'Close')} tooltipAlign="end" onClick={onClose}>
          <X className="h-5 w-5" />
        </IconButton>
      </div>

      {!current ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {current.category ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                {current.category}
              </span>
            ) : null}
            {current.supplier ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand-600">
                {current.supplier}
              </span>
            ) : null}
            <span className={cn('rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold', stockTone)}>
              {current.quantity} {t('products.inStock', 'in stock')}
            </span>
            {current.barcode_generated ? (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', TONE_AMBER)}>
                {t('products.auto', 'Auto')}
              </span>
            ) : null}
          </div>

          {file ? (
            <ProtectedImage
              fileUrl={file.file_url}
              alt={current.article}
              className="h-56 w-full rounded-2xl border border-line bg-page object-contain"
            />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-page text-center">
              <ImageOff className="h-6 w-6 text-slate-300" />
              <p className="px-4 text-[11px] text-slate-500">
                {current.image_code
                  ? t('products.noImageMatch', 'No file in the image folder is named :code.').replace(
                      ':code',
                      current.image_code,
                    )
                  : t('products.noImageCode', 'This product has no image code yet.')}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-card p-4 text-center">
            <BarcodeSvg code={current.barcode} className="mx-auto h-20 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={drawerAction} onClick={() => onEdit(current)}>
              <Pencil className="h-4 w-4 text-slate-500" />
              {t('common.edit', 'Edit')}
            </button>
            <button type="button" className={drawerAction} onClick={() => onPrint(current)}>
              <Printer className="h-4 w-4 text-brand-600" />
              {t('labels.printOne', 'Print label')}
            </button>
          </div>

          <div className="space-y-2.5 rounded-2xl border border-line bg-page p-4">
            <span className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
              {t('products.pricing', 'Pricing')}
            </span>
            <Line
              label={t('products.buyingPrice', 'Buying price')}
              value={formatCents(current.buying_price, currency)}
            />
            <Line label={t('products.iva', '% IVA')} value={`${current.iva_percent}%`} />
            <div className="border-t border-slate-200 pt-2.5">
              <Line
                label={t('products.sellingPrice', 'Selling price')}
                value={formatCents(current.selling_price, currency)}
                strong
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {t('products.priceHint', 'Selling price stays above the buying price. IVA is added on the invoice, not in this price.')}
            </p>
            <Line label={t('products.profitPerUnit', 'Profit per unit')} value={formatCents(profit, currency)} />
          </div>

          <div className="space-y-2.5 rounded-2xl border border-line bg-page p-4">
            <span className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
              {t('products.stockSection', 'Stock')}
            </span>
            <Line label={t('products.quantity', 'Quantity')} value={String(current.quantity)} />
            <Line label={t('products.minimumStock', 'Minimum stock')} value={String(current.minimum_stock)} />
            <Line
              label={t('products.stockValue', 'Stock value')}
              value={formatCents(current.quantity * current.buying_price, currency)}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label={t('products.srNumber', 'Sr number')} value={current.sr_number ?? '—'} />
            <Field label={t('products.brand', 'Brand')} value={current.brand ?? '—'} />
            <Field label={t('products.supplier', 'Supplier')} value={current.supplier ?? '—'} />
            <Field label={t('products.imageCode', 'Image code')} value={current.image_code ?? '—'} />
            <Field
              label={t('products.barcode', 'Bar code')}
              value={<span className="font-mono text-[13px]">{current.barcode}</span>}
            />
          </dl>

          {current.description ? (
            <div>
              <dt className="text-[11px] tracking-wider text-slate-500 uppercase">
                {t('products.description', 'Description')}
              </dt>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{current.description}</p>
            </div>
          ) : null}

          <button
            type="button"
            className={cn(drawerAction, 'w-full border-rose-200 text-rose-600 hover:bg-rose-50')}
            onClick={() => onDelete(current)}
          >
            <Trash2 className="h-4 w-4" />
            {t('products.deleteAction', 'Delete product')}
          </button>
        </div>
      )}
    </Drawer>
  )
}
