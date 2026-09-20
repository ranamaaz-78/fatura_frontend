import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.signupTitle', 'Create account')}
      subtitle={t('auth.signupSubtitle', 'Start a new Fatura workspace')}
    />
  )
}

export default Page
