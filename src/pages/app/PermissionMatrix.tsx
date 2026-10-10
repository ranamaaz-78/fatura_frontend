import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import type { TeamCatalogue } from '../../services/team'

const ACTIONS = ['view', 'create', 'update', 'delete', 'pay', 'void'] as const

/** What each area is called on screen. */
export const MODULE_LABEL: Record<string, () => string> = {
  dashboard: () => t('perm.dashboard', 'Dashboard'),
  invoices: () => t('perm.invoices', 'Invoices'),
  delivery_notes: () => t('perm.delivery_notes', 'Delivery notes'),
  quotes: () => t('perm.quotes', 'Quotes'),
  proformas: () => t('perm.proformas', 'Proformas'),
  payments: () => t('perm.payments', 'Payments'),
  customers: () => t('perm.customers', 'Clients'),
  suppliers: () => t('perm.suppliers', 'Suppliers'),
  products: () => t('perm.products', 'Products and barcodes'),
  product_images: () => t('perm.product_images', 'Product images'),
  stock: () => t('perm.stock', 'Stock and purchases'),
  reports: () => t('perm.reports', 'Reports'),
  printables: () => t('perm.printables', 'Printables'),
  settings: () => t('perm.settings', 'Company settings'),
}

const ACTION_LABEL: Record<(typeof ACTIONS)[number], () => string> = {
  view: () => t('perm.view', 'View'),
  create: () => t('perm.create', 'Create'),
  update: () => t('perm.update', 'Edit'),
  delete: () => t('perm.delete', 'Delete'),
  pay: () => t('perm.pay', 'Payments'),
  void: () => t('perm.void', 'Void'),
}

/** The role names the owner picks from. */
export const ROLE_LABEL: Record<string, () => string> = {
  manager: () => t('team.role.manager', 'Manager'),
  cashier: () => t('team.role.cashier', 'Cashier'),
  accountant: () => t('team.role.accountant', 'Accountant'),
  custom: () => t('team.role.custom', 'Custom'),
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role]?.() ?? role
}

type PermissionMatrixProps = {
  catalogue: TeamCatalogue
  value: string[]
  disabled?: boolean
  onChange: (next: string[]) => void
}

/**
 * Every area with a tick for each thing that can be done in it. Ticks that do not exist for an area (a
 * dashboard cannot be created) are left empty. Voiding a document counts as Delete.
 */
export function PermissionMatrix({ catalogue, value, disabled = false, onChange }: PermissionMatrixProps) {
  const chosen = new Set(value)

  function toggle(permission: string, on: boolean) {
    const next = new Set(chosen)
    if (on) next.add(permission)
    else next.delete(permission)
    onChange([...next])
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-page text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            <th className="px-3 py-2 text-left">{t('team.area', 'Area')}</th>
            {ACTIONS.map((action) => (
              <th key={action} className="px-1.5 py-2 text-center">
                {ACTION_LABEL[action]()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(catalogue.modules).map(([module, actions]) => (
            <tr key={module} className="border-t border-line">
              <td className="px-3 py-2 font-medium text-ink">{MODULE_LABEL[module]?.() ?? module}</td>
              {ACTIONS.map((action) => {
                const exists = actions.includes(action)
                const permission = `${module}.${action}`
                return (
                  <td key={action} className="px-1.5 py-2 text-center">
                    {exists ? (
                      <input
                        type="checkbox"
                        checked={chosen.has(permission)}
                        disabled={disabled}
                        aria-label={`${MODULE_LABEL[module]?.() ?? module}: ${ACTION_LABEL[action]()}`}
                        onChange={(event) => toggle(permission, event.target.checked)}
                        className={cn('h-4 w-4 cursor-pointer accent-brand-600', disabled && 'cursor-not-allowed opacity-60')}
                      />
                    ) : (
                      <span aria-hidden="true" className="text-ink-muted/40">
                        –
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
