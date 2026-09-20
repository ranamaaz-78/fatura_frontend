import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n'

export type AuthPlaceholderProps = {
  title: string
  subtitle: string
}

export function AuthPlaceholder({ title, subtitle }: AuthPlaceholderProps) {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <p className="text-slate-500">{t('auth.notWired', 'Authentication is not wired yet.')}</p>
      <Button fullWidth disabled>
        {title}
      </Button>
      <p className="text-center text-slate-500">
        <Link to="/" className="text-blue-700 font-medium">
          {t('public.backHome', 'Back to home')}
        </Link>
      </p>
    </div>
  )
}
