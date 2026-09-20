import { Link } from 'react-router-dom'
import { t } from '../../i18n'

function Home() {
  return (
    <section className="max-w-[1280px] mx-auto px-6 sm:px-8 py-16 sm:py-24">
      <h1 className="text-4xl sm:text-5xl md:text-[60px] font-bold tracking-tight leading-[1.12] text-[#0b1c30]">
        {t('public.homeTitle', 'Invoicing and stock, in one place')}
      </h1>
      <p className="mt-5 text-base sm:text-lg text-[#434655] leading-relaxed max-w-2xl">
        {t('public.homeBody', 'Fatura is a work tool for issuing invoices, scanning products and keeping stock under control. The product modules are being built.')}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/signup"
          className="h-11 px-5 rounded-lg bg-[#004ac6] text-white text-sm font-semibold inline-flex items-center hover:bg-[#2563eb] hover:shadow-lg hover:-translate-y-0.5 transition-transform"
        >
          {t('auth.signup', 'Create account')}
        </Link>
        <Link to="/login" className="h-11 px-5 rounded-lg border border-[#c3c6d7] text-[#0b1c30] text-sm font-semibold inline-flex items-center">
          {t('auth.login', 'Log in')}
        </Link>
      </div>
    </section>
  )
}

export default Home
