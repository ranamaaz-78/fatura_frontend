import { useEffect, useRef } from 'react'

const COLORS = ['#004ac6', '#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ffffff']

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  color: string
}

type ConfettiBurstProps = {
  play: boolean
  onDone?: () => void
}

export function ConfettiBurst({ play, onDone }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!play) return

    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      onDoneRef.current?.()
      return
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const pieces: Piece[] = Array.from({ length: 140 }, () => {
      const fromLeft = Math.random() < 0.5
      return {
        x: fromLeft ? Math.random() * canvas.width * 0.35 : canvas.width * 0.65 + Math.random() * canvas.width * 0.35,
        y: -20 - Math.random() * 80,
        vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 7),
        vy: 4 + Math.random() * 8,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      }
    })

    let raf = 0
    const started = performance.now()

    const tick = (now: number) => {
      const elapsed = now - started
      context.clearRect(0, 0, canvas.width, canvas.height)

      for (const piece of pieces) {
        piece.x += piece.vx
        piece.y += piece.vy
        piece.vy += 0.12
        piece.vx *= 0.99
        piece.rot += piece.vr

        context.save()
        context.translate(piece.x, piece.y)
        context.rotate(piece.rot)
        context.globalAlpha = elapsed > 1800 ? Math.max(0, 1 - (elapsed - 1800) / 700) : 1
        context.fillStyle = piece.color
        context.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h)
        context.restore()
      }

      if (elapsed < 2500) {
        raf = window.requestAnimationFrame(tick)
      } else {
        context.clearRect(0, 0, canvas.width, canvas.height)
        onDoneRef.current?.()
      }
    }

    raf = window.requestAnimationFrame(tick)
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [play])

  if (!play) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[80] print:hidden"
      aria-hidden
    />
  )
}
