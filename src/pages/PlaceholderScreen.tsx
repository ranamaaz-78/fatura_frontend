import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { t } from '../i18n'

export type PlaceholderScreenProps = {
  title: string
  subtitle?: string
  icon: LucideIcon
}

export function PlaceholderScreen({ title, subtitle, icon }: PlaceholderScreenProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <EmptyState
          icon={icon}
          title={t('common.empty', 'Nothing here yet')}
          description={t('common.placeholder', 'This screen is a placeholder. The module is not built yet.')}
        />
      </div>
    </div>
  )
}
