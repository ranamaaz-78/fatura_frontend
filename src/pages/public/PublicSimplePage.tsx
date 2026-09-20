import { Link } from 'react-router-dom'
import { t } from '../../i18n'

export type PublicSimplePageProps = {
  title: string
  body: string
}

export function PublicSimplePage({ title, body }: PublicSimplePageProps) {
  return (
    <section className="max-w-[1280px] mx-auto px-6 sm:px-8 py-16 space-y-4">
      <h1 className="text-4xl font-bold tracking-tight text-[#0b1c30]">{title}</h1>
      <p className="text-base sm:text-lg text-[#434655] leading-relaxed max-w-2xl">{body}</p>
      <Link to="/" className="text-sm font-medium text-[#004ac6]">
        {t('public.backHome', 'Back to home')}
      </Link>
    </section>
  )
}
