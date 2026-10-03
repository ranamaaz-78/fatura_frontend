import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Camera,
  CircleCheckBig,
  ClipboardList,
  Cpu,
  FileText,
  Mail,
  MessageCircle,
  PhoneCall,
  Pill,
  RefreshCcw,
  Rocket,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Clock,
  Store,
  UtensilsCrossed,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Skeleton } from '../../components/ui/Skeleton'
import { t } from '../../i18n'
import { supportEmail, supportWhatsappUrl } from '../../lib/support'
import { getPublicPlans } from '../../services/plans'
import { DocumentShowcase } from './landing/DocumentShowcase'
import { Faq, type FaqItem } from './landing/Faq'
import { FeatureBento } from './landing/FeatureBento'
import { Reveal } from './landing/hooks'
import { LegalDialog } from './landing/LegalDialog'
import { LANDING_SECTIONS } from './landing/sections'
import { HeroMockup, MobileShowcase } from './Mockups'
import { PlanDeck } from './landing/PlanDeck'

const HERO_BACKGROUND = {
  backgroundImage:
    'radial-gradient(900px 520px at 78% 38%, rgba(37,99,235,0.35), rgba(11,28,48,0) 70%), ' +
    'radial-gradient(520px 360px at 8% 92%, rgba(78,222,163,0.14), rgba(11,28,48,0) 70%)',
  backgroundColor: '#0b1c30',
}

const GRID_BACKGROUND = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '56px 56px',
  maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 25%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 25%, transparent 78%)',
}

const HERO_PROOF = [t('home.live_on_the_web_apps_coming_soon', 'Live on the web, apps coming soon'), t('home.we_set_it_up_for_you', 'We set it up for you'), t('home.cancel_anytime', 'Cancel anytime')]

const HIGHLIGHTS = [
  { value: '4', label: t('public.docsTabs', 'Document types'), hint: t('home.invoice_quote_proforma_delivery_note', 'Invoice, quote, proforma, delivery note') },
  { value: 'Web', label: t('home.live_today', 'Live today'), hint: t('home.android_and_iphone_apps_coming_soon', 'Android and iPhone apps coming soon') },
  { value: '0', label: t('home.setup_fee', 'Setup fee'), hint: t('home.pay_period_to_period', 'Pay period to period') },
  { value: '1 day', label: t('home.we_call_you_back', 'We call you back'), hint: t('home.after_you_apply', 'After you apply') },
]

const BUILT_FOR: { label: string; icon: LucideIcon }[] = [
  { label: t('home.retail_shops', 'Retail shops'), icon: Store },
  { label: t('home.wholesalers', 'Wholesalers'), icon: Warehouse },
  { label: t('home.electronics_stores', 'Electronics stores'), icon: Cpu },
  { label: t('home.pharmacies', 'Pharmacies'), icon: Pill },
  { label: t('home.workshops', 'Workshops'), icon: Wrench },
  { label: t('home.restaurants', 'Restaurants'), icon: UtensilsCrossed },
  { label: t('home.market_stalls', 'Market stalls'), icon: ShoppingBag },
]

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardList,
    title: t('home.apply_in_two_minutes', 'Apply in two minutes'),
    body: t('home.tell_us_about_your_business_and_pick_a', 'Tell us about your business and pick a plan. No card required to apply.'),
  },
  {
    icon: PhoneCall,
    title: t('home.we_call_you', 'We call you'),
    body: t('home.our_team_contacts_you_on_phone_or_whatsapp', 'Our team contacts you on phone or WhatsApp, confirms your details and activates your plan.'),
  },
  {
    icon: Rocket,
    title: t('home.you_go_live', 'You go live'),
    body: t('home.your_login_link_arrives_by_email_and', 'Your login link arrives by email and WhatsApp. Set a password and your dashboard is ready.'),
  },
]

