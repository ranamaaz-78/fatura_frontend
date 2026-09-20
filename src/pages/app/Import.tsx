import { FileSpreadsheet } from 'lucide-react'
import { PlaceholderScreen } from '../PlaceholderScreen'
import { t } from '../../i18n'

function Page() {
  return (
    <PlaceholderScreen
      title={t('nav.import', 'Import Excel / CSV')}
      subtitle={t('common.placeholder', 'This screen is a placeholder. The module is not built yet.')}
      icon={FileSpreadsheet}
    />
  )
}

export default Page
