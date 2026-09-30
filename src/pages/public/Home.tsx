import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  Barcode,
  Boxes,
  Camera,
  CircleCheckBig,
  MessageCircle,
  PhoneCall,
  RefreshCcw,
  ScanLine,
  Share2,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { supportWhatsappUrl } from '../../lib/support'
import { getPublicPlans } from '../../services/plans'
import { HeroMockup, MobileShowcase } from './Mockups'
import { PlanCard } from './PricingCards'

const HERO_BACKGROUND = {
  backgroundImage:
    'radial-gradient(900px 520px at 78% 38%, rgba(37,99,235,0.35), rgba(11,28,48,0) 70%), ' +
    'radial-gradient(520px 360px at 8% 92%, rgba(78,222,163,0.14), rgba(11,28,48,0) 70%)',
  backgroundColor: '#0b1c30',
}

const HERO_PROOF = ['Web, Android and iOS', 'We set it up for you', 'Cancel anytime']

const BUILT_FOR = [
  'Retail shops',
  'Wholesalers',
  'Electronics stores',
  'Pharmacies',
  'Workshops',
  'Restaurants',
]

const FEATURES = [
  {
    icon: BadgeCheck,
    title: 'Invoices and quotes',
    body: 'Professional invoices with your logo and colors, automatic numbering, taxes calculated per line, and quotes that turn into invoices with one click.',
  },
  {
    icon: ScanLine,
    title: 'Scan and sell',
    body: 'Use a USB or Bluetooth scanner at the counter, or your phone camera anywhere. Scan the same item twice and the quantity goes up.',
  },
  {
    icon: Boxes,
    title: 'Stock you can trust',
    body: 'Every sale and purchase moves stock with a full history. Low stock alerts tell you what to reorder before the shelf is empty.',
  },
  {
    icon: Barcode,
    title: 'Products and barcode labels',
    body: 'Import your catalog from Excel, generate barcodes for items that have none, and print sharp label sheets on any printer.',
  },
  {
    icon: Users,
    title: 'Customers and suppliers',
    body: 'See who owes you, what you owe, and every document you exchanged. Record payments against invoices in seconds.',
  },
  {
    icon: TrendingUp,
    title: 'Reports that answer questions',
    body: 'Sales by day, best selling products, unpaid invoices and stock value, ready to export to Excel for your accountant.',
  },
]

const STEPS = [
  {
    title: 'Apply in two minutes',
    body: 'Tell us about your business and pick a plan. No card required to apply.',
  },
  {
    title: 'We call you',
    body: 'Our team contacts you on phone or WhatsApp, confirms your details and activates your plan.',
  },
  {
    title: 'You go live',
    body: 'Your login link arrives by email and WhatsApp. Set a password and your dashboard is ready.',
  },
]

const MOBILE_POINTS = [
  {
    icon: Camera,
    title: 'Your camera is the scanner',
    body: 'Scan products to sell, count stock or check a price. No extra hardware needed.',
  },
  {
    icon: Share2,
    title: 'Share invoices instantly',
    body: 'Send a PDF to your customer on WhatsApp or email straight from the sale.',
  },
  {
    icon: Smartphone,
    title: 'Same account everywhere',
    body: 'Start a sale on the counter PC and check today\u2019s total on your phone. Everything stays in sync.',
  },
]

const PRICING_PROMISES = [
  { icon: ShieldCheck, label: 'Your data is private to your business' },
  { icon: PhoneCall, label: 'Setup help on phone and WhatsApp' },
  { icon: RefreshCcw, label: 'Cancel anytime, keep your records' },
]

const FAQS = [
  {
    q: 'How do I get my account?',
    a: 'Fill in the application form. Our team calls you, activates your plan, and sends your login link by email and WhatsApp.',
  },
  {
    q: 'What happens during setup?',
    a: 'We confirm your business details, invoice numbering and taxes, and help you import your products so you can sell on day one.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. The same account works on the web and in the Android and iPhone apps, including barcode scanning with the camera.',
  },
  {
    q: 'How do I pay?',
    a: 'We agree the payment method with you on the setup call. Your plan runs for one period from the day it is activated.',
  },
  {
    q: 'Do I need special hardware?',
    a: 'No. Any computer or phone works. USB and Bluetooth barcode scanners and normal printers are supported if you have them.',
  },
  {
    q: 'What if I stop paying?',
    a: 'Your account pauses at the end of the period. Nothing is deleted, and everything is back as soon as you renew.',
  },
]

