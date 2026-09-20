import { FileCheck2 } from 'lucide-react'
import { PlaceholderScreen } from '../PlaceholderScreen'
import { t } from '../../i18n'

function Page() {
  return (
    <PlaceholderScreen
      title={t('nav.proformas', 'Proformas')}
      subtitle={t('common.placeholder', 'This screen is a placeholder. The module is not built yet.')}
      icon={FileCheck2}
    />
  )
}

export default Page
