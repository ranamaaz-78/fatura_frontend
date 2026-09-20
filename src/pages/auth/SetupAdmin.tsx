import { AuthPlaceholder } from './AuthPlaceholder'
import { t } from '../../i18n'

function Page() {
  return (
    <AuthPlaceholder
      title={t('auth.setupTitle', 'Create platform admin')}
      subtitle={t('auth.setupSubtitle', 'First-time platform setup')}
    />
  )
}

export default Page
