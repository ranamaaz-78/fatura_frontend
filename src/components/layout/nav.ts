import {
  Building2,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  Newspaper,
  Images,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Package,
  Printer,
  Receipt,
  ScanLine,
  Settings,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type Accent = 'blue' | 'indigo'

export type NavItem = {
  to: string
  labelKey: string
  fallback: string
  icon: LucideIcon
  end?: boolean
  highlight?: boolean
  /** Only the company owner sees it. */
  ownerOnly?: boolean
}

export type NavGroup = {
  titleKey: string
  titleFallback: string
  items: NavItem[]
}

export const APP_NAV: NavGroup[] = [
  {
    titleKey: 'nav.group.main',
    titleFallback: 'Main',
    items: [
      {
        to: '/app/dashboard',
        labelKey: 'nav.dashboard',
        fallback: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    titleKey: 'nav.group.sales',
    titleFallback: 'Sales and invoicing',
    items: [
      {
        to: '/app/invoices/new',
        labelKey: 'nav.pos',
        fallback: 'POS / quick invoice',
        icon: ScanLine,
        highlight: true,
      },
      {
        to: '/app/invoices',
        labelKey: 'nav.invoices',
        fallback: 'Invoices',
        icon: Receipt,
        end: true,
      },
      {
        to: '/app/delivery-notes',
        labelKey: 'nav.deliveryNotes',
        fallback: 'Delivery notes',
        icon: Truck,
        end: true,
      },
      { to: '/app/quotes', labelKey: 'nav.quotes', fallback: 'Quotes', icon: FileText, end: true },
      { to: '/app/proformas', labelKey: 'nav.proformas', fallback: 'Proformas', icon: FileCheck2, end: true },
      { to: '/app/payments', labelKey: 'nav.payments', fallback: 'Payments', icon: CreditCard },
      { to: '/app/customers', labelKey: 'nav.customers', fallback: 'Clients', icon: Users },
    ],
  },
  {
    titleKey: 'nav.group.inventory',
    titleFallback: 'Catalog',
    items: [
      { to: '/app/products', labelKey: 'nav.products', fallback: 'Products and barcodes', icon: Package },
      {
        to: '/app/product-images',
        labelKey: 'nav.productImages',
        fallback: 'Product images',
        icon: Images,
      },
      { to: '/app/suppliers', labelKey: 'nav.suppliers', fallback: 'Suppliers', icon: Truck },
    ],
  },
  {
    titleKey: 'nav.group.analytics',
    titleFallback: 'Analytics and settings',
    items: [
      { to: '/app/reports', labelKey: 'nav.reports', fallback: 'Reports', icon: TrendingUp, end: true },
      { to: '/app/downloads', labelKey: 'nav.downloads', fallback: 'Downloads', icon: Download },
      { to: '/app/printables', labelKey: 'nav.printables', fallback: 'Printables', icon: Printer },
      { to: '/app/team', labelKey: 'nav.team', fallback: 'Team and roles', icon: UserCog, ownerOnly: true },
      { to: '/app/settings', labelKey: 'nav.settings', fallback: 'Settings', icon: Settings },
    ],
  },
]

export const ADMIN_NAV: NavGroup[] = [
  {
    titleKey: 'nav.group.main',
    titleFallback: 'Main',
    items: [
      {
        to: '/admin/dashboard',
        labelKey: 'nav.dashboard',
        fallback: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    titleKey: 'nav.group.platform',
    titleFallback: 'Platform',
    items: [
      { to: '/admin/applications', labelKey: 'nav.applications', fallback: 'Applications', icon: Inbox },
      { to: '/admin/companies', labelKey: 'nav.companies', fallback: 'Companies', icon: Building2 },
      { to: '/admin/plans', labelKey: 'nav.plans', fallback: 'Plans', icon: CreditCard },
      { to: '/admin/payment-methods', labelKey: 'nav.paymentMethods', fallback: 'Payment methods', icon: Wallet },
      { to: '/admin/site-content', labelKey: 'nav.siteContent', fallback: 'Website content', icon: Newspaper },
      { to: '/admin/account', labelKey: 'nav.account', fallback: 'My account', icon: KeyRound },
    ],
  },
]

export const APP_TABS: NavItem[] = [
  {
    to: '/app/dashboard',
    labelKey: 'nav.dashboard',
    fallback: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/app/invoices/new',
    labelKey: 'nav.scan',
    fallback: 'Scan',
    icon: ScanLine,
  },
  {
    to: '/app/invoices',
    labelKey: 'nav.invoices',
    fallback: 'Invoices',
    icon: Receipt,
    end: true,
  },
  {
    to: '/app/products',
    labelKey: 'nav.productsTab',
    fallback: 'Products',
    icon: Package,
  },
]

export const TAB_ROOTS = APP_TABS.map((item) => item.to)

/** What a team member needs to see each screen ("|" = any one of them). Screens not listed are open to everyone. */
const NAV_PERMISSION: Record<string, string> = {
  '/app/dashboard': 'dashboard.view',
  '/app/invoices/new': 'invoices.create|delivery_notes.create|quotes.create|proformas.create',
  '/app/invoices': 'invoices.view',
  '/app/delivery-notes': 'delivery_notes.view',
  '/app/quotes': 'quotes.view',
  '/app/proformas': 'proformas.view',
  '/app/payments': 'payments.view',
  '/app/customers': 'customers.view',
  '/app/products': 'products.view|stock.view',
  '/app/product-images': 'product_images.view',
  '/app/suppliers': 'suppliers.view',
  '/app/reports': 'reports.view',
  '/app/downloads': 'reports.view',
  '/app/printables': 'printables.view',
}

export function navAllowed(item: NavItem, can: (needed: string) => boolean, isOwner: boolean): boolean {
  if (item.ownerOnly) return isOwner
  const needed = NAV_PERMISSION[item.to]
  return needed === undefined || can(needed)
}

/** Where a person lands: the first screen in the menu they may open (Settings is always open: it holds their password). */
export function firstAllowedPath(can: (needed: string) => boolean, isOwner: boolean): string {
  for (const group of APP_NAV) {
    for (const item of group.items) {
      if (item.to !== '/app/invoices/new' && navAllowed(item, can, isOwner)) return item.to
    }
  }
  return '/app/settings'
}
