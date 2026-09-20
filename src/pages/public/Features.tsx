import { t } from '../../i18n'
import { PublicSimplePage } from './PublicSimplePage'

function Page() {
  return (
    <PublicSimplePage
      title={t('nav.features', 'Features')}
      body={t('public.placeholderBody', 'This page is a placeholder.')}
    />
  )
}

export default Page
