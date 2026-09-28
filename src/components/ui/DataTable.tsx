import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Pagination } from './Pagination'
import { SearchInput } from './SearchInput'
import { SkeletonTable } from './Skeleton'

export type DataTableColumn<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  mono?: boolean
  numeric?: boolean
  sortable?: boolean
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  search?: string
  onSearch?: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
  empty?: ReactNode
  loading?: boolean
  selectedKeys?: string[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  rowActions?: (row: T) => ReactNode
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  summary?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  search,
  onSearch,
  filters,
  actions,
  empty,
  loading = false,
  selectedKeys = [],
  sortKey,
  sortDir,
  onSort,
  rowActions,
  page,
  pageCount,
  onPageChange,
  summary,
}: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {onSearch ? <SearchInput value={search ?? ''} onChange={onSearch} /> : <div />}
        <div className="flex items-center gap-2">
          {filters}
          {actions}
        </div>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : rows.length === 0 ? (
        empty
      ) : (
        <>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {columns.map((column) => {
                    const active = sortKey === column.key
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className={cn(
                          'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider',
                          column.align === 'right' || column.numeric ? 'text-right' : 'text-left',
                          active ? 'text-slate-700' : 'text-slate-500',
                        )}
                      >
                        {column.sortable && onSort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={() => onSort(column.key)}
                          >
                            {column.header}
                            {active && sortDir === 'desc' ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    )
                  })}
                  {rowActions ? <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const key = rowKey(row)
                  const selected = selectedKeys.includes(key)
                  return (
                    <tr
                      key={key}
                      className={cn(
                        'group hover:bg-slate-50/70 transition-colors',
                        selected && 'bg-blue-50/60',
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'px-4 py-3 text-slate-700',
                            (column.align === 'right' || column.numeric) && 'text-right',
                            column.numeric && 'font-mono tabular-nums',
                            column.mono && 'font-mono text-xs',
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {rowActions ? (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {rowActions(row)}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {rows.map((row) => {
              const key = rowKey(row)
              return (
                <div key={key} className="p-4 space-y-2">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-3">
                      <span className="text-[11px] uppercase text-slate-500">{column.header}</span>
                      <span
                        className={cn(
                          'text-sm text-slate-700 text-right',
                          column.numeric && 'font-mono tabular-nums',
                          column.mono && 'font-mono text-xs',
                        )}
                      >
                        {column.cell(row)}
                      </span>
                    </div>
                  ))}
                  {rowActions ? <div className="flex justify-end pt-1">{rowActions(row)}</div> : null}
                </div>
              )
            })}
          </div>
        </>
      )}

      {page && pageCount && onPageChange ? (
        <div className="border-t border-slate-100">
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={onPageChange}
            summary={summary}
          />
        </div>
      ) : null}
    </div>
  )
}