const MOBILE_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Camera,
    title: t('home.your_camera_is_the_scanner', 'Your camera is the scanner'),
    body: t('home.scan_products_to_sell_count_stock_or_check', 'Scan products to sell, count stock or check a price. No extra hardware needed.'),
  },
  {
    icon: Share2,
    title: t('home.share_invoices_instantly', 'Share invoices instantly'),
    body: t('home.send_a_pdf_to_your_customer_on_whatsapp_or', 'Send a PDF to your customer on WhatsApp or email straight from the sale.'),
  },
  {
    icon: Smartphone,
    title: t('home.same_account_everywhere', 'Same account everywhere'),
    body: t('home.start_a_sale_on_the_counter_pc_and_check', 'Start a sale on the counter PC and check today’s total on your phone. Everything stays in sync.'),
  },
]

const PRICING_PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: t('home.your_data_is_private_to_your_business', 'Your data is private to your business') },
  { icon: PhoneCall, label: t('home.setup_help_on_phone_and_whatsapp', 'Setup help on phone and WhatsApp') },
  { icon: RefreshCcw, label: t('home.cancel_anytime_keep_your_records', 'Cancel anytime, keep your records') },
]

const ABOUT_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Store,
    title: t('home.made_for_the_counter', 'Made for the counter'),
    body: t('home.fast_on_a_busy_shop_floor_scan_sell_print', 'Fast on a busy shop floor: scan, sell, print or send. Your team picks it up in an afternoon.'),
  },
  {
    icon: PhoneCall,
    title: t('home.we_set_it_up_with_you', 'We set it up with you'),
    body: t('home.a_real_person_confirms_your_details_taxes', 'A real person confirms your details, taxes and numbering, and helps you import your products.'),
  },
  {
    icon: ShieldCheck,
    title: t('home.your_records_stay_yours', 'Your records stay yours'),
    body: t('home.each_business_is_kept_separate_and_private', 'Each business is kept separate and private. Cancel any time and keep everything you entered.'),
  },
]

const FAQS: FaqItem[] = [
  {
    q: t('home.how_do_i_get_my_account', 'How do I get my account?'),
    a: t('home.fill_in_the_application_form_and_confirm', 'Fill in the application form and confirm your email with the code we send. Our team then calls you, activates your plan, and sends your login link by email and WhatsApp.'),
  },
  {
    q: t('home.what_happens_during_setup', 'What happens during setup?'),
    a: t('home.we_confirm_your_business_details_invoice', 'We confirm your business details, invoice numbering and taxes, and help you import your products so you can sell on day one.'),
  },
  {
    q: t('home.does_it_handle_spanish_iva_and_recargo_de', 'Does it handle Spanish IVA and recargo de equivalencia?'),
    a: t('home.yes_you_set_your_own_iva_rates_add_recargo', 'Yes. You set your own IVA rates, add recargo de equivalencia on invoices and quotations, and keep N.I.F / N.I.E on every client.'),
  },
  {
    q: t('home.can_i_use_it_on_my_phone', 'Can I use it on my phone?'),
    a: t('home.yes_the_website_works_in_your_phone_s', 'Yes, the website works in your phone\'s browser today. The Android and iPhone apps are coming soon and will use the same account, with barcode scanning through the camera.'),
  },
  {
    q: t('home.can_i_send_invoices_on_whatsapp', 'Can I send invoices on WhatsApp?'),
    a: t('home.yes_connect_your_whatsapp_once_then_send', 'Yes. Connect your WhatsApp once, then send the PDF to your customer straight from the sale. You can also download any document as a PDF or an image.'),
  },
  {
    q: t('home.can_a_delivery_note_leave_out_my_company', 'Can a delivery note leave out my company details?'),
    a: t('home.yes_a_delivery_note_is_a_plain_slip_with', 'Yes. A delivery note is a plain slip with no company name, address or logo, just the client, the items and a space to sign.'),
  },
  {
    q: t('home.how_do_i_pay', 'How do I pay?'),
    a: t('home.we_agree_the_payment_method_with_you_on', 'We agree the payment method with you on the setup call. Your plan runs for one period from the day it is activated.'),
  },
  {
    q: t('home.do_i_need_special_hardware', 'Do I need special hardware?'),
    a: t('home.no_any_computer_or_phone_works_usb_and', 'No. Any computer or phone works. USB and Bluetooth barcode scanners and normal printers are supported if you have them.'),
  },
  {
    q: t('home.what_if_i_stop_paying', 'What if I stop paying?'),
    a: t('home.your_account_pauses_at_the_end_of_the', 'Your account pauses at the end of the period. Nothing is deleted, and everything is back as soon as you renew.'),
  },
]

