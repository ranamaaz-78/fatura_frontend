import { Truck } from 'lucide-react'
import { PlaceholderScreen } from '../PlaceholderScreen'
import { t } from '../../i18n'

function Page() {
  return (
    <PlaceholderScreen
      title={t('nav.suppliers', 'Suppliers')}
      subtitle={t('common.placeholder', 'This screen is a placeholder. The module is not built yet.')}
      icon={Truck}
    />
  )
}

export default Page
