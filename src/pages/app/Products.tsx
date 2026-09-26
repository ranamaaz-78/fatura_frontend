import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Eye,
  FileSpreadsheet,
  Layers,
  Package,
  Pencil,
  Plus,
  Printer,
  ScanLine,
  Search,
  Tags,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { BarcodeSvg } from '../../components/ui/BarcodeSvg'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { ProtectedImage } from '../../components/ui/ProtectedImage'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatCents } from '../../lib/money'
import { getErrorMessage } from '../../services/api'
import { deleteProduct, listProducts } from '../../services/catalog'
import type { Product, ProductImage, ProductStockFilter } from '../../types/catalog'
import { CategoryManagerModal, useCategories } from './CategoryManagerModal'
import { useProductImageLookup } from './productImageLookup'
import { PrintLabelsModal } from './PrintLabelsModal'
import { ProductDrawer } from './ProductDrawer'
import { ProductImportModal } from './ProductImportModal'
import { ProductModal } from './ProductModal'

const PER_PAGE = 8

/** The design gives each thumbnail one of four inks; the id keeps it stable. */
const THUMB_INKS = ['#1e3a6e', '#004ac6', '#334155', '#007d55']

function initials(article: string): string {
  const words = article.trim().split(/\s+/).filter(Boolean)
  const letters = words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** The folder image whose name matches the image code, or the design's initials tile. */
function Thumb({ product, file }: { product: Product; file: ProductImage | null }) {
  if (file) {
    return (
      <ProtectedImage
        fileUrl={file.file_url}
        alt={product.article}
        className="h-9 w-9 shrink-0 rounded-[10px] border border-slate-200 object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold text-white"
      style={{ background: THUMB_INKS[product.id % THUMB_INKS.length] }}
    >
      {initials(product.article)}
    </span>
  )
}

function stockTone(product: Product): string {
  if (product.quantity <= 0) return 'bg-[#fff1f2] text-[#be123c]'
  if (product.quantity <= product.minimum_stock) return 'bg-[#fffbeb] text-[#b45309]'
  return 'bg-[#ecfdf5] text-[#047857]'
}

const headerButton =
  'inline-flex h-[38px] items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer'

const rowAction =
  'flex h-[30px] w-[30px] items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer'

function KpiCard({
  label,
  value,
  sub,
  icon,
  tile,
  pill,
}: {
  label: string
  value: string | number
  sub: string
  icon: ReactNode
  tile: string
  pill?: { text: string; className: string }
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-[0.04em] text-slate-500 uppercase">{label}</span>
        <span className={cn('flex rounded-lg p-2.5', tile)}>{icon}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-mono text-2xl font-bold tracking-[-0.02em] text-slate-900">{value}</span>
        {pill ? (
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', pill.className)}>{pill.text}</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}

function Products() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const currency = session?.company?.currency ?? 'USD'

  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [stock, setStock] = useState<ProductStockFilter>('all')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])

  const [editing, setEditing] = useState<Product | null>(null)
  const [productOpen, setProductOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [labelTargets, setLabelTargets] = useState<Product[] | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [viewing, setViewing] = useState<Product | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const categories = useCategories()
  const findImage = useProductImageLookup()

  const query = useQuery({
    queryKey: ['app', 'products', { page, search: debounced, stock, categoryId }],
    queryFn: () =>
      listProducts({
        page,
        per_page: PER_PAGE,
        search: debounced || undefined,
        stock,
        category_id: categoryId === '' ? undefined : Number(categoryId),
      }),
  })

  const rows = useMemo(() => query.data?.items ?? [], [query.data])
  const meta = query.data?.meta
  const counts = query.data?.counts ?? { all: 0, low: 0, out: 0, no_barcode: 0 }

  const deleteMutation = useMutation({
    mutationFn: (product: Product) => deleteProduct(product.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
      void queryClient.invalidateQueries({ queryKey: ['app', 'categories'] })
      push({ tone: 'success', title: t('products.deleted', 'Product deleted.') })
      setDeleting(null)
    },
    onError: (caught) => push({ tone: 'danger', title: getErrorMessage(caught) }),
  })

  const allChecked = rows.length > 0 && rows.every((row) => selected.includes(row.id))
  const someChecked = rows.some((row) => selected.includes(row.id))
  const headBox = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (headBox.current) headBox.current.indeterminate = someChecked && !allChecked
  }, [someChecked, allChecked])

  function toggleRow(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAll() {
    setSelected(allChecked ? [] : rows.map((row) => row.id))
  }

  /** Nothing ticked means "print what I am looking at". */
  function openLabels() {
    const picked = selected.length > 0 ? rows.filter((row) => selected.includes(row.id)) : rows
    if (picked.length === 0) {
      push({ tone: 'warning', title: t('labels.nothing', 'There is nothing to print yet.') })
      return
    }
    setLabelTargets(picked)
  }

  function openNew() {
    setEditing(null)
    setProductOpen(true)
  }

  const chips: { id: ProductStockFilter; label: string; count: number }[] = [
    { id: 'all', label: t('common.all', 'All'), count: counts.all },
    { id: 'low', label: t('products.lowStock', 'Low stock'), count: counts.low },
    { id: 'out', label: t('products.outOfStock', 'Out'), count: counts.out },
    { id: 'no_barcode', label: t('products.noBarcode', 'No barcode'), count: counts.no_barcode },
  ]

  const firstOnPage = meta && meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0
  const lastOnPage = meta ? firstOnPage + rows.length - 1 : 0
  const pageNumbers = useMemo(() => {
    if (!meta) return []
    const start = Math.max(1, Math.min(meta.current_page - 1, meta.last_page - 2))
    return Array.from({ length: Math.min(3, meta.last_page) }, (_, index) => start + index)
  }, [meta])

  const actions = (product: Product) => (
    <>
      <button
        type="button"
        aria-label={`${t('common.view', 'View')} ${product.article}`}
        className={cn(rowAction, 'hover:bg-slate-100 hover:text-slate-600')}
        onClick={() => setViewing(product)}
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`${t('common.edit', 'Edit')} ${product.article}`}
        className={cn(rowAction, 'hover:bg-slate-100 hover:text-slate-600')}
        onClick={() => {
          setEditing(product)
          setProductOpen(true)
        }}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`${t('labels.printOne', 'Print label')} ${product.article}`}
        className={cn(rowAction, 'hover:bg-[#eff4ff] hover:text-[#004ac6]')}
        onClick={() => setLabelTargets([product])}
      >
        <Printer className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`${t('common.delete', 'Delete')} ${product.article}`}
        className={cn(rowAction, 'hover:bg-rose-50 hover:text-rose-600')}
        onClick={() => setDeleting(product)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-slate-900">
            {t('nav.products', 'Products and barcodes')}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {counts.all} {t('products.countLabel', 'products')} · {counts.low}{' '}
            {t('products.lowStock', 'Low stock').toLowerCase()} · {counts.no_barcode}{' '}
            {t('products.withoutBarcode', 'without a barcode')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className={cn(headerButton, 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            onClick={() => setCategoriesOpen(true)}
          >
            <Tags className="h-4 w-4 text-[#004ac6]" />
            {t('products.manageCategories', 'Manage categories')}
          </button>
          <button
            type="button"
            className={cn(headerButton, 'bg-[#047857] text-white hover:bg-[#03694a]')}
            onClick={() => setImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t('products.importExcel', 'Import Excel')}
          </button>
          <button
            type="button"
            className={cn(headerButton, 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
            onClick={openLabels}
          >
            <Printer className="h-4 w-4 text-[#004ac6]" />
            {t('labels.printLabels', 'Print labels')}
          </button>
          <button
            type="button"
            className={cn(
              headerButton,
              'h-10 bg-[#004ac6] px-4 text-white shadow-xs hover:bg-[#2563eb]',
            )}
            onClick={openNew}
          >
            <Plus className="h-4 w-4" />
            {t('products.new', 'New product')}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t('products.kpiProducts', 'Products')}
          value={counts.all}
          sub={t('products.kpiProductsSub', 'in your catalog')}
          icon={<Package className="h-5 w-5" />}
          tile="bg-[#eff6ff] text-[#2563eb]"
        />
        <KpiCard
          label={t('products.stockValue', 'Stock value')}
          value={formatCents(query.data?.stock_value ?? 0, currency)}
          sub={t('products.stockValueHint', 'At buying price')}
          icon={<Layers className="h-5 w-5" />}
          tile="bg-[#eff6ff] text-[#2563eb]"
        />
        <KpiCard
          label={t('products.lowStock', 'Low stock')}
          value={counts.low}
          sub={t('products.lowStockSub', 'below reorder point')}
          icon={<AlertTriangle className="h-5 w-5" />}
          tile="bg-[#fffbeb] text-[#b45309]"
          pill={counts.low > 0 ? { text: t('products.review', 'Review'), className: 'bg-[#fffbeb] text-[#b45309]' } : undefined}
        />
        <KpiCard
          label={t('products.kpiWithoutBarcode', 'Without barcode')}
          value={counts.no_barcode}
          sub={t('products.withoutBarcodeHint', 'Labels not printed yet')}
          icon={<ScanLine className="h-5 w-5" />}
          tile="bg-[#fffbeb] text-[#b45309]"
          pill={
            counts.no_barcode > 0
              ? { text: t('products.generate', 'Generate'), className: 'bg-[#fffbeb] text-[#b45309]' }
              : undefined
          }
        />
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <span className="relative w-full max-w-[340px] flex-grow">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('products.searchPlaceholder', 'Search name, sr number or barcode')}
              className="h-[38px] w-full rounded-xl border border-slate-200 bg-white pr-3 pl-8.5 text-[13px] outline-none focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/20"
            />
          </span>
          <select
            aria-label={t('products.category', 'Category')}
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value)
              setPage(1)
            }}
            className="h-[38px] rounded-xl border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-[#004ac6]"
          >
            <option value="">{t('products.allCategories', 'All categories')}</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 md:ml-auto">
            {chips.map((chip) => {
              const on = stock === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setStock(chip.id)
                    setPage(1)
                  }}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition-colors cursor-pointer',
                    on
                      ? 'bg-[#eff4ff] text-[#004ac6]'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {chip.label}
                  <span className={cn('font-mono text-[11px]', on ? 'text-[#2563eb]' : 'text-slate-400')}>
                    {chip.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {query.isPending ? (
          <SkeletonTable />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('products.emptyTitle', 'No products yet')}
            description={t('products.emptyHint', 'Add one by hand, or bring your whole catalog in from Excel.')}
          />
        ) : (
          <>
            {/* Desktop rows */}
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[1040px]">
                <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">
                  <span className="w-8.5">
                    <input
                      ref={headBox}
                      type="checkbox"
                      aria-label={t('products.selectAll', 'Select every product on this page')}
                      checked={allChecked}
                      onChange={toggleAll}
                      className="h-[15px] w-[15px] accent-[#004ac6]"
                    />
                  </span>
                  <span className="flex-grow">{t('products.product', 'Product')}</span>
                  <span className="w-[130px]">{t('products.category', 'Category')}</span>
                  <span className="w-[160px]">{t('products.barcode', 'Bar code')}</span>
                  <span className="w-[90px] text-right">{t('products.cost', 'Cost')}</span>
                  <span className="w-[100px] text-right">{t('products.price', 'Price')}</span>
                  <span className="w-[90px] text-right">{t('products.stock', 'Stock')}</span>
                  <span className="w-[150px] text-right">{t('products.actions', 'Actions')}</span>
                </div>

                {rows.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      'flex items-center border-b border-slate-100 px-4 py-2.75 transition-colors hover:bg-slate-50/70',
                      selected.includes(product.id) && 'bg-[#eff4ff]/50',
                    )}
                  >
                    <span className="w-8.5">
                      <input
                        type="checkbox"
                        aria-label={`${t('products.select', 'Select')} ${product.article}`}
                        checked={selected.includes(product.id)}
                        onChange={() => toggleRow(product.id)}
                        className="h-[15px] w-[15px] accent-[#004ac6]"
                      />
                    </span>
                    <span className="flex min-w-0 flex-grow items-center gap-3">
                      <Thumb product={product} file={findImage(product.image_code)} />
                      <span className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setViewing(product)}
                          className="block max-w-full cursor-pointer truncate text-left text-[13px] font-semibold text-slate-900 hover:text-[#004ac6]"
                        >
                          {product.article}
                        </button>
                        <span className="block font-mono text-[11px] text-slate-500">
                          {product.sr_number ?? '—'}
                          {product.brand ? ` · ${product.brand}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="w-[130px]">
                      {product.category ? (
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </span>
                    <span className="flex w-[160px] items-center gap-2">
                      <BarcodeSvg code={product.barcode} digits={false} className="h-3.5 w-4.5 shrink-0" />
                      <span className="font-mono text-[11px] text-slate-700">{product.barcode}</span>
                      {product.barcode_generated ? (
                        <span
                          title={t('products.autoBarcodeHint', 'We generated this code. Print its label.')}
                          className="rounded-full border border-[#fde68a] bg-[#fffbeb] px-1.5 text-[10px] font-semibold text-[#b45309]"
                        >
                          {t('products.auto', 'Auto')}
                        </span>
                      ) : null}
                    </span>
                    <span className="w-[90px] text-right font-mono text-xs text-slate-500">
                      {formatCents(product.buying_price, currency)}
                    </span>
                    <span className="w-[100px] text-right font-mono text-[13px] font-semibold text-slate-900">
                      {formatCents(product.selling_price, currency)}
                    </span>
                    <span className="w-[90px] text-right">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold',
                          stockTone(product),
                        )}
                      >
                        {product.quantity}
                      </span>
                    </span>
                    <span className="flex w-[150px] justify-end gap-1">{actions(product)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone rows */}
            <div className="divide-y divide-slate-100 md:hidden">
              {rows.map((product) => (
                <div key={product.id} className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    aria-label={`${t('products.select', 'Select')} ${product.article}`}
                    checked={selected.includes(product.id)}
                    onChange={() => toggleRow(product.id)}
                    className="mt-1 h-[15px] w-[15px] shrink-0 accent-[#004ac6]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{product.article}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">{product.barcode}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {product.category ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {product.category}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold',
                          stockTone(product),
                        )}
                      >
                        {product.quantity}
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-slate-900">
                        {formatCents(product.selling_price, currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">{actions(product)}</div>
                </div>
              ))}
            </div>

            {meta ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                <span>
                  {t('common.showing', 'Showing')}{' '}
                  <span className="font-mono text-slate-900">
                    {firstOnPage}-{lastOnPage}
                  </span>{' '}
                  {t('common.of', 'of')} <span className="font-mono text-slate-900">{meta.total}</span>{' '}
                  {t('products.countLabel', 'products')}
                </span>
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage(meta.current_page - 1)}
                    className="flex h-8 items-center rounded-[10px] border border-slate-200 px-3 text-slate-700 disabled:text-slate-400 enabled:cursor-pointer enabled:hover:bg-slate-50"
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  {pageNumbers.map((number) => (
                    <button
                      key={number}
                      type="button"
                      aria-current={number === meta.current_page ? 'page' : undefined}
                      onClick={() => setPage(number)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-[10px] cursor-pointer',
                        number === meta.current_page
                          ? 'bg-[#004ac6] font-semibold text-white'
                          : 'border border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage(meta.current_page + 1)}
                    className="flex h-8 items-center rounded-[10px] border border-slate-200 px-3 text-slate-700 disabled:text-slate-400 enabled:cursor-pointer enabled:hover:bg-slate-50"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ProductModal
        open={productOpen}
        product={editing}
        currency={currency}
        onClose={() => setProductOpen(false)}
      />
      <CategoryManagerModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <ProductImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })}
      />
      <PrintLabelsModal
        open={labelTargets !== null}
        products={labelTargets ?? []}
        currency={currency}
        onClose={() => setLabelTargets(null)}
      />
      <ProductDrawer
        product={viewing}
        currency={currency}
        onClose={() => setViewing(null)}
        onEdit={(product) => {
          setViewing(null)
          setEditing(product)
          setProductOpen(true)
        }}
        onPrint={(product) => {
          setViewing(null)
          setLabelTargets([product])
        }}
        onDelete={(product) => {
          setViewing(null)
          setDeleting(product)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        loading={deleteMutation.isPending}
        title={t('products.deleteTitle', 'Delete this product?')}
        description={
          deleting
            ? `${deleting.article} ${t('products.deleteHint', 'will be removed from your catalog. This cannot be undone.')}`
            : ''
        }
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}

export default Products