function Eyebrow({ children, tone = 'brand' }: { children: string; tone?: 'brand' | 'mint' }) {
  return (
    <span
      className={`text-[13px] font-bold uppercase tracking-[0.1em] ${
        tone === 'mint' ? 'text-[#4edea3]' : 'text-[#004ac6]'
      }`}
    >
      {children}
    </span>
  )
}

function Home() {
  const plansQuery = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const plans = plansQuery.data ?? []
  const whatsappUrl = supportWhatsappUrl()

  return (
    <>
      <section className="relative overflow-hidden pb-20 sm:pb-26" style={HERO_BACKGROUND}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 px-5 pt-28 sm:pt-32 xl:flex-row xl:gap-14 xl:pt-[152px]">
          <div className="w-full xl:w-[540px] xl:shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3.5 py-1.5 text-[13px] font-semibold text-[#dbe1ff]">
              <span className="h-2 w-2 rounded-full bg-[#4edea3]" />
              {t('public.heroEyebrow', 'Invoicing, stock and barcodes in one app')}
            </span>

            <h1 className="mt-6 text-[40px] leading-[1.06] font-extrabold tracking-[-0.035em] text-white sm:text-5xl xl:text-[62px]">
              {t('public.heroTitleA', 'Invoice in seconds.')}
              <br />
              {t('public.heroTitleB', 'Know your stock')}
              <br />
              <span className="text-[#4edea3]">{t('public.heroTitleC', 'without guessing.')}</span>
            </h1>

            <p className="mt-6 max-w-[540px] text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
              {t(
                'public.heroBody',
                'YK Digital Solutions brings products, barcode scanning, invoices, customers, suppliers and reports into one place. Use it at the counter on your computer, or in your pocket on Android and iPhone.',
              )}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link
                to="/apply"
                className="inline-flex h-[54px] items-center gap-2.5 rounded-xl bg-[#004ac6] px-7 text-base font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#2563eb]"
              >
                {t('public.applyNow', 'Apply now')}
                <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex h-[54px] items-center rounded-xl border border-white/22 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t('public.heroSecondary', 'See pricing')}
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#cbd5e1]">
              {HERO_PROOF.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CircleCheckBig className="h-[18px] w-[18px] text-[#4edea3]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full min-w-0 xl:flex-1">
            <HeroMockup />
          </div>
        </div>
      </section>

      <section className="border-b border-[#e5eeff] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-9 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] font-bold whitespace-nowrap text-[#434655] uppercase tracking-[0.1em]">
            {t('public.builtFor', 'Built for')}
          </span>
          <div className="flex flex-wrap gap-2.5 sm:justify-end">
            {BUILT_FOR.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#dbe1ff] bg-[#f8f9ff] px-4.5 py-2.5 text-[15px] font-semibold text-[#0b1c30]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[720px]">
            <Eyebrow>{t('public.featuresEyebrow', 'Features')}</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
              {t('public.featuresTitle', 'Everything your counter needs, nothing it does not.')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#434655] sm:text-lg">
              {t(
                'public.featuresBody',
                'Every sale updates your stock. Every product has a barcode. Every invoice is ready to print or share in one tap.',
              )}
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-[#e5eeff] bg-white p-8 transition-shadow hover:shadow-[0_18px_40px_rgba(2,6,23,0.08)]"
                >
                  <span className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-[#e5eeff] text-[#004ac6]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-[21px] font-bold tracking-[-0.01em] text-[#0b1c30]">{feature.title}</h3>
                  <p className="mt-2.5 text-base leading-relaxed text-[#434655]">{feature.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-[#dbe1ff] bg-[#eff4ff] px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-[720px] text-center">
            <Eyebrow>{t('public.howEyebrow', 'How it works')}</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
              {t('public.howTitle', 'From application to first invoice, we do the setup.')}
            </h2>
          </div>

          <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
            <span className="absolute top-8 right-[16%] left-[16%] hidden h-0.5 bg-[#c3d4ff] md:block" />
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative px-3 text-center">
                <span
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full font-mono text-[22px] font-bold text-white shadow-[0_0_0_8px_#eff4ff] ${
                    index === STEPS.length - 1 ? 'bg-[#007d55]' : 'bg-[#004ac6]'
                  }`}
                >
                  {index + 1}
                </span>
                <h3 className="mt-7 text-[22px] font-bold text-[#0b1c30]">{step.title}</h3>
                <p className="mx-auto mt-2.5 max-w-[320px] text-base leading-relaxed text-[#434655]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mobile" className="px-5 py-20 sm:py-28">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:gap-20">
          <MobileShowcase />

          <div className="min-w-0 flex-1">
            <Eyebrow>{t('public.mobileEyebrow', 'Mobile app')}</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
              {t('public.mobileTitle', 'A real app on your phone, not a website squeezed small.')}
            </h2>
            <p className="mt-4.5 text-base leading-relaxed text-[#434655] sm:text-lg">
              {t(
                'public.mobileBody',
                'Install YK Digital Solutions on Android or iPhone and run your shop from the floor, the warehouse or the road.',
              )}
            </p>

            <div className="mt-8 flex flex-col gap-4.5">
              {MOBILE_POINTS.map((point) => {
                const Icon = point.icon
                return (
                  <div key={point.title} className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dbe1ff] bg-white text-[#004ac6]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-[17px] font-bold text-[#0b1c30]">{point.title}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-[#434655]">{point.body}</span>
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {['Android app', 'iPhone app'].map((label) => (
                <span
                  key={label}
                  className="inline-flex h-13 items-center gap-2.5 rounded-xl bg-[#0b1c30] px-5 text-[15px] font-semibold text-white"
                >
                  <Smartphone className="h-5 w-5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {plansQuery.isPending || plans.length > 0 ? (
        <section id="pricing" className="bg-[#0b1c30] px-5 py-20 sm:py-28">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:gap-20">
            <div className="min-w-0 flex-1">
              <Eyebrow tone="mint">{t('public.pricingEyebrow', 'Pricing')}</Eyebrow>
              <h2 className="mt-3 text-[34px] leading-[1.1] font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
                {t('public.pricingTitleA', 'One simple price.')}
                <br />
                {t('public.pricingTitleB', 'Everything included.')}
              </h2>
              <p className="mt-4.5 max-w-[480px] text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
                {t(
                  'public.pricingBody',
                  'No setup fee and no long contract. Our team activates your account after a short call, and you pay period to period.',
                )}
              </p>
              <div className="mt-9 flex flex-col gap-3.5">
                {PRICING_PROMISES.map((promise) => {
                  const Icon = promise.icon
                  return (
                    <span key={promise.label} className="inline-flex items-center gap-3 text-base text-[#e2e8f0]">
                      <Icon className="h-5 w-5 shrink-0 text-[#4edea3]" />
                      {promise.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="grid w-full gap-8 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-1 xl:max-w-[460px]">
              {plansQuery.isPending ? (
                <Skeleton className="h-[520px] w-full rounded-[28px]" />
              ) : (
                plans.map((plan) => <PlanCard key={plan.id} plan={plan} tone="onDark" />)
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section id="faq" className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <Eyebrow>{t('public.faqEyebrow', 'FAQ')}</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] text-[#0b1c30] sm:text-[44px]">
              {t('public.faqTitle', 'Questions we hear a lot')}
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-[20px] border border-[#e5eeff] bg-white p-7">
                <h3 className="text-lg font-bold text-[#0b1c30]">{faq.q}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-[#434655]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:pb-28">
        <div
          className="mx-auto flex max-w-[1200px] flex-col justify-between gap-10 rounded-[32px] px-8 py-14 sm:px-14 sm:py-18 lg:flex-row lg:items-center"
          style={{
            backgroundImage:
              'radial-gradient(600px 300px at 85% 20%, rgba(78,222,163,0.22), rgba(0,74,198,0) 70%)',
            backgroundColor: '#004ac6',
          }}
        >
          <div>
            <h2 className="text-[30px] leading-[1.12] font-extrabold tracking-[-0.03em] text-white sm:text-[42px]">
              {t('public.ctaTitle', 'Ready to stop counting by hand?')}
            </h2>
            <p className="mt-3.5 text-base text-[#dbe1ff] sm:text-lg">
              {t('public.ctaBody', 'Apply today and our team will call you within one working day.')}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              to="/apply"
              className="inline-flex h-14 items-center gap-2.5 rounded-[14px] bg-white px-7 text-base font-bold text-[#0b1c30] transition-colors hover:bg-[#f8f9ff]"
            >
              {t('public.applyNow', 'Apply now')}
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-14 items-center gap-2.5 rounded-[14px] border border-white/40 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                {t('public.chatWhatsapp', 'Chat on WhatsApp')}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
