import { FlaskConical, LogOut, Route } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { t } from '../i18n'
import { cn } from '../lib/cn'
import { DemoTour } from './tour/DemoTour'
import { TOUR_STEPS } from './tour/steps'

const TOUR_KEY = 'demo_tour'
const SEEN_KEY = 'demo_tour_seen'

type Saved = { open: boolean; index: number }

function readSaved(): Saved {
  try {
    const raw = window.sessionStorage.getItem(TOUR_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Saved>) : null
    const index = Number(parsed?.index)
    return { open: Boolean(parsed?.open), index: Number.isInteger(index) && index >= 0 && index < TOUR_STEPS.length ? index : 0 }
  } catch {
    return { open: false, index: 0 }
  }
}

function write(value: Saved): void {
  try {
    window.sessionStorage.setItem(TOUR_KEY, JSON.stringify(value))
  } catch {
    /* the tour just is not remembered across a reload */
  }
}

/**
 * Everything the shared demo adds to the screen: the strip on top that says where you are (with the way out), and the
 * guided tour. Shown only inside the demo account, in the website and in the Windows app alike.
 */
export function DemoLayer() {
  const { session, exitDemo } = useAuth()
  const [tour, setTour] = useState<Saved>(readSaved)
  const [seen, setSeen] = useState(() => {
    try {
      return window.sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return true
    }
  })
  const [leaving, setLeaving] = useState(false)

  const update = useCallback((next: Saved) => {
    setTour(next)
    write(next)
  }, [])

  const markSeen = useCallback(() => {
    setSeen(true)
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  if (!session?.company?.is_demo) return null

  return (
    <>
      <div
        role="status"
        className="relative z-30 flex flex-wrap items-center gap-x-4 gap-y-2 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-brand-on print:hidden"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-bold">
          <FlaskConical className="h-4 w-4" />
          {t('demo.mode', 'Demo mode')}
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-snug opacity-90">
          {t('demo.bannerText', 'A practice account shared with everyone: what you add may be seen by others, and it is all cleared every night.')}
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              markSeen()
              update({ open: true, index: tour.open ? tour.index : 0 })
            }}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/20 px-3 text-[12px] font-semibold ring-1 ring-white/30 transition hover:bg-white/30',
              !seen && 'animate-pulse',
            )}
          >
            <Route className="h-3.5 w-3.5" />
            {t('demo.takeTour', 'Take the tour')}
          </button>
          <button
            type="button"
            disabled={leaving}
            onClick={() => {
              setLeaving(true)
              update({ open: false, index: 0 })
              void exitDemo().finally(() => setLeaving(false))
            }}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-bold text-brand-600 transition hover:bg-white/90 disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('demo.exit', 'Exit demo')}
          </button>
        </span>
      </div>

      {tour.open ? (
        <DemoTour
          index={tour.index}
          onIndex={(index) => update({ open: true, index })}
          onClose={(finished) => update({ open: false, index: finished ? 0 : tour.index })}
        />
      ) : null}
    </>
  )
}
