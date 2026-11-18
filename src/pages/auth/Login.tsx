import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { useToast } from '../../components/ui/Toast'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
import { isDesktop } from '../../lib/desktop'
import { takeLoginNotice } from '../../lib/loginNotice'
import { getErrorMessage, mapValidationErrors } from '../../services/api'

const schema = z.object({
  email: z.email(t('setup.emailInvalid', 'Enter a valid email address.')),
  password: z.string().min(1, t('login.enter_your_password', 'Enter your password.')),
})

type LoginForm = z.infer<typeof schema>

function Login() {
  const { login } = useAuth()
  // Why they were signed out (suspended, subscription ended, switched off), shown once.
  const [notice] = useState(() => takeLoginNotice())
  const navigate = useNavigate()
  const location = useLocation()
  const { push } = useToast()
  const from = (location.state as { from?: string } | null)?.from
  // "Remember me" exists only in the Windows app, where the system can keep the password encrypted.
  const [canRemember, setCanRemember] = useState(false)
  const [remember, setRemember] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  // What was remembered last time comes back into the form.
  useEffect(() => {
    if (!isDesktop) return
    void window.desktop?.credentials?.get().then((saved) => {
      if (!saved?.available) return
      setCanRemember(true)
      if (saved.email) {
        setValue('email', saved.email)
        setRemember(true)
      }
      if (saved.password) setValue('password', saved.password)
    })
  }, [setValue])

  const mutation = useMutation({
    mutationFn: (values: LoginForm) => login(values.email, values.password),
    onSuccess: (result, values) => {
      // Signed in: keep the email and password for next time, or forget them, as the box says.
      if (canRemember) void (remember ? window.desktop?.credentials?.save(values.email, values.password) : window.desktop?.credentials?.forget())
      navigate(from ?? homeFor(result.role), { replace: true })
    },
    onError: (error) => {
      const fieldErrors = mapValidationErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof LoginForm, { message })
        }
        return
      }
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.loginTitle', 'Welcome back')}
      </h1>
      <p className="mt-1.5 text-sm text-[#434655]">
        {t('auth.loginSubtitle', 'Sign in to your YK Digital Solutions workspace.')}
      </p>

      {notice ? (
        <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <PublicInput
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          required
          placeholder={t('forgotPassword.you_business_com', 'you@business.com')}
          error={errors.email?.message}
          {...register('email')}
        />
        <PublicInput
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      {canRemember ? (
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-[#0b1c30]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#c3c6d7] accent-[#004ac6]"
          />
          <span>
            <span className="font-semibold">{t('auth.remember', 'Remember me on this computer')}</span>
            <span className="block text-xs text-[#434655]">{t('auth.rememberHint', 'Your email and password are kept encrypted on this computer, only in the Windows app.')}</span>
          </span>
        </label>
      ) : null}

      <PublicSubmit className="mt-6 w-full" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.signingIn', 'Signing in') : t('auth.login', 'Log in')}
      </PublicSubmit>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link to="/forgot-password" className="font-semibold text-[#004ac6] hover:text-[#2563eb]">
          {t('auth.forgot', 'Forgot your password?')}
        </Link>
        <span className="text-[#434655]">
          {t('auth.noAccount', 'No account yet?')}{' '}
          <Link to="/apply" className="font-semibold text-[#004ac6] hover:text-[#2563eb]">
            {t('auth.applyInstead', 'Apply for access')}
          </Link>
        </span>
      </div>
    </form>
  )
}

export default Login
