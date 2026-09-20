import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.pendingTitle', 'Pending activation')}
      subtitle={t('auth.pendingSubtitle', 'Your workspace is waiting for approval')}
    />
  )
}

export default Page
