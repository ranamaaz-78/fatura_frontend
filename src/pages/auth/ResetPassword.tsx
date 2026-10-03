import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { t } from '../../i18n'
import { getErrorCode, getErrorMessage, mapValidationErrors } from '../../services/api'
import { resetPassword } from '../../services/auth'

const schema = z
  .object({
    password: z.string().min(8, t('settings.passwordRule', 'Use at least 8 characters.')),
    password_confirmation: z.string().min(1, t('resetPassword.repeat_your_password', 'Repeat your password.')),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: t('resetPassword.passwords_do_not_match', 'Passwords do not match.'),
  })

type ResetForm = z.infer<typeof schema>

function Notice({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">{body}</p>
      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        {children}
        <Link to="/login" className="text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    </div>
  )
}

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const [expired, setExpired] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: ResetForm) =>
      resetPassword({ token, email, password: values.password, password_confirmation: values.password_confirmation }),
    onSuccess: () => setDone(true),
    onError: (error) => {
      if (getErrorCode(error) === 'RESET_INVALID') {
        setExpired(true)
        return
      }
      const fieldErrors = mapValidationErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'password' || field === 'password_confirmation') setError(field, { message })
          else setFormError(message)
        }
        return
      }
      setFormError(getErrorMessage(error))
    },
  })

  if (done) {
    return (
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#007d55]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
          {t('auth.resetDoneTitle', 'Password updated')}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">
          {t('auth.resetDoneBody', 'Your password has been changed and any other signed-in devices were logged out. Log in with your new password.')}
        </p>
        <Link
          to="/login"
          className="mt-7 inline-flex h-[52px] items-center justify-center rounded-xl bg-[#004ac6] px-8 text-base font-semibold text-white shadow-[0_8px_20px_rgba(0,74,198,0.3)] transition-all hover:-translate-y-px hover:bg-[#2563eb]"
        >
          {t('auth.login', 'Log in')}
        </Link>
      </div>
    )
  }

  if (!token || !email) {
    return (
      <Notice
        title={t('auth.resetTitle', 'Reset password')}
        body={t('auth.resetMissing', 'This link is incomplete. Open the link from your email exactly as it was sent.')}
      >
        <Link to="/forgot-password" className="text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
          {t('auth.resetAskNew', 'Ask for a new link')}
        </Link>
      </Notice>
    )
  }

  if (expired) {
    return (
      <Notice
        title={t('auth.resetExpiredTitle', 'This link has expired')}
        body={t('auth.resetExpiredBody', 'Reset links work for 60 minutes and only once. Ask for a new one and we will email it right away.')}
      >
        <Link
          to="/forgot-password"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#004ac6] px-6 text-sm font-semibold text-white hover:bg-[#2563eb]"
        >
          {t('auth.resetAskNew', 'Ask for a new link')}
        </Link>
      </Notice>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <h1 className="text-[30px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.resetTitle', 'Reset password')}
      </h1>
      <p className="mt-1.5 text-[15px] text-[#434655]">{t('auth.resetSubtitle', 'Choose a new password for your account.')}</p>
      <p className="mt-2 text-[13px] break-all text-[#64748b]">{email}</p>

      {formError ? (
        <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p>
      ) : null}

      <div className="mt-7 flex flex-col gap-4.5">
        <PublicInput
          label={t('auth.newPassword', 'New password')}
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          hint={t('auth.passwordHint', 'At least 8 characters.')}
          error={errors.password?.message}
          {...register('password')}
        />
        <PublicInput
          label={t('auth.confirmPassword', 'Confirm password')}
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
      </div>

      <PublicSubmit className="mt-7 w-full" disabled={mutation.isPending}>
        {t('auth.resetSubmit', 'Save new password')}
      </PublicSubmit>

      <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
        {t('auth.backToLogin', 'Back to log in')}
      </Link>
    </form>
  )
}

export default ResetPassword