function Eyebrow({ children, tone = 'brand' }: { children: string; tone?: 'brand' | 'mint' }) {
  return (
    <span
      className={`text-[13px] font-bold tracking-[0.1em] uppercase ${tone === 'mint' ? 'text-[#4edea3]' : 'text-[#004ac6]'}`}
    >
      {children}
    </span>
  )
}

function SectionTitle({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <h2
      className={`mt-3 text-[32px] leading-[1.12] font-extrabold tracking-[-0.03em] sm:text-[44px] ${light ? 'text-white' : 'text-[#0b1c30]'}`}
    >
      {children}
    </h2>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-32 sm:pb-36" style={HERO_BACKGROUND}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={GRID_BACKGROUND} />
      <span
        aria-hidden="true"
        className="landing-glow pointer-events-none absolute -top-24 right-[8%] h-[360px] w-[360px] rounded-full bg-[#2563eb]/30 blur-[90px]"
      />
      <span
        aria-hidden="true"
        className="landing-glow pointer-events-none absolute bottom-10 left-[4%] h-[260px] w-[260px] rounded-full bg-[#4edea3]/15 blur-[80px] [animation-delay:3s]"
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-14 px-5 pt-28 sm:pt-32 xl:flex-row xl:gap-12 xl:pt-[152px]">
        <div className="w-full xl:w-[540px] xl:shrink-0">
          <span className="landing-rise inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/6 py-1.5 pr-4 pl-3 text-[13px] font-semibold text-[#dbe1ff] backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="landing-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4edea3]" />
            </span>
            {t('public.heroEyebrow', 'Invoicing, stock and barcodes in one app')}
          </span>

          <h1 className="landing-rise mt-6 text-[40px] leading-[1.06] font-extrabold tracking-[-0.035em] text-white [animation-delay:80ms] sm:text-5xl xl:text-[54px]">
            {t('public.heroTitleA', 'Invoice in seconds.')}
            <br />
            {t('public.heroTitleB', 'Know your stock')}
            <br />
            <span className="bg-gradient-to-r from-[#4edea3] via-[#7ef0c0] to-[#9fd0ff] bg-clip-text text-transparent">
              {t('public.heroTitleC', 'without guessing.')}
            </span>
          </h1>

          <p className="landing-rise mt-6 max-w-[540px] text-base leading-relaxed text-[#cbd5e1] [animation-delay:160ms] sm:text-lg">
            {t(
              'public.heroBody',
              'YK Digital Solutions brings products, barcode scanning, invoices, customers, suppliers and reports into one place. Use it at the counter on your computer or in your phone’s browser. Android and iPhone apps are coming soon.',
            )}
          </p>

          <div className="landing-rise mt-9 flex flex-wrap items-center gap-3.5 [animation-delay:240ms]">
            <Link
              to="/apply"
              className="group inline-flex h-[54px] items-center gap-2.5 rounded-xl bg-[#004ac6] px-7 text-base font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#2563eb] hover:shadow-[0_16px_38px_rgba(37,99,235,0.55)]"
            >
              {t('public.applyNow', 'Apply now')}
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#documents"
              className="inline-flex h-[54px] items-center gap-2 rounded-xl border border-white/22 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              <FileText className="h-[18px] w-[18px]" />
              {t('public.heroDocs', 'See the documents')}
            </a>
          </div>

          <div className="landing-rise mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#cbd5e1] [animation-delay:320ms]">
            {HERO_PROOF.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CircleCheckBig className="h-[18px] w-[18px] text-[#4edea3]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-rise w-full min-w-0 [animation-delay:200ms] xl:flex-1">
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

function HighlightStrip() {
  return (
    <section className="relative z-10 px-5">
      <Reveal className="mx-auto -mt-[72px] max-w-[1100px] rounded-[28px] border border-[#e5eeff] bg-white p-3 shadow-[0_30px_70px_rgba(2,6,23,0.14)] sm:-mt-20">
        <dl className="m-0 grid grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item, index) => (
            <div
              key={item.label}
              className={`px-6 py-6 text-center sm:py-7 ${index > 0 ? 'lg:border-l lg:border-[#e5eeff]' : ''} ${
                index % 2 === 1 ? 'border-l border-[#e5eeff] lg:border-l' : ''
              } ${index > 1 ? 'border-t border-[#e5eeff] lg:border-t-0' : ''}`}
            >
              <dd className="m-0 text-[34px] leading-none font-extrabold tracking-[-0.03em] text-[#004ac6] sm:text-[40px]">
                {item.value}
              </dd>
              <dt className="mt-2 text-[15px] font-bold text-[#0b1c30]">{item.label}</dt>
              <p className="m-0 mt-0.5 text-[13px] leading-snug text-[#64748b]">{item.hint}</p>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  )
}

function BuiltFor() {
  const row = (suffix: string) => (
    <div key={suffix} className="flex shrink-0 gap-3 pr-3" aria-hidden={suffix === 'b'}>
      {BUILT_FOR.map((item) => {
        const Icon = item.icon
        return (
          <span
            key={item.label}
            className="inline-flex items-center gap-2.5 rounded-full border border-[#dbe1ff] bg-white px-5 py-3 text-[15px] font-semibold whitespace-nowrap text-[#0b1c30] shadow-[0_2px_8px_rgba(2,6,23,0.04)]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eff4ff] text-[#004ac6]">
              <Icon className="h-4 w-4" />
            </span>
            {item.label}
          </span>
        )
      })}
    </div>
  )

  return (
    <section className="overflow-hidden pt-20 pb-4 sm:pt-24">
      <p className="m-0 mb-7 px-5 text-center text-[13px] font-bold tracking-[0.1em] text-[#434655] uppercase">
        {t('public.builtFor', 'Built for the shops and workshops that run on the counter')}
      </p>
      <div className="[mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="landing-marquee flex w-max">
          {row('a')}
          {row('b')}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ how it works, mobile */

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-[#dbe1ff] bg-[#eff4ff] px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <Eyebrow>{t('public.howEyebrow', 'How it works')}</Eyebrow>
          <SectionTitle>{t('public.howTitle', 'From application to first invoice, we do the setup.')}</SectionTitle>
        </Reveal>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3 md:gap-7">
          <span aria-hidden="true" className="absolute top-[52px] right-[17%] left-[17%] hidden h-0.5 bg-[#c3d4ff] md:block" />
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const last = index === STEPS.length - 1
            return (
              <Reveal key={step.title} delay={index * 110}>
                <div className="relative h-full rounded-3xl border border-[#dbe1ff] bg-white p-8 text-center shadow-[0_12px_30px_rgba(2,6,23,0.05)]">
                  <span
                    className={`relative mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full text-white shadow-[0_0_0_8px_#eff4ff] ${
                      last ? 'bg-[#007d55]' : 'bg-[#004ac6]'
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                    <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0b1c30] text-[13px] font-bold text-white ring-4 ring-white">
                      {index + 1}
                    </span>
                  </span>
                  <h3 className="mt-7 text-[22px] font-bold text-[#0b1c30]">{step.title}</h3>
                  <p className="mx-auto mt-2.5 max-w-[320px] text-base leading-relaxed text-[#434655]">{step.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12 text-center" delay={200}>
          <Link
            to="/apply"
            className="group inline-flex h-[54px] items-center gap-2.5 rounded-xl bg-[#004ac6] px-7 text-base font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#2563eb]"
          >
            {t('public.startApplication', 'Start your application')}
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function MobileSection() {
  return (
    <section id="mobile" className="scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:gap-20">
        <Reveal className="relative w-full max-w-[520px] shrink-0">
          <MobileShowcase />
          <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-[#0b1c30] px-3.5 py-1.5 text-xs font-bold tracking-wide text-white shadow-[0_10px_24px_rgba(11,28,48,0.3)]">
            <Clock className="h-3.5 w-3.5 text-[#4edea3]" />
            {t('public.comingSoon', 'Coming soon')}
          </span>
        </Reveal>

        <Reveal delay={120} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{t('public.mobileEyebrow', 'Mobile app')}</Eyebrow>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe1ff] bg-[#eff4ff] px-3 py-1 text-xs font-bold text-[#004ac6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#004ac6]" />
              {t('public.comingSoon', 'Coming soon')}
            </span>
          </div>
          <SectionTitle>{t('public.mobileTitle', 'A real app on your phone, not a website squeezed small.')}</SectionTitle>
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
                aria-disabled="true"
                className="inline-flex h-13 cursor-not-allowed items-center gap-3 rounded-xl border border-[#dbe1ff] bg-white px-5 text-[15px] font-semibold text-[#0b1c30]"
              >
                <Smartphone className="h-5 w-5 text-[#004ac6]" />
                <span className="flex flex-col leading-tight">
                  <span>{label}</span>
                  <span className="text-[11px] font-bold tracking-wide text-[#64748b] uppercase">
                    {t('public.comingSoon', 'Coming soon')}
                  </span>
                </span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#434655]">
            {t('public.mobileNotify', 'The website already works in your phone’s browser. We will let our customers know as soon as the apps are ready.')}
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ pricing */

function PricingSection() {
  const plansQuery = useQuery({ queryKey: ['public', 'plans'], queryFn: getPublicPlans })
  const plans = plansQuery.data ?? []

  return (
    <section
      id="pricing"
      className="relative scroll-mt-20 overflow-hidden bg-[#0b1c30] px-5 py-20 sm:py-28"
      style={{
        backgroundImage:
          'radial-gradient(640px 400px at 12% 20%, rgba(37,99,235,0.25), rgba(11,28,48,0) 70%), radial-gradient(480px 340px at 92% 90%, rgba(78,222,163,0.12), rgba(11,28,48,0) 70%)',
      }}
    >
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:gap-20">
        <Reveal className="min-w-0 flex-1">
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
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4edea3]/12">
                    <Icon className="h-[18px] w-[18px] text-[#4edea3]" />
                  </span>
                  {promise.label}
                </span>
              )
            })}
          </div>
        </Reveal>

        <Reveal delay={120} className="flex w-full justify-center lg:w-[460px] lg:shrink-0">
          {plansQuery.isPending ? (
            <Skeleton className="h-[520px] w-full max-w-[460px] rounded-[28px]" />
          ) : plans.length > 0 ? (
            <PlanDeck plans={plans} />
          ) : (
            <div className="rounded-[28px] bg-white p-9 text-center shadow-[0_40px_80px_rgba(2,6,23,0.45)]">
              <h3 className="m-0 text-[22px] font-bold text-[#0b1c30]">
                {t('public.plansUnavailable', 'Pricing is temporarily unavailable.')}
              </h3>
              <p className="mt-2 mb-0 text-[15px] text-[#434655]">
                {t('public.plansAsk', 'Apply and we will send you the current plans on the call.')}
              </p>
              <Link
                to="/apply"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#004ac6] px-6 text-[15px] font-semibold text-white hover:bg-[#2563eb]"
              >
                {t('public.applyCta', 'Apply for access')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ about, faq, contact */

function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal>
          <Eyebrow>{t('public.aboutEyebrow', 'About')}</Eyebrow>
          <SectionTitle>{t('public.aboutTitle', 'Software that gets out of your way.')}</SectionTitle>
          <p className="mt-4.5 text-base leading-relaxed text-[#434655] sm:text-lg">
            {t(
              'public.aboutBody',
              'YK Digital Solutions builds practical business software for shops, workshops and small companies. We would rather give you a short, clear tool your whole team picks up in an afternoon than a long list of features nobody opens.',
            )}
          </p>
          <Link
            to="/apply"
            className="group mt-8 inline-flex items-center gap-2 text-[15px] font-bold text-[#004ac6] hover:text-[#2563eb]"
          >
            {t('public.aboutCta', 'Apply and talk to us')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="flex flex-col gap-4">
          {ABOUT_POINTS.map((point, index) => {
            const Icon = point.icon
            return (
              <Reveal key={point.title} delay={index * 100}>
                <div className="flex items-start gap-5 rounded-3xl border border-[#e5eeff] bg-white p-6 transition-shadow hover:shadow-[0_18px_40px_rgba(2,6,23,0.08)] sm:p-7">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5eeff] text-[#004ac6]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-[19px] font-bold text-[#0b1c30]">{point.title}</span>
                    <span className="mt-1.5 block text-[15.5px] leading-relaxed text-[#434655]">{point.body}</span>
                  </span>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-y border-[#dbe1ff] bg-[#eff4ff] px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1200px] items-start gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28">
          <Eyebrow>{t('public.faqEyebrow', 'FAQ')}</Eyebrow>
          <SectionTitle>{t('public.faqTitle', 'Questions we hear a lot')}</SectionTitle>
          <p className="mt-4.5 text-base leading-relaxed text-[#434655] sm:text-lg">
            {t('public.faqBody', 'Cannot find yours? Ask us before you apply, we are happy to help.')}
          </p>
          <a
            href="#contact"
            className="group mt-7 inline-flex items-center gap-2 text-[15px] font-bold text-[#004ac6] hover:text-[#2563eb]"
          >
            {t('public.faqCta', 'Contact us')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        <Reveal delay={100}>
          <Faq items={FAQS} />
        </Reveal>
      </div>
    </section>
  )
}

function ContactSection() {
  const whatsappUrl = supportWhatsappUrl()

  const channels = [
    whatsappUrl
      ? {
          key: 'whatsapp',
          icon: MessageCircle,
          title: 'WhatsApp',
          body: t('home.message_us_any_time_and_we_will_get_back', 'Message us any time and we will get back to you.'),
          action: t('public.chatWhatsapp', 'Chat on WhatsApp'),
          href: whatsappUrl,
          external: true,
        }
      : null,
    supportEmail
      ? {
          key: 'email',
          icon: Mail,
          title: t('admin.emailAction', 'Email'),
          body: supportEmail,
          action: t('public.writeEmail', 'Write to us'),
          href: `mailto:${supportEmail}`,
          external: false,
        }
      : null,
  ].filter((channel): channel is NonNullable<typeof channel> => channel !== null)

  return (
    <section id="contact" className="scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-[1200px]">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <Eyebrow>{t('public.contactEyebrow', 'Contact')}</Eyebrow>
          <SectionTitle>{t('public.contactTitle', 'Talk to a real person.')}</SectionTitle>
          <p className="mt-4 text-base leading-relaxed text-[#434655] sm:text-lg">
            {t('public.contactBody', 'Questions before you apply? Reach out, or start your application and we will call you.')}
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-[980px] gap-5 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {channels.map((channel, index) => {
            const Icon = channel.icon
            return (
              <Reveal key={channel.key} delay={index * 90}>
                <a
                  href={channel.href}
                  {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="group flex h-full flex-col rounded-3xl border border-[#e5eeff] bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(2,6,23,0.1)]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5eeff] text-[#004ac6] transition-colors group-hover:bg-[#004ac6] group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="mt-5 block text-[20px] font-bold text-[#0b1c30]">{channel.title}</span>
                  <span className="mt-1.5 block text-[15px] leading-relaxed break-words text-[#434655]">{channel.body}</span>
                  <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-[#004ac6]">
                    {channel.action}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              </Reveal>
            )
          })}

          <Reveal delay={channels.length * 90}>
            <Link
              to="/apply"
              className="group flex h-full flex-col rounded-3xl bg-[#004ac6] p-8 text-white shadow-[0_22px_50px_rgba(0,74,198,0.28)] transition-all hover:-translate-y-1 hover:bg-[#0a54d6]"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Rocket className="h-6 w-6" />
              </span>
              <span className="mt-5 block text-[20px] font-bold">{t('public.applyCta', 'Apply for access')}</span>
              <span className="mt-1.5 block text-[15px] leading-relaxed text-[#dbe1ff]">
                {t('public.contactApply', 'Two minutes, no card needed. Our team calls you within one working day.')}
              </span>
              <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold">
                {t('public.applyNow', 'Apply now')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  const whatsappUrl = supportWhatsappUrl()

  return (
    <section className="px-5 pb-20 sm:pb-28">
      <Reveal>
        <div
          className="relative mx-auto flex max-w-[1200px] flex-col justify-between gap-10 overflow-hidden rounded-[32px] px-8 py-14 sm:px-14 sm:py-18 lg:flex-row lg:items-center"
          style={{
            backgroundImage:
              'radial-gradient(600px 300px at 85% 20%, rgba(78,222,163,0.28), rgba(0,74,198,0) 70%), radial-gradient(420px 260px at 0% 100%, rgba(255,255,255,0.12), rgba(0,74,198,0) 70%)',
            backgroundColor: '#004ac6',
          }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={GRID_BACKGROUND} />
          <div className="relative">
            <h2 className="text-[30px] leading-[1.12] font-extrabold tracking-[-0.03em] text-white sm:text-[42px]">
              {t('public.ctaTitle', 'Ready to stop counting by hand?')}
            </h2>
            <p className="mt-3.5 text-base text-[#dbe1ff] sm:text-lg">
              {t('public.ctaBody', 'Apply today and our team will call you within one working day.')}
            </p>
          </div>
          <div className="relative flex shrink-0 flex-wrap gap-3">
            <Link
              to="/apply"
              className="inline-flex h-14 items-center gap-2.5 rounded-[14px] bg-white px-7 text-base font-bold text-[#0b1c30] transition-all hover:-translate-y-0.5 hover:bg-[#f8f9ff]"
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
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ page */

function Home() {
  const { hash } = useLocation()

  // One page, so old links like /pricing arrive here as /#pricing. Jump straight to the section
  // (a long smooth scroll from the top would feel slow); clicks on the menu still glide.
  useEffect(() => {
    const id = hash.replace('#', '')
    if (!LANDING_SECTIONS.includes(id)) return

    const root = window.document.documentElement
    const frame = window.requestAnimationFrame(() => {
      root.style.scrollBehavior = 'auto'
      window.document.getElementById(id)?.scrollIntoView({ block: 'start' })
      root.style.scrollBehavior = ''
    })
    return () => window.cancelAnimationFrame(frame)
    // Only the hash the page was opened with: later changes come from the menu's own anchors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.add('landing-smooth')

    const previousTitle = window.document.title
    window.document.title = t('home.meta_title', 'YK Digital Solutions · Invoicing, stock and barcodes for small businesses')

    let meta = window.document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const created = meta === null
    if (!meta) {
      meta = window.document.createElement('meta')
      meta.name = 'description'
      window.document.head.appendChild(meta)
    }
    const previousDescription = meta.content
    meta.content = t(
      'home.meta_description',
      'Invoices, quotations, proformas and delivery notes, stock control and barcode scanning for shops and small businesses. Live on the web, with Android and iPhone apps coming soon.',
    )

    return () => {
      root.classList.remove('landing-smooth')
      window.document.title = previousTitle
      if (created) meta?.remove()
      else if (meta) meta.content = previousDescription
    }
  }, [])

  return (
    <>
      <Hero />
      <HighlightStrip />
      <BuiltFor />
      <FeatureBento />
      <DocumentShowcase />
      <HowItWorks />
      <MobileSection />
      <PricingSection />
      <AboutSection />
      <FaqSection />
      <ContactSection />
      <FinalCta />
      <LegalDialog />
    </>
  )
}

export default Home
