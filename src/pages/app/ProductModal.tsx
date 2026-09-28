import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { centsToInput, parseAmountToCents, parseNumber } from '../../lib/money'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { createCategory, createProduct, generateBarcode, listTaxRates, updateProduct } from '../../services/catalog'
import { listSuppliers } from '../../services/suppliers'
import type { Product, ProductInput } from '../../types/catalog'
import { categoriesKey, useCategories } from './CategoryManagerModal'

type Draft = {
  sr_number: string
  article: string
  description: string
  quantity: string
  category_id: string
  supplier_id: string
  brand: string
  image_code: string
  barcode: string
  buying_price: string
  selling_price: string
  iva_percent: string
  minimum_stock: string
}

const BLANK: Draft = {
  sr_number: '',
  article: '',
  description: '',
  quantity: '0',
  category_id: '',
  supplier_id: '',
  brand: '',
  image_code: '',
  barcode: '',
  buying_price: '0.00',
  selling_price: '0.00',
  iva_percent: '21',
  minimum_stock: '0',
}

function toDraft(product: Product): Draft {
  return {
    sr_number: product.sr_number ?? '',
    article: product.article,
    description: product.description ?? '',
    quantity: String(product.quantity),
    category_id: product.category_id === null ? '' : String(product.category_id),
    supplier_id: product.supplier_id === null ? '' : String(product.supplier_id),
    brand: product.brand ?? '',
    image_code: product.image_code ?? '',
    barcode: product.barcode,
    buying_price: centsToInput(product.buying_price),
    selling_price: centsToInput(product.selling_price),
    iva_percent: String(product.iva_percent),
    minimum_stock: String(product.minimum_stock),
  }
}

/** Matches the small action chip the design uses next to a field. */
const fieldButton =
  'inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[11px] font-semibold ' +
  'text-slate-700 transition-colors cursor-pointer hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50'

export type ProductModalProps = {
  open: boolean
  product: Product | null
  onClose: () => void
}

