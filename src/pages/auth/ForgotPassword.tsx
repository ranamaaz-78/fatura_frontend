import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.forgotTitle', 'Forgot password')}
      subtitle={t('auth.forgotSubtitle', 'We will send a reset link')}
    />
  )
}

export default Page
