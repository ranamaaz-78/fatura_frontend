import { ScanLine } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { t } from '../i18n'

export function AuthLayout() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative bg-[#f8f9ff]">
      <div className="absolute top-6 right-6">
        <label className="sr-only" htmlFor="auth-language">
          {t('auth.language', 'Language')}
        </label>
        <select
          id="auth-language"
          defaultValue="en"
          className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
        >
          <option value="en">EN</option>
        </select>
      </div>
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-blue-600 text-white inline-flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </span>
          <span className="text-xl font-black tracking-tight text-slate-900">{t('app.name', 'Fatura')}</span>
        </Link>
        <Outlet />
      </div>
    </div>
  )
}
