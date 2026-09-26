import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireGuest, RequireRole } from './auth/guards'
import { AdminLayout } from './layouts/AdminLayout'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'
import { PublicLayout } from './layouts/PublicLayout'
import AdminApplicationsPage from './pages/admin/Applications'
import AuditLogsPage from './pages/admin/AuditLogs'
import AdminCompaniesPage from './pages/admin/Companies'
import AdminCompanyDetailPage from './pages/admin/CompanyDetail'
import AdminDashboardPage from './pages/admin/Dashboard'
import AdminPaymentMethodsPage from './pages/admin/PaymentMethods'
import AdminPlansPage from './pages/admin/Plans'
import AdminReportsPage from './pages/admin/Reports'
import AdminUsersPage from './pages/admin/Users'
import ForgotPasswordPage from './pages/auth/ForgotPassword'
import LoginPage from './pages/auth/Login'
import ResetPasswordPage from './pages/auth/ResetPassword'
import SetPasswordPage from './pages/auth/SetPassword'
import UiGallery from './pages/dev/UiGallery'
import CustomersPage from './pages/app/Customers'
import DashboardPage from './pages/app/Dashboard'
import ImportPage from './pages/app/Import'
import InvoiceDetailPage from './pages/app/InvoiceDetail'
import InvoiceNewPage from './pages/app/InvoiceNew'
import InvoicesPage from './pages/app/Invoices'
import PaymentsPage from './pages/app/Payments'
import ProductImagesPage from './pages/app/ProductImages'
import ProductsPage from './pages/app/Products'
import ProformasPage from './pages/app/Proformas'
import PurchasesPage from './pages/app/Purchases'
import QuotesPage from './pages/app/Quotes'
import ReportsPage from './pages/app/Reports'
import SettingsPage from './pages/app/Settings'
import StockPage from './pages/app/Stock'
import StockMovementsPage from './pages/app/StockMovements'
import SubscriptionPage from './pages/app/Subscription'
import SuppliersPage from './pages/app/Suppliers'
import AboutPage from './pages/public/About'
import ApplyPage from './pages/public/Apply'
import ContactPage from './pages/public/Contact'
import FeaturesPage from './pages/public/Features'
import HomePage from './pages/public/Home'
import PricingPage from './pages/public/Pricing'
import PrivacyPage from './pages/public/Privacy'
import TermsPage from './pages/public/Terms'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Apply brings its own shell: no site navbar or footer. */}
          <Route path="/apply" element={<ApplyPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>

          <Route element={<RequireGuest />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          <Route element={<RequireRole roles={['business_admin', 'staff']} />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="invoices/new" element={<InvoiceNewPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="proformas" element={<ProformasPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="product-images" element={<ProductImagesPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="stock/movements" element={<StockMovementsPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<RequireRole roles={['super_admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="companies" element={<AdminCompaniesPage />} />
              <Route path="companies/:id" element={<AdminCompanyDetailPage />} />
              <Route path="plans" element={<AdminPlansPage />} />
              <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Route>

          <Route path="/dev/ui" element={<UiGallery />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
