import { ChevronLeft } from 'lucide-react'
import { t } from '../../i18n'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'

export type TopBarProps = {
  title: string
  showBack?: boolean
  onBack?: () => void
  onMenu?: () => void
}

export function TopBar({ title, showBack, onBack, onMenu }: TopBarProps) {
  return (
    <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="w-11 flex items-center">
        {showBack ? (
          <IconButton label={t('common.back', 'Back')} onClick={onBack}>
            <ChevronLeft className="w-6 h-6" />
          </IconButton>
        ) : (
          <button type="button" onClick={onMenu} className="rounded-full" aria-label={t('nav.companyMenu', 'Company menu')}>
            <Avatar name={t('nav.companyName', 'Fatura Demo')} size="sm" />
          </button>
        )}
      </div>
      <h1 className="text-[15px] font-semibold text-slate-900 truncate text-center flex-1 px-2">{title}</h1>
      <div className="w-11" />
    </header>
  )
}
