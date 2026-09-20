import { ShieldCheck } from 'lucide-react'
import { PlaceholderScreen } from '../PlaceholderScreen'
import { t } from '../../i18n'

function Page() {
  return (
    <PlaceholderScreen
      title={t('nav.auditLogs', 'Audit logs')}
      subtitle={t('common.placeholder', 'This screen is a placeholder. The module is not built yet.')}
      icon={ShieldCheck}
    />
  )
}

export default Page
