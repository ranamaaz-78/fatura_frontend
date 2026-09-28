import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconButton } from '../../components/ui/IconButton'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../../services/catalog'
import type { Category } from '../../types/catalog'

export const categoriesKey = ['app', 'categories'] as const

export function useCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: listCategories })
}

export function CategoryManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const query = useCategories()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: categoriesKey })
    void queryClient.invalidateQueries({ queryKey: ['app', 'products'] })
  }

  function reportError(caught: unknown) {
    const mapped = mapValidationErrors(caught)
    setError(mapped.name ?? getErrorMessage(caught))
  }

  const createMutation = useMutation({
    mutationFn: () => createCategory(newName.trim()),
    onSuccess: () => {
      setNewName('')
      setError('')
      refresh()
    },
    onError: reportError,
  })

  const renameMutation = useMutation({
    mutationFn: (category: Category) => updateCategory(category.id, editingName.trim()),
    onSuccess: () => {
      setEditingId(null)
      setError('')
      refresh()
    },
    onError: reportError,
  })

  const deleteMutation = useMutation({
    mutationFn: (category: Category) => deleteCategory(category.id),
    onSuccess: () => {
      setError('')
      refresh()
    },
    onError: (caught) => push({ tone: 'danger', title: getErrorMessage(caught) }),
  })

  const categories = query.data ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('products.manageCategories', 'Manage categories')}
      subtitle={t('products.categoriesSubtitle', 'Categories are shared by every product in your catalog.')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.done', 'Done')}
        </Button>
      }
    >
      <div className="space-y-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (newName.trim() !== '') createMutation.mutate()
          }}
        >
          <Input
            label={t('products.categoryName', 'Category name')}
            placeholder={t('products.categoryPlaceholder', 'Cables, Peripherals, Screens…')}
            value={newName}
            error={editingId === null ? error : ''}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button
            type="submit"
            icon={<Plus className="h-4 w-4" />}
            loading={createMutation.isPending}
            disabled={newName.trim() === ''}
            className="h-[38px] shrink-0"
          >
            {t('products.addCategory', 'Add')}
          </Button>
        </form>

        {query.isPending ? (
          <SkeletonTable />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t('products.noCategories', 'No categories yet')}
            description={t('products.noCategoriesHint', 'Add one above, or let an Excel import create them for you.')}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-2 px-3 py-2">
                {editingId === category.id ? (
                  <>
                    <Input
                      value={editingName}
                      error={error}
                      autoFocus
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <IconButton
                      label={t('common.save', 'Save')}
                      tooltipAlign="end"
                      onClick={() => renameMutation.mutate(category)}
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                    </IconButton>
                    <IconButton label={t('common.cancel', 'Cancel')} tooltipAlign="end" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-slate-800">{category.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {category.products_count ?? 0} {t('products.inUse', 'in use')}
                    </span>
                    <IconButton
                      label={t('common.edit', 'Edit')}
                      tooltipAlign="end"
                      onClick={() => {
                        setEditingId(category.id)
                        setEditingName(category.name)
                        setError('')
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={t('common.delete', 'Delete')}
                      tooltipAlign="end"
                      onClick={() => deleteMutation.mutate(category)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </IconButton>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
