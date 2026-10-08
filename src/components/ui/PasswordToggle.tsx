import { Eye, EyeOff } from 'lucide-react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

/** The eye button inside a password field: shows the password as text, or hides it again. */
export function PasswordToggle({ shown, onToggle, className }: { shown: boolean; onToggle: () => void; className?: string }) {
  const label = shown ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={shown}
      title={label}
      className={cn(
        'absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748b] transition-colors hover:bg-slate-500/10 hover:text-[#0b1c30] focus-visible:ring-2 focus-visible:ring-[#004ac6]/40 focus-visible:outline-none',
        className,
      )}
    >
      {shown ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
    </button>
  )
}
