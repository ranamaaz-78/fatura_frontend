import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.resetTitle', 'Reset password')}
      subtitle={t('auth.resetSubtitle', 'Choose a new password')}
    />
  )
}

export default Page
