import { ChevronLeft } from 'lucide-react'
import { t } from '../../i18n'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'

export type TopBarProps = {
  title: string
  showBack?: boolean
  onBack?: () => void
  onMenu?: () => void
}

export function TopBar({ title, showBack, onBack, onMenu }: TopBarProps) {
  return (
    <header className="lg:hidden h-14 bg-card border-b border-line flex items-center justify-between px-4 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="w-11 flex items-center">
        {showBack ? (
          <IconButton label={t('common.back', 'Back')} onClick={onBack}>
            <ChevronLeft className="w-6 h-6" />
          </IconButton>
        ) : (
          <Tooltip content={t('nav.companyMenu', 'Company menu')}>
            <button type="button" onClick={onMenu} className="rounded-full" aria-label={t('nav.companyMenu', 'Company menu')}>
              <Avatar name={t('nav.companyName', 'YK Digital Solutions')} size="sm" />
            </button>
          </Tooltip>
        )}
      </div>
      <h1 className="text-[15px] font-semibold text-ink truncate text-center flex-1 px-2">{title}</h1>
      <div className="w-11" />
    </header>
  )
}
