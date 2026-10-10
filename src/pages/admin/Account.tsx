import { KeyRound, LifeBuoy } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { ChangePasswordForm } from '../../components/account/ChangePasswordForm'
import { PageHeader } from '../../components/ui/PageHeader'
import { t } from '../../i18n'

/** The platform admin's own account: who they are signed in as, and their password. */
export default function AdminAccount() {
  const { session } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('admin.accountTitle', 'My account')}
        subtitle={session?.user.email ?? t('admin.accountHint', 'Your own sign-in details.')}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
            <KeyRound className="h-4 w-4 text-brand-600" />
            {t('admin.changePassword', 'Change password')}
          </h2>
          <ChangePasswordForm scope="admin" />
        </section>

        <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-ink">
            <LifeBuoy className="h-4 w-4 text-brand-600" />
            {t('admin.forgotTitle', 'Forgot your password?')}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            {t(
              'admin.forgotBody',
              'If you cannot sign in, open the sign-in page and choose "Forgot password". Enter your email and we send a link to set a new one. Changing your password here signs you out of every other device.',
            )}
          </p>
        </section>
      </div>
    </div>
  )
}
