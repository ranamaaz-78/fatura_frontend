import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { TOUR_STEPS } from './steps'

type Box = { top: number; left: number; width: number; height: number }

const CARD_WIDTH = 360
const CARD_HEIGHT = 270
const GAP = 16
const EDGE = 12
const PAD = 8

/** The first element carrying this `data-tour` that is really on screen (a hidden one has no size). */
function findTarget(name: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return node
  }
  return null
}

const sameBox = (a: Box | null, b: Box) => a !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height

/** Where the card sits: beside the spotlight when there is room, otherwise below, above, or tucked in a corner. Always top + left, so it can glide between stops. */
function cardPosition(box: Box | null): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(CARD_WIDTH, vw - 24)

  const clampTop = (top: number) => Math.max(EDGE, Math.min(top, vh - CARD_HEIGHT - EDGE))
  const clampLeft = (left: number) => Math.max(EDGE, Math.min(left, vw - width - EDGE))
  const corner = { top: clampTop(vh - CARD_HEIGHT - 28), left: clampLeft(vw - width - 28) }

  if (box === null) return { top: clampTop((vh - CARD_HEIGHT) / 2), left: clampLeft((vw - width) / 2) }

  // A target that fills most of the window (a whole page): the card goes to the corner, out of the way.
  if (box.width > vw * 0.6 && box.height > vh * 0.6) return corner

  if (vw - (box.left + box.width) >= width + GAP + EDGE) return { top: clampTop(box.top), left: box.left + box.width + GAP + PAD }
  if (box.left >= width + GAP + EDGE) return { top: clampTop(box.top), left: box.left - width - GAP - PAD }
  if (box.top + box.height + GAP + CARD_HEIGHT + EDGE <= vh) return { top: box.top + box.height + GAP + PAD, left: clampLeft(box.left) }
  if (box.top >= CARD_HEIGHT + GAP + EDGE) return { top: box.top - CARD_HEIGHT - GAP - PAD, left: clampLeft(box.left) }

  return corner
}

/**
 * The guided tour of the demo: dims the page, lights up the part being explained and tells what it is for, one stop at
 * a time (Back / Next / Skip). It never blocks the page, so the visitor can try each thing right there while it is lit.
 */
export function DemoTour({ index, onIndex, onClose }: { index: number; onIndex: (next: number) => void; onClose: (finished: boolean) => void }) {
  const step = TOUR_STEPS[Math.min(index, TOUR_STEPS.length - 1)]!
  const last = index >= TOUR_STEPS.length - 1
  const navigate = useNavigate()
  const location = useLocation()
  // The spotlight's place, and which stop it belongs to: the card only shows once it knows where its own stop is.
  const [view, setView] = useState<{ box: Box | null; stop: string }>({ box: null, stop: '' })
  const box = view.box
  const ready = view.stop === step.id

  // Take the app to where this stop is. Only when the stop changes: the visitor may go elsewhere meanwhile.
  useEffect(() => {
    if (step.route && `${location.pathname}${location.search}` !== step.route) navigate(step.route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  // Follow the target: it may not be there yet (the page is still loading), and it moves when the window does.
  useEffect(() => {
    const target = step.target
    if (!target) {
      setView({ box: null, stop: step.id })
      return
    }

    // Between two stops the old spotlight stays until the new target shows up (the page is still loading), so the
    // screen never flashes. If it never shows up, the page is simply dimmed and the card sits in the middle.
    let scrolled = false
    let misses = 0
    const look = () => {
      const element = findTarget(target)
      if (!element) {
        misses += 1
        if (misses > 8) setView((current) => (current.box === null && current.stop === step.id ? current : { box: null, stop: step.id }))
        return
      }
      misses = 0
      if (!scrolled) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        scrolled = true
      }
      const rect = element.getBoundingClientRect()
      const next = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      setView((current) => (current.stop === step.id && sameBox(current.box, next) ? current : { box: next, stop: step.id }))
    }

    look()
    const timer = window.setInterval(look, 200)
    return () => window.clearInterval(timer)
  }, [step.id, step.target])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = event.target instanceof HTMLElement && /^(input|textarea|select)$/i.test(event.target.tagName)
      if (event.key === 'Escape') onClose(false)
      else if (!typing && event.key === 'ArrowRight') last ? onClose(true) : onIndex(index + 1)
      else if (!typing && event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [index, last, onClose, onIndex])

  const position = cardPosition(box)

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] print:hidden" role="dialog" aria-label={step.title}>
      {/* One element for every stop: it glides to the next target, or closes down to a point in the middle (page dimmed). The card does not glide: it fades in beside the new target. */}
      <span
        aria-hidden
        className={cn('fixed rounded-2xl ring-2 transition-all duration-300 ease-out', box ? 'ring-white/90' : 'ring-transparent')}
        style={
          box
            ? { top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)' }
            : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)' }
        }
      />

      <div
        className={cn('pointer-events-auto fixed flex flex-col rounded-2xl border border-line bg-card p-5 text-ink shadow-[0_30px_70px_-20px_rgba(2,6,23,0.6)] transition-opacity ease-out', ready ? 'opacity-100 duration-200' : 'pointer-events-none opacity-0 duration-0')}
        style={{ width: CARD_WIDTH, maxWidth: 'calc(100vw - 24px)', ...position }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold tracking-[0.12em] text-brand-600 uppercase">
            {t('tour.step', 'Step {current} of {total}', { current: index + 1, total: TOUR_STEPS.length })}
          </p>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label={t('tour.skip', 'Skip the tour')}
            title={t('tour.skip', 'Skip the tour')}
            className="-mt-1 -mr-1 cursor-pointer rounded-lg p-1.5 text-ink-muted transition hover:bg-page hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div key={step.id} className="tour-words">
          <h3 className="mt-2 text-[18px] leading-snug font-extrabold tracking-[-0.02em]">{step.title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{step.body}</p>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="cursor-pointer rounded-lg px-2 py-2 text-xs font-semibold text-ink-muted transition hover:text-ink"
          >
            {t('tour.skip', 'Skip the tour')}
          </button>
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onIndex(index - 1)}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('tour.back', 'Back')}
            </button>
            <button
              type="button"
              onClick={() => (last ? onClose(true) : onIndex(index + 1))}
              className={cn('inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-brand-on transition hover:bg-brand-500')}
            >
              {last ? t('tour.finish', 'Finish') : t('tour.next', 'Next')}
              {last ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
