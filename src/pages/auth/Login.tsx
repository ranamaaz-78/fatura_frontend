import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.loginTitle', 'Log in')}
      subtitle={t('auth.loginSubtitle', 'Sign in to your workspace')}
    />
  )
}

export default Page
