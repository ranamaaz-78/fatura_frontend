import {
  Building2,
  CreditCard,
  FileCheck2,
  FileText,
  Images,
  Inbox,
  LayoutDashboard,
  Package,
  Receipt,
  ScanLine,
  Settings,
  TrendingUp,
  Truck,
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
      { to: '/app/reports', labelKey: 'nav.reports', fallback: 'Reports', icon: TrendingUp },
      { to: '/app/subscription', labelKey: 'nav.subscription', fallback: 'Subscription', icon: CreditCard },
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
    labelKey: 'nav.products',
    fallback: 'Products',
    icon: Package,
  },
]

export const TAB_ROOTS = APP_TABS.map((item) => item.to)
