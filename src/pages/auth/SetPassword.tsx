import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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
    <div className="mt-6 space-y-2">
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D+/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          {t('auth.contactWhatsapp', 'Message us on WhatsApp')}
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Mail className="h-4 w-4 text-blue-600" />
          {t('auth.contactEmail', 'Email support')}
        </a>
      ) : null}
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
      <div className="space-y-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t('auth.setPasswordTitle', 'Choose your password')}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {t('auth.setPasswordMissing', 'This link is incomplete. Open the link from your email exactly as it was sent.')}
        </p>
        <Link to="/login" className="inline-block text-xs font-semibold text-blue-700">
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    )
  }

  if (expired) {
    return (
      <div>
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          {t('auth.linkExpiredTitle', 'This link has expired')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t('auth.linkExpiredBody', 'Set-password links are valid for 48 hours. Contact us and we will send a fresh one.')}
        </p>
        <SupportBlock support={expired} />
        <Link to="/login" className="mt-6 inline-block text-xs font-semibold text-blue-700">
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.setPasswordTitle', 'Choose your password')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('auth.setPasswordSubtitle', 'Pick a password to finish setting up your account.')}
        </p>
        <p className="mt-2 font-mono text-xs text-slate-400">{email}</p>
      </div>

      {formError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{formError}</p>
      ) : null}

      <div className="space-y-4">
        <Input
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label={t('auth.confirmPassword', 'Confirm password')}
          type="password"
          autoComplete="new-password"
          required
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
      </div>

      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {t('auth.setPasswordSubmit', 'Set password and continue')}
      </Button>
    </form>
  )
}

export default SetPassword
