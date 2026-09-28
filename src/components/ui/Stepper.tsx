import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export type Step = {
  id: string
  label: string
}

export type StepperProps = {
  steps: Step[]
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center w-full">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current

        return (
          <li key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-semibold border',
                  done && 'bg-emerald-600 text-white border-emerald-600',
                  active && 'bg-brand-600 text-brand-on border-brand-600',
                  !done && !active && 'bg-card text-ink-muted border-line',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : index + 1}
              </span>
              <span className="text-center text-[11px] font-medium text-ink-muted">{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <div className={cn('mx-2 h-px flex-1', index < current ? 'bg-emerald-600' : 'bg-line')} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
