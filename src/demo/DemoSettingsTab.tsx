import { FlaskConical, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Toggle } from '../components/ui/Toggle'
import { useToast } from '../components/ui/Toast'
import { t } from '../i18n'
import { getErrorMessage } from '../services/api'
import { setDemoCardHidden, useDemoCardHidden } from './cardPref'

/** Settings → Demo: bring the dashboard card back after closing it, or go into the practice account from here. */
export function DemoSettingsTab() {
  const { enterDemo } = useAuth()
  const { push } = useToast()
  const hidden = useDemoCardHidden()
  const [going, setGoing] = useState(false)

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
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{t('demo.cardTitle', 'Practice in the demo account')}</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
          {t('demo.settingsBody', 'A safe copy of the system, shared with everyone and cleared every night. Nothing you do there touches your own data.')}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/80 p-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">{t('demo.showCard', 'Show the demo card on my dashboard')}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{t('demo.showCardHint', 'Only on this device. You can close the card on the dashboard and turn it back on here.')}</p>
        </div>
        <Toggle checked={!hidden} onChange={(next) => setDemoCardHidden(!next)} label={!hidden ? t('demoAdmin.on', 'On') : t('demoAdmin.off', 'Off')} />
      </div>

      <div>
        <button
          type="button"
          disabled={going}
          onClick={() => void go()}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-brand-on transition hover:bg-brand-500 disabled:opacity-60"
        >
          {going ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          {t('demo.enter', 'Practice in the demo')}
        </button>
      </div>
    </div>
  )
}
