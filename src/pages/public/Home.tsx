import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronDown,
  CreditCard,
  FileText,
  PhoneCall,
  Receipt,
  Rocket,
  ScanLine,
  Send,
  Smartphone,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { getPublicPlans } from '../../services/plans'
import { PlanCard } from './PricingCards'

const BUILT_FOR = ['Retail shops', 'Wholesalers', 'Service businesses', 'Freelancers', 'Workshops', 'Restaurants']

const FEATURES = [
  {
    icon: Receipt,
    title: 'Invoices that look the part',
    body: 'Issue, send and print invoices with your branding, tax lines and payment terms.',
  },
  {
    icon: ScanLine,
    title: 'Scan and sell',
    body: 'Scan a barcode with your phone camera and build an invoice line by line.',
  },
  {
    icon: Boxes,
    title: 'Stock you can trust',
    body: 'Movements are recorded as you sell and purchase, so counts stay honest.',
  },
  {
    icon: CreditCard,
    title: 'Payments and balances',
    body: 'Record full or partial payments and always know who still owes you.',
  },
  {
    icon: FileText,
    title: 'Quotes and proformas',
    body: 'Send a quote, convert it to an invoice when the customer says yes.',
  },
  {
    icon: BarChart3,
    title: 'Reports without a spreadsheet',
    body: 'Sales, outstanding balances and stock value, ready when you open the app.',
  },
]

const STEPS = [
  { icon: Send, titleKey: 'public.howApplyTitle', titleFallback: 'Apply', bodyKey: 'public.howApplyBody', bodyFallback: 'Tell us about your business. It takes about two minutes.' },
  { icon: PhoneCall, titleKey: 'public.howContactTitle', titleFallback: 'We contact you', bodyKey: 'public.howContactBody', bodyFallback: 'We call or message you on WhatsApp to confirm your details and plan.' },
  { icon: Rocket, titleKey: 'public.howLiveTitle', titleFallback: 'Go live', bodyKey: 'public.howLiveBody', bodyFallback: 'We create your workspace and email you a link to set your password.' },
]

const FAQS = [
  {
    q: 'Why can I not sign up myself?',
    a: 'We set every workspace up by hand so your company details, plan and users are right from day one. It also keeps the platform free of spam accounts.',
  },
  {
    q: 'How long does it take to get access?',
    a: 'We usually contact applicants within one working day, and your workspace goes live in the same call.',
  },
  {
    q: 'How do I pay?',
    a: 'We record payments offline: bank transfer, cash, card, JazzCash, Easypaisa or PayPal. We confirm the method with you before your account goes live.',
  },
  {
    q: 'What happens when my subscription ends?',
    a: 'Your data stays exactly where it is. You keep access to your subscription page and can renew by messaging us.',
  },
  {
    q: 'Can I use Fatura on my phone?',
    a: 'Yes. Fatura is built mobile first and installs as an app on Android and iOS.',
  },
]

function Faq({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-slate-200 py-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 text-left"
      >
        <span className="text-[15px] font-semibold text-[#0b1c30]">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#6b7086] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#434655]">{answer}</p> : null}
    </div>
  )
}

function Home() {
  const plansQuery = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const plans = plansQuery.data ?? []

  return (
    <>
      <section className="bg-[#0b1c30] text-white">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:px-8 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7aa2ff]">
            {t('public.heroEyebrow', 'Invoicing for small business')}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl md:text-[60px]">
            {t('public.heroTitle', 'Invoicing and stock, in one place')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {t('public.heroBody', 'Issue invoices, track payments and keep stock under control. We set your account up for you, so you start with your data already in place.')}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/apply"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#004ac6] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2563eb]"
            >
              {t('public.applyCta', 'Apply for access')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-lg border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t('public.heroSecondary', 'See how it works')}
            </a>
          </div>
          <p className="mt-5 text-xs text-slate-400">
            {t('public.heroNote', 'No credit card. We review every application by hand.')}
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b90a5]">
              {t('public.builtFor', 'Built for')}
            </span>
            {BUILT_FOR.map((item) => (
              <span key={item} className="text-sm font-medium text-[#6b7086]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1280px] px-6 py-20 sm:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl">
          {t('public.featuresTitle', 'Everything you need to get paid')}
        </h2>
        <p className="mt-3 max-w-2xl text-base text-[#434655]">
          {t('public.featuresBody', 'The essentials of running a small business, without the spreadsheet gymnastics.')}
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-slate-200/60"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf0ff] text-[#004ac6]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#0b1c30]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#434655]">{feature.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl">
            {t('public.howTitle', 'How you get started')}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-[#434655]">
            {t('public.howBody', 'Fatura is invite only. Three steps and you are live.')}
          </p>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.titleKey} className="relative">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b1c30] text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-[11px] font-mono font-semibold text-[#8b90a5]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-[#0b1c30]">
                    {t(step.titleKey, step.titleFallback)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#434655]">
                    {t(step.bodyKey, step.bodyFallback)}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 py-6 sm:px-8">
        <div className="flex flex-col items-center gap-8 rounded-3xl bg-gradient-to-br from-[#0b1c30] to-[#123259] px-8 py-12 text-white md:flex-row md:px-14">
          <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Smartphone className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('public.mobileTitle', 'Works on the phone in your pocket')}
            </h2>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t('public.mobileBody', 'Scan a barcode, issue an invoice and take payment from the counter, the van or the job site.')}
            </p>
          </div>
        </div>
      </section>

      {plansQuery.isPending ? (
        <section className="mx-auto max-w-[1280px] px-6 py-20 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </section>
      ) : plans.length > 0 ? (
        <section id="pricing" className="mx-auto max-w-[1280px] px-6 py-20 sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl">
            {t('public.pricingTitle', 'Simple pricing')}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-[#434655]">
            {t('public.pricingBody', 'One plan per business. Change it any time by talking to us.')}
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl">
            {t('public.faqTitle', 'Questions, answered')}
          </h2>
          <div className="mt-8 max-w-4xl">
            {FAQS.map((faq) => (
              <Faq key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 pb-20 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-[#004ac6]/20 bg-[#eaf0ff] px-8 py-12 md:flex-row md:items-center md:px-14">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] sm:text-3xl">
              {t('public.ctaTitle', 'Ready to stop chasing invoices?')}
            </h2>
            <p className="mt-2.5 text-sm text-[#434655] sm:text-base">
              {t('public.ctaBody', 'Send an application and we will be in touch the same working day.')}
            </p>
          </div>
          <Link
            to="/apply"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[#004ac6] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#2563eb]"
          >
            {t('public.applyCta', 'Apply for access')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}

export default Home
