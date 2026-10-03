import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, MailCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { t } from '../../i18n'
import { getErrorCode, getErrorMessage } from '../../services/api'
import { forgotPassword } from '../../services/auth'

const schema = z.object({ email: z.email(t('setup.emailInvalid', 'Enter a valid email address.')) })

type ForgotForm = z.infer<typeof schema>

/** The server asks for a minute between links; the button counts it down so nobody has to guess. */
const RESEND_SECONDS = 60

function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const mutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
    onSuccess: (_data, email) => {
      setNotice(null)
      setNotFound(false)
      setSentTo(email)
      setCooldown(RESEND_SECONDS)
    },
    onError: (error) => {
      const code = getErrorCode(error)
      if (code === 'ACCOUNT_NOT_FOUND') {
        setSentTo(null)
        setNotFound(true)
        setError('email', {
          message: t('auth.forgotNotFound', 'No account is registered with this email address.'),
        })
        return
      }
      if (code === 'RESET_THROTTLED') setCooldown(RESEND_SECONDS)
      setNotice(getErrorMessage(error))
    },
  })

  function submit(values: ForgotForm) {
    setNotice(null)
    setNotFound(false)
    mutation.mutate(values.email.trim())
  }

  if (sentTo) {
    return (
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#007d55]">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
          {t('auth.forgotCheckTitle', 'Check your email')}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">
          {t('auth.forgotSentTo', 'We sent a password reset link to')}{' '}
          <strong className="font-semibold break-all text-[#0b1c30]">{sentTo}</strong>.{' '}
          {t('auth.forgotValid', 'The link works for 60 minutes. If you cannot see it, look in your spam folder.')}
        </p>

        {notice ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={cooldown > 0 || mutation.isPending}
            onClick={() => mutation.mutate(sentTo)}
            className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl border border-[#dbe1ff] bg-white px-5 text-sm font-semibold text-[#0b1c30] transition-colors hover:border-[#c3d4ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cooldown > 0
              ? `${t('auth.forgotResendIn', 'Send again in')} ${cooldown}s`
              : t('auth.forgotResend', 'Send the link again')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSentTo(null)
              setNotice(null)
              clearErrors()
            }}
            className="cursor-pointer text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]"
          >
            {t('auth.forgotOtherEmail', 'Use a different email')}
          </button>
        </div>

        <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <h1 className="text-[30px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.forgotTitle', 'Reset your password')}
      </h1>
      <p className="mt-1.5 text-[15px] text-[#434655]">
        {t('auth.forgotSubtitle', 'Enter your email and we will send you a reset link.')}
      </p>

      {notice ? (
        <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      <div className="mt-7">
        <PublicInput
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          required
          placeholder={t('forgotPassword.you_business_com', 'you@business.com')}
          error={errors.email?.message}
          {...register('email', {
            onChange: () => {
              if (errors.email) clearErrors('email')
              setNotFound(false)
            },
          })}
        />
      </div>

      <PublicSubmit className="mt-7 w-full" disabled={mutation.isPending || cooldown > 0}>
        {cooldown > 0 ? `${t('auth.forgotResendIn', 'Send again in')} ${cooldown}s` : t('auth.forgotSend', 'Send reset link')}
      </PublicSubmit>

      {notFound ? (
        <p className="mt-5 text-sm text-[#434655]">
          {t('auth.forgotNoAccountHelp', 'Not registered yet?')}{' '}
          <Link to="/apply" className="font-semibold text-[#004ac6] hover:text-[#2563eb]">
            {t('auth.applyForAccess', 'Apply for access')}
          </Link>
        </p>
      ) : null}

      <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
        <ArrowLeft className="h-4 w-4" />
        {t('auth.backToLogin', 'Back to log in')}
      </Link>
    </form>
  )
}

export default ForgotPassword
