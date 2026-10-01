import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from '../../../i18n'
import { supportEmail, supportWhatsappUrl } from '../../../lib/support'

type Section = { heading: string; body: string[] }

type Doc = { title: string; updated: string; intro: string; sections: Section[] }

const DOCS: Record<'terms' | 'privacy', Doc> = {
  terms: {
    title: 'Terms of service',
    updated: 'October 2026',
    intro: 'The short version of how YK Digital Solutions works. If anything here is unclear, ask us before you apply.',
    sections: [
      {
        heading: 'The service',
        body: [
          'YK Digital Solutions is invoicing, stock and barcode software for small businesses, available on the web, with Android and iPhone apps coming soon.',
          'You apply, our team calls you to confirm your details, and we activate your plan. Your plan runs for one period from the day it is activated.',
        ],
      },
      {
        heading: 'Price and payment',
        body: [
          'There is no setup fee and no long contract. You pay period to period, and we agree the payment method with you on the setup call.',
        ],
      },
      {
        heading: 'If a period ends',
        body: [
          'You can cancel at any time. If a period ends without renewal, your account pauses. Nothing is deleted, and everything is back as soon as you renew.',
        ],
      },
      {
        heading: 'Your data and your responsibilities',
        body: [
          'The products, clients, invoices and other records you enter belong to your business and are private to it.',
          'You are responsible for the accuracy of what you issue, including the tax rates and tax details you set, and for following the tax rules that apply to you. Keep your password safe and tell us if you think someone else has it.',
        ],
      },
      {
        heading: 'Fair use',
        body: ['Do not use the service for anything unlawful, to harm others, or to try to reach another business’s data.'],
      },
      {
        heading: 'Changes',
        body: ['We may improve the service and update these terms. When we make a meaningful change we will tell you.'],
      },
    ],
  },
  privacy: {
    title: 'Privacy',
    updated: 'October 2026',
    intro: 'What we collect, why, and who sees it. We keep it to what we need to run the service.',
    sections: [
      {
        heading: 'When you apply',
        body: [
          'We collect your name, business name, email, phone and WhatsApp number, city and country, the plan you picked, and anything you choose to write in the message box.',
          'We also record your IP address and browser details to protect the form from spam, and we email you a one-time code to confirm the address is yours.',
        ],
      },
      {
        heading: 'Why we use it',
        body: [
          'To contact you, set up your account and answer your questions. We do not sell your details and we do not use them for advertising.',
        ],
      },
      {
        heading: 'Who handles it',
        body: [
          'Only our team sees your application. We use email and WhatsApp to reach you, so those services carry the messages we send.',
        ],
      },
      {
        heading: 'Once you are a customer',
        body: [
          'Your products, clients, invoices and other records are stored separately for each business and are not visible to any other business.',
        ],
      },
      {
        heading: 'This website',
        body: [
          'We do not run advertising trackers. The site remembers your theme choice and, if you log in, your session on your own device. Fonts are loaded from Google Fonts.',
        ],
      },
      {
        heading: 'Your rights',
        body: ['You can ask to see, correct or delete the details we hold about you at any time. Write to us using the contact details on this page.'],
      },
    ],
  },
}

export function LegalDialog() {
  const { hash } = useLocation()
  const navigate = useNavigate()
  const panel = useRef<HTMLDivElement>(null)

  const key = hash === '#terms' ? 'terms' : hash === '#privacy' ? 'privacy' : null
  const doc = key ? DOCS[key] : null
  const whatsapp = supportWhatsappUrl()

  function close() {
    navigate({ hash: '' }, { replace: true, preventScrollReset: true })
  }

  useEffect(() => {
    if (!key) return

    const previous = window.document.activeElement as HTMLElement | null
    const overflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    panel.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate({ hash: '' }, { replace: true, preventScrollReset: true })
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [key, navigate])

  if (!doc) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={t('common.close', 'Close')}
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-[#0b1c30]/70 backdrop-blur-sm"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        tabIndex={-1}
        className="landing-rise relative flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_40px_90px_rgba(2,6,23,0.5)] outline-none sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-6 border-b border-[#e5eeff] px-7 pt-7 pb-5 sm:px-9">
          <div>
            <h2 id="legal-title" className="m-0 text-[26px] font-extrabold tracking-[-0.02em] text-[#0b1c30]">
              {doc.title}
            </h2>
            <p className="mt-1.5 mb-0 text-[13px] text-[#64748b]">
              {t('public.legalUpdated', 'Last updated')} {doc.updated}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close', 'Close')}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#eff4ff] text-[#004ac6] transition-colors hover:bg-[#dbe1ff] focus-visible:ring-2 focus-visible:ring-[#004ac6] focus-visible:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-7 py-6 sm:px-9">
          <p className="m-0 text-[15.5px] leading-relaxed text-[#434655]">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-7">
              <h3 className="m-0 text-[16px] font-bold text-[#0b1c30]">{section.heading}</h3>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 mb-0 text-[15px] leading-relaxed text-[#434655]">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <div className="mt-8 rounded-2xl bg-[#eff4ff] px-5 py-4 text-[14.5px] text-[#0b1c30]">
            {t('public.legalContact', 'Questions? Write to us')}
            {supportEmail ? (
              <>
                {' '}
                at <span className="font-semibold">{supportEmail}</span>
              </>
            ) : null}
            {whatsapp ? (
              <>
                {supportEmail ? ' or ' : ' on '}
                <a href={whatsapp} target="_blank" rel="noreferrer" className="font-semibold text-[#004ac6] underline">
                  WhatsApp
                </a>
              </>
            ) : null}
            .
          </div>
        </div>
      </div>
    </div>
  )
}
