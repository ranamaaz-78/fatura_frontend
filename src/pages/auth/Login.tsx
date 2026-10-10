import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { useToast } from '../../components/ui/Toast'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
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

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: LoginForm) => login(values.email, values.password),
    onSuccess: (result) => {
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
