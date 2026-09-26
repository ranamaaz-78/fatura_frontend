import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Mail, MessageCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/AuthProvider'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { t } from '../../i18n'
import { getErrorCode, getErrorMessage, mapValidationErrors } from '../../services/api'
import { setPassword } from '../../services/auth'
import type { SupportContact } from '../../types/module01'

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    password_confirmation: z.string().min(1, 'Repeat your password.'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match.',
  })

type SetPasswordForm = z.infer<typeof schema>

function SupportBlock({ support }: { support: SupportContact | null }) {
  const email = support?.email
  const whatsapp = support?.whatsapp

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D+/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center gap-2.5 rounded-xl border border-[#dbe1ff] bg-white px-4 text-sm font-semibold text-[#0b1c30] hover:border-[#c3d4ff]"
        >
          <MessageCircle className="h-[18px] w-[18px] text-[#007d55]" />
          {t('auth.contactWhatsapp', 'Message us on WhatsApp')}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex h-12 items-center gap-2.5 rounded-xl border border-[#dbe1ff] bg-white px-4 text-sm font-semibold text-[#0b1c30] hover:border-[#c3d4ff]"
        >
          <Mail className="h-[18px] w-[18px] text-[#004ac6]" />
          {t('auth.contactEmail', 'Email support')}
        </a>
      ) : null}
    </div>
  )
}

function Notice({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">{body}</p>
      {children}
      <Link to="/login" className="mt-7 inline-block text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
        {t('auth.backToLogin', 'Back to log in')}
      </Link>
    </div>
  )
}

function SetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { adoptSession } = useAuth()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const [expired, setExpired] = useState<SupportContact | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SetPasswordForm>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: SetPasswordForm) =>
      setPassword({ token, email, password: values.password, password_confirmation: values.password_confirmation }),
    onSuccess: async (result) => {
      await adoptSession(result)
      navigate('/app/dashboard', { replace: true })
    },
    onError: (error) => {
      if (getErrorCode(error) === 'INVITE_INVALID') {
        const support = (error as { response?: { data?: { support?: SupportContact } } }).response?.data?.support
        setExpired(support ?? { email: '', whatsapp: '' })
        return
      }
      const fieldErrors = mapValidationErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'password' || field === 'password_confirmation') {
            setError(field, { message })
          } else {
            setFormError(message)
          }
        }
        return
      }
      setFormError(getErrorMessage(error))
    },
  })

  if (!token || !email) {
    return (
      <Notice
        title={t('auth.setPasswordTitle', 'Choose your password')}
        body={t(
          'auth.setPasswordMissing',
          'This link is incomplete. Open the link from your email exactly as it was sent.',
        )}
      />
    )
  }

  if (expired) {
    return (
      <Notice
        title={t('auth.linkExpiredTitle', 'This link has expired')}
        body={t(
          'auth.linkExpiredBody',
          'Set-password links are valid for 48 hours. Contact us and we will send a fresh one.',
        )}
      >
        <SupportBlock support={expired} />
      </Notice>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <h1 className="text-[30px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.setPasswordTitle', 'Choose your password')}
      </h1>
      <p className="mt-1.5 text-[15px] text-[#434655]">
        {t('auth.setPasswordSubtitle', 'Pick a password to finish setting up your account.')}
      </p>
      <p className="mt-2 font-mono text-[13px] text-[#64748b]">{email}</p>

      {formError ? (
        <p className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-4.5">
        <PublicInput
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
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
        {t('auth.setPasswordSubmit', 'Set password and continue')}
      </PublicSubmit>
    </form>
  )
}

export default SetPassword
