import { FlaskConical, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/ui/Toast'
import { t } from '../i18n'
import { getErrorMessage } from '../services/api'
import { setDemoCardHidden, useDemoCardHidden } from './cardPref'

/**
 * On the dashboard of a real company: the way into the shared demo account, a safe copy of the system to practice in.
 * Never shown inside the demo itself.
 */
export function DemoEntryCard() {
  const { session, enterDemo } = useAuth()
  const { push } = useToast()
  const [going, setGoing] = useState(false)
  const hidden = useDemoCardHidden()

  if (!session?.company || session.company.is_demo || session.demo_enabled === false || hidden) return null

  async function go() {
    setGoing(true)
    try {
      await enterDemo()
    } catch (error) {
      push({ tone: 'danger', title: getErrorMessage(error) })
      setGoing(false)
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-line/80 bg-card p-4 shadow-xs print:hidden">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600/12 text-brand-600">
        <FlaskConical className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-bold text-ink">{t('demo.cardTitle', 'Practice in the demo account')}</h2>
        <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">
          {t('demo.cardBody', 'A safe copy of the system with sample products, clients and invoices, shared with everyone and cleared every night. Make sales, print invoices, add products: nothing touches your own data. Take the guided tour to see everything.')}
        </p>
      </div>
      <button
        type="button"
        disabled={going}
        onClick={() => void go()}
        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-brand-on transition hover:bg-brand-500 disabled:opacity-60"
      >
        {going ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
        {t('demo.enter', 'Practice in the demo')}
      </button>
      <button
        type="button"
        onClick={() => setDemoCardHidden(true)}
        aria-label={t('demo.hideCard', 'Hide this card. You can turn it back on in Settings.')}
        title={t('demo.hideCard', 'Hide this card. You can turn it back on in Settings.')}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition hover:bg-elevated hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}
