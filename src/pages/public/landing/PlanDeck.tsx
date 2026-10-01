import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '../../../i18n'
import { cn } from '../../../lib/cn'
import { formatPlanPrice } from '../../../lib/format'
import type { Plan } from '../../../types/module01'
import { PlanCard } from '../PricingCards'

/** How far each card behind peeks out above the one in front, in px. */
const PEEK = 22
/** Cards beyond this many places back are tucked out of sight. */
const VISIBLE_BEHIND = 2
const MOVE_MS = 640
const SWIPE_PX = 56
/** How long each plan stays in front while the deck turns by itself. */
const AUTOPLAY_MS = 5000

type Pose = CSSProperties

/** Where a card sits, given how many places it is behind the front one. */
function poseFor(offset: number, count: number, leaving: boolean): Pose {
  if (leaving) {
    // The card that was in front swings out to the side, then drops in at the back.
    return {
      transform: 'translate3d(58%, 6%, 0) rotate(8deg)',
      opacity: 0,
      zIndex: count + 2,
      filter: 'none',
    }
  }

  if (offset === 0) {
    return { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, zIndex: count, filter: 'none' }
  }

  const shown = offset <= VISIBLE_BEHIND
  return {
    transform: `translate3d(0, ${-PEEK * Math.min(offset, VISIBLE_BEHIND)}px, 0) scale(${1 - 0.05 * Math.min(offset, VISIBLE_BEHIND)})`,
    opacity: shown ? 1 : 0,
    zIndex: count - offset,
    filter: shown ? `brightness(${1 - 0.07 * offset})` : 'none',
  }
}

/**
 * Plans as a stack of cards. The front one is the plan in view; the others sit behind it, and
 * moving on sends the front card to the back while the next one comes forward. Arrows, plan
 * chips, the keyboard, a swipe, or a click on a card behind all move the stack.
 */
export function PlanDeck({ plans }: { plans: Plan[] }) {
  const count = plans.length
  const [active, setActive] = useState(() => Math.max(0, plans.findIndex((plan) => plan.is_featured)))
  const [leaving, setLeaving] = useState<number | null>(null)
  const busy = useRef(false)
  const timer = useRef<number | null>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const nextRef = useRef<() => void>(() => {})
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(true)
  const [reduced, setReduced] = useState(false)

  // A plan list that shrinks (or reloads) must not leave the front card pointing at nothing.
  const front = Math.min(active, Math.max(count - 1, 0))

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // Only turn while the deck is on screen.
  useEffect(() => {
    const node = root.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [count])

  const running = !hovered && !focused && visible && !reduced && count > 1
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => nextRef.current(), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [running, front])

  if (count === 0) return null

  if (count === 1) {
    return <PlanCard plan={plans[0]} tone="onDark" />
  }

  function next() {
    if (busy.current) return
    busy.current = true
    setLeaving(front)
    setActive((front + 1) % count)
    timer.current = window.setTimeout(() => {
      setLeaving(null)
      busy.current = false
    }, MOVE_MS * 0.62)
  }

  nextRef.current = next

  function previous() {
    if (busy.current) return
    setLeaving(null)
    setActive((front - 1 + count) % count)
  }

  function go(index: number) {
    if (index === front) return
    if (index === (front + 1) % count) next()
    else {
      setLeaving(null)
      setActive(index)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      next()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      previous()
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    drag.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) next()
    else previous()
  }

  const behind = Math.min(count - 1, VISIBLE_BEHIND)
  const current = plans[front]

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={t('public.plansLabel', 'Plans')}
      ref={root}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(event) => setFocused(event.target.matches(':focus-visible'))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
      className="w-full max-w-[460px] rounded-[32px] outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/70 focus-visible:ring-offset-8 focus-visible:ring-offset-[#0b1c30]"
    >
      <div
        className="grid touch-pan-y"
        style={{ paddingTop: PEEK * behind }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        {plans.map((plan, index) => {
          const offset = (index - front + count) % count
          const isFront = offset === 0
          return (
            <div
              key={plan.id}
              aria-hidden={!isFront}
              {...(isFront ? {} : { inert: true })}
              onClick={isFront ? undefined : () => go(index)}
              // Movement takes the full time; the fade and dimming settle a little quicker.
              style={{
                ...poseFor(offset, count, leaving === index),
                transitionDuration: `${MOVE_MS}ms, ${MOVE_MS * 0.7}ms, ${MOVE_MS * 0.7}ms`,
              }}
              className={cn(
                'origin-top [grid-area:1/1] will-change-transform',
                'transition-[transform,opacity,filter] ease-[cubic-bezier(0.22,0.9,0.3,1)] motion-reduce:transition-none',
                isFront ? 'cursor-auto' : 'cursor-pointer',
              )}
            >
              <PlanCard plan={plan} tone="onDark" className="h-full" />
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={previous}
          aria-label={t('public.planPrevious', 'Previous plan')}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/16 bg-white/8 text-white transition-colors hover:bg-white/16 focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div role="tablist" aria-label={t('public.plansLabel', 'Plans')} className="flex min-w-0 flex-1 flex-wrap justify-center gap-2">
          {plans.map((plan, index) => {
            const on = index === front
            return (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => go(index)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none',
                  on
                    ? 'border-transparent bg-white text-[#0b1c30] shadow-[0_8px_22px_rgba(2,6,23,0.35)]'
                    : 'border-white/16 bg-white/5 text-[#cbd5e1] hover:bg-white/12 hover:text-white',
                )}
              >
                {plan.name}
                <span className={cn('text-[13px]', on ? 'text-[#004ac6]' : 'text-[#94a3b8]')}>
                  {formatPlanPrice(plan.price, plan.currency)}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label={t('public.planNext', 'Next plan')}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/16 bg-white/8 text-white transition-colors hover:bg-white/16 focus-visible:ring-2 focus-visible:ring-[#4edea3] focus-visible:outline-none"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {t('public.planOf', 'Plan {n} of {total}: {name}')
          .replace('{n}', String(front + 1))
          .replace('{total}', String(count))
          .replace('{name}', current.name)}
      </p>
    </div>
  )
}
