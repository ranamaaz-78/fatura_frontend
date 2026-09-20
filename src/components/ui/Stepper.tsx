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
                  active && 'bg-blue-600 text-white border-blue-600',
                  !done && !active && 'bg-white text-slate-500 border-slate-200',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : index + 1}
              </span>
              <span className="text-[11px] font-medium text-slate-500 text-center">{step.label}</span>
            </div>
            {index < steps.length - 1 ? (
              <div className={cn('flex-1 h-px mx-2', index < current ? 'bg-emerald-600' : 'bg-slate-200')} />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
