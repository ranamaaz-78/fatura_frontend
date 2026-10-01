import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../lib/cn'

export type FaqItem = { q: string; a: string }

/** One question open at a time. The answer height animates without measuring anything. */
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const on = open === index
        return (
          <div
            key={item.q}
            className={cn(
              'rounded-2xl border bg-white transition-all',
              on ? 'border-[#c3d4ff] shadow-[0_14px_34px_rgba(2,6,23,0.07)]' : 'border-[#e5eeff] hover:border-[#c3d4ff]',
            )}
          >
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`faq-${index}`}
                onClick={() => setOpen(on ? null : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-5 rounded-2xl px-6 py-5 text-left focus-visible:ring-2 focus-visible:ring-[#004ac6] focus-visible:outline-none"
              >
                <span className="text-[17px] font-bold text-[#0b1c30]">{item.q}</span>
                <span
                  className={cn(
                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                    on ? 'bg-[#004ac6] text-white' : 'bg-[#eff4ff] text-[#004ac6]',
                  )}
                >
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', on && 'rotate-180')} />
                </span>
              </button>
            </h3>
            <div
              id={`faq-${index}`}
              role="region"
              className={cn(
                'grid transition-[grid-template-rows] duration-300 ease-out',
                on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden">
                <p className="m-0 px-6 pb-6 text-[15.5px] leading-relaxed text-[#434655]">{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
