import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireGuest, RequireRole, RequireSetupDone } from './auth/guards'
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
import CompanySetupPage from './pages/app/CompanySetup'
import CustomersPage from './pages/app/Customers'
import DashboardPage from './pages/app/Dashboard'
import ImportPage from './pages/app/Import'
import DeliveryNotesPage from './pages/app/DeliveryNotes'
import InvoiceDetailPage from './pages/app/InvoiceDetail'
import InvoiceNewPage from './pages/app/InvoiceNew'
import InvoicesPage from './pages/app/Invoices'
import PaymentsPage from './pages/app/Payments'
import PrintablesPage from './pages/app/Printables'
import ProductImagesPage from './pages/app/ProductImages'
import ProductsPage from './pages/app/Products'
import ProformasPage from './pages/app/Proformas'
import PurchasesPage from './pages/app/Purchases'
import QuotesPage from './pages/app/Quotes'
import ReportsPage from './pages/app/Reports'
import SettingsPage from './pages/app/Settings'
import StockPage from './pages/app/Stock'
import StockMovementsPage from './pages/app/StockMovements'
import SuppliersPage from './pages/app/Suppliers'
import ApplyPage from './pages/public/Apply'
import HomePage from './pages/public/Home'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Apply brings its own shell: no site navbar or footer. */}
          <Route path="/apply" element={<ApplyPage />} />

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            {/* The site is one landing page now. Old links land on the matching section. */}
            <Route path="/features" element={<Navigate to="/#features" replace />} />
            <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
            <Route path="/about" element={<Navigate to="/#about" replace />} />
            <Route path="/contact" element={<Navigate to="/#contact" replace />} />
            <Route path="/terms" element={<Navigate to="/#terms" replace />} />
            <Route path="/privacy" element={<Navigate to="/#privacy" replace />} />
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
            {/* The company setup steps sit outside the workspace shell: the workspace is closed until they are done. */}
            <Route path="/app/setup" element={<CompanySetupPage />} />
            <Route element={<RequireSetupDone />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="subscription" element={<Navigate to="/app/settings?tab=subscription" replace />} />
              <Route path="invoices/new" element={<InvoiceNewPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="delivery-notes" element={<DeliveryNotesPage />} />
              <Route path="delivery-notes/:id" element={<InvoiceDetailPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/:id/edit" element={<InvoiceNewPage />} />
              <Route path="quotes/:id" element={<InvoiceDetailPage />} />
              <Route path="proformas" element={<ProformasPage />} />
              <Route path="proformas/:id" element={<InvoiceDetailPage />} />
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
              <Route path="printables" element={<PrintablesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
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