export function ProductModal({ open, product, onClose }: ProductModalProps) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const categories = useCategories()
  const suppliers = useQuery({
    queryKey: ['app', 'suppliers', 'picker'],
    queryFn: () => listSuppliers(),
    enabled: open,
  })
  const taxRates = useQuery({
    queryKey: ['app', 'tax-rates'],
    queryFn: listTaxRates,
    enabled: open,
  })

  const [draft, setDraft] = useState<Draft>(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newCategory, setNewCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(product ? toDraft(product) : BLANK)
    setErrors({})
    setNewCategory(null)
  }, [open, product])

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const buyingCents = parseAmountToCents(draft.buying_price) ?? 0
  const sellingCents = parseAmountToCents(draft.selling_price)
  const iva = parseNumber(draft.iva_percent) ?? 0

  function toInput(): ProductInput {
    return {
      article: draft.article.trim(),
      description: draft.description.trim() || null,
      brand: draft.brand.trim() || null,
      image_code: draft.image_code.trim() || null,
      sr_number: draft.sr_number.trim() || null,
      barcode: draft.barcode.trim() || null,
      category_id: draft.category_id === '' ? null : Number(draft.category_id),
      supplier_id: draft.supplier_id === '' ? null : Number(draft.supplier_id),
      quantity: Math.max(0, Math.round(parseNumber(draft.quantity) ?? 0)),
      minimum_stock: Math.max(0, Math.round(parseNumber(draft.minimum_stock) ?? 0)),
      buying_price: buyingCents,
      selling_price: sellingCents ?? 0,
      iva_percent: iva,
    }
  }

  function save() {
    if (sellingCents === null || sellingCents <= buyingCents) {
      setErrors({
        selling_price: t('products.sellingAbove', 'Selling price must be higher than the buying price.'),
      })
      return
    }
    saveMutation.mutate()
  }

  const saveMutation = useMutation({
    mutationFn: () => (product ? updateProduct(product.id, toInput()) : createProduct(toInput())),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      void queryClient.invalidateQueries({ queryKey: categoriesKey })
      push({
        tone: 'success',
        title: product ? t('products.updated', 'Product updated.') : t('products.created', 'Product created.'),
      })
      onClose()
    },
    onError: (caught) => {
      const mapped = mapValidationErrors(caught)
      setErrors(mapped)
      if (Object.keys(mapped).length === 0) push({ tone: 'danger', title: getErrorMessage(caught) })
    },
  })

  const barcodeMutation = useMutation({
    mutationFn: generateBarcode,
    onSuccess: (result) => set('barcode', result.barcode),
    onError: (caught) => push({ tone: 'danger', title: getErrorMessage(caught) }),
  })

  const categoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: categoriesKey })
      set('category_id', String(category.id))
      setNewCategory(null)
    },
    onError: (caught) => push({ tone: 'danger', title: getErrorMessage(caught) }),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="xl"
      title={product ? t('products.edit', 'Edit product') : t('products.new', 'New product')}
      subtitle={t('products.modalSubtitle', 'Selling price follows buying price, margin and IVA.')}
      footer={
        <>
          <Button size="sm" variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            loading={saveMutation.isPending}
            disabled={draft.article.trim() === ''}
            onClick={save}
          >
            {t('products.save', 'Save product')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            compact
            className="sm:col-span-2"
            label={t('products.article', 'Article')}
            required
            value={draft.article}
            error={errors.article}
            onChange={(event) => set('article', event.target.value)}
          />
          <Input
            compact
            label={t('products.srNumber', 'Sr number')}
            value={draft.sr_number}
            error={errors.sr_number}
            onChange={(event) => set('sr_number', event.target.value)}
          />
        </div>

        <Textarea
          compact
          label={t('products.description', 'Description')}
          rows={2}
          value={draft.description}
          error={errors.description}
          onChange={(event) => set('description', event.target.value)}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="flex items-end gap-1.5">
              <Select
                compact
                label={t('products.category', 'Category')}
                value={draft.category_id}
                error={errors.category_id}
                onChange={(event) => set('category_id', event.target.value)}
              >
                <option value="">{t('products.noCategory', 'No category')}</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <button type="button" className={fieldButton} onClick={() => setNewCategory('')}>
                <Plus className="h-3 w-3" />
                {t('products.addCategory', 'Add')}
              </button>
            </div>
            {newCategory !== null ? (
              <div className="mt-1.5 flex items-end gap-1.5">
                <Input
                  compact
                  placeholder={t('products.categoryPlaceholder', 'Cables, Peripherals, Screens…')}
                  value={newCategory}
                  autoFocus
                  onChange={(event) => setNewCategory(event.target.value)}
                />
                <button
                  type="button"
                  className={fieldButton}
                  disabled={newCategory.trim() === '' || categoryMutation.isPending}
                  onClick={() => categoryMutation.mutate(newCategory.trim())}
                >
                  {t('common.save', 'Save')}
                </button>
              </div>
            ) : null}
          </div>
          <Input
            compact
            label={t('products.brand', 'Brand')}
            value={draft.brand}
            error={errors.brand}
            onChange={(event) => set('brand', event.target.value)}
          />
        </div>

        <Select
          compact
          label={t('products.supplier', 'Supplier')}
          value={draft.supplier_id}
          error={errors.supplier_id}
          onChange={(event) => set('supplier_id', event.target.value)}
        >
          <option value="">{t('products.noSupplier', 'No supplier')}</option>
          {(suppliers.data ?? [])
            .filter((supplier) => supplier.is_active || String(supplier.id) === draft.supplier_id)
            .map((supplier) => (
              <option key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
                {supplier.code ? ` (${supplier.code})` : ''}
              </option>
            ))}
        </Select>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            compact
            label={t('products.imageCode', 'Image code')}
            value={draft.image_code}
            error={errors.image_code}
            onChange={(event) => set('image_code', event.target.value)}
          />
          <div>
            <div className="flex items-end gap-1.5">
              <Input
                compact
                label={t('products.barcode', 'Bar code')}
                value={draft.barcode}
                error={errors.barcode}
                className="font-mono"
                onChange={(event) => set('barcode', event.target.value)}
              />
              <button
                type="button"
                className={fieldButton}
                disabled={barcodeMutation.isPending}
                onClick={() => barcodeMutation.mutate()}
              >
                <RefreshCw className="h-3 w-3" />
                {t('products.generate', 'Generate')}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {t('products.barcodeHint', 'Leave it empty and we generate one on save.')}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-page p-3">
          <span className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
            {t('products.pricing', 'Pricing')}
          </span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              compact
              label={t('products.buyingPrice', 'Buying price')}
              inputMode="decimal"
              value={draft.buying_price}
              error={errors.buying_price}
              onChange={(event) => set('buying_price', event.target.value)}
            />
            <Input
              compact
              label={t('products.sellingPrice', 'Selling price')}
              inputMode="decimal"
              value={draft.selling_price}
              error={errors.selling_price}
              onChange={(event) => set('selling_price', event.target.value)}
            />
            <Select
              compact
              label={t('products.iva', '% IVA')}
              value={draft.iva_percent}
              error={errors.iva_percent}
              onChange={(event) => set('iva_percent', event.target.value)}
            >
              {(taxRates.data ?? []).map((rate) => (
                <option key={rate.id} value={String(rate.rate)}>
                  {rate.rate}% ({rate.name})
                </option>
              ))}
              {(taxRates.data ?? []).some((rate) => String(rate.rate) === draft.iva_percent) ? null : (
                <option value={draft.iva_percent}>{draft.iva_percent}%</option>
              )}
            </Select>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {t('products.priceHint', 'Selling price stays above the buying price. IVA is added on the invoice, not in this price.')}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-page p-3">
          <span className="text-[10px] font-bold tracking-[0.08em] text-slate-500 uppercase">
            {t('products.stockSection', 'Stock')}
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              compact
              label={t('products.quantity', 'Quantity')}
              inputMode="numeric"
              value={draft.quantity}
              error={errors.quantity}
              onChange={(event) => set('quantity', event.target.value)}
            />
            <Input
              compact
              label={t('products.minimumStock', 'Minimum stock')}
              inputMode="numeric"
              value={draft.minimum_stock}
              error={errors.minimum_stock}
              onChange={(event) => set('minimum_stock', event.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
