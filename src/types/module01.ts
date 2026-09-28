export type UserRole = 'super_admin' | 'business_admin' | 'staff'
export type UserStatus = 'active' | 'disabled'
export type CompanyStatus = 'active' | 'suspended'
export type ApplicationStatus = 'new' | 'contacted' | 'approved' | 'rejected'
export type ActivityType = 'created' | 'status_changed' | 'note' | 'call' | 'whatsapp' | 'email' | 'converted'
export type PlanInterval = 'month' | 'year'
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export type Plan = {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  currency: string
  interval: PlanInterval
  features: string[]
  max_users: number | null
  max_invoices: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
}

export type PaymentMethod = {
  id: number
  name: string
  slug: string
  description: string | null
  instructions: string | null
  is_active: boolean
  sort_order: number
}

export type AuthUser = {
  id: number
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  role: UserRole
  status: UserStatus
  company_id: number | null
  last_login_at: string | null
  has_password: boolean
}

export type Subscription = {
  id: number
  company_id: number
  plan_id: number | null
  plan_name: string
  plan_price: number
  plan_currency: string
  plan_interval: PlanInterval
  plan_features: string[]
  status: SubscriptionStatus
  starts_at: string
  ends_at: string
  cancelled_at: string | null
  days_left: number
  is_usable: boolean
  notes: string | null
  payments?: Payment[]
}

export type Payment = {
  id: number
  company_id: number
  subscription_id: number | null
  payment_method_id: number | null
  payment_method?: PaymentMethod
  amount: number
  currency: string
  status: string
  reference: string | null
  paid_at: string | null
  notes: string | null
}

export type Company = {
  id: number
  name: string
  slug: string
  email: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  country: string | null
  currency: string
  logo_url?: string | null
  status: CompanyStatus
  notes: string | null
  created_at: string
  users_count?: number
  owner?: AuthUser | null
  active_subscription?: Subscription | null
  latest_subscription?: Subscription | null
  subscriptions?: Subscription[]
}

export type ApplicationActivity = {
  id: number
  type: ActivityType
  body: string | null
  meta: Record<string, unknown> | null
  user?: { id: number; name: string }
  created_at: string
}

export type Application = {
  id: number
  company_name: string
  contact_name: string
  email: string
  phone: string
  whatsapp: string | null
  whatsapp_number: string | null
  city: string | null
  country: string | null
  business_type: string | null
  team_size: string | null
  message: string | null
  plan_id: number | null
  plan?: Plan | null
  status: ApplicationStatus
  source: string
  notes: string | null
  converted_company_id: number | null
  converted_at: string | null
  created_at: string
  activities?: ApplicationActivity[]
}

export type PageMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type ApplicationCounts = {
  all: number
  new: number
  contacted: number
  approved: number
  rejected: number
}

export type SupportContact = {
  email: string
  whatsapp: string
}

export type SessionPayload = {
  user: AuthUser
  role: UserRole
  company: Company | null
  subscription: Subscription | null
  support: SupportContact
}

export type AdminDashboard = {
  applications: { new: number; contacted: number; approved: number; rejected: number; this_week: number }
  companies: { total: number; active: number; suspended: number }
  subscriptions: { active: number; expiring_soon: number; expired: number }
  revenue: { currency: string; this_month: number; all_time: number }
  latest_applications: Application[]
}

export type DashboardDocument = {
  id: number
  type: string
  number: string
  client_name: string
  issued_at: string | null
  payment_status: string
  total_cents: number
  outstanding_cents: number
}

export type DashboardStockRow = {
  id: number
  article: string
  quantity: number
  minimum_stock: number
  band: 'low' | 'out'
}

export type AppDashboard = {
  company: { id: number | null; name: string | null; currency: string }
  kpis: {
    outstanding: number
    paid_this_month: number
    overdue: number
    invoices_this_month: number
    clients: number
    document_count: number
    paid_count: number
    open_count: number
    total_cents: number
    base_cents: number
    tax_cents: number
    cost_cents: number
    profit_cents: number
    low_count: number
    out_count: number
  }
  series: { day: string; document_count: number; total_cents: number }[]
  breakdown: { key: string; count: number; total_cents: number }[]
  status: { key: string; count: number; total_cents: number }[]
  recent: DashboardDocument[]
  open_documents: DashboardDocument[]
  low_stock: DashboardStockRow[]
  subscription: Subscription | null
}
