import { Link } from 'react-router-dom'
import { t } from '../../i18n'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-12 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <p className="text-sm">{t('app.name', 'Fatura')}</p>
        <div className="flex gap-4 text-sm">
          <Link to="/terms" className="hover:text-white">
            {t('nav.terms', 'Terms')}
          </Link>
          <Link to="/privacy" className="hover:text-white">
            {t('nav.privacy', 'Privacy')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
