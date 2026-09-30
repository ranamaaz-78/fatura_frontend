import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
import { useToast } from '../../components/ui/Toast'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
import { getErrorMessage, mapValidationErrors } from '../../services/api'

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginForm = z.infer<typeof schema>

function Login() {
  const { login } = useAuth()
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
      <h1 className="text-[30px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.loginTitle', 'Welcome back')}
      </h1>
      <p className="mt-1.5 text-[15px] text-[#434655]">
        {t('auth.loginSubtitle', 'Sign in to your YK Digital Solutions workspace.')}
      </p>

      <div className="mt-8 flex flex-col gap-4.5">
        <PublicInput
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          required
          placeholder="you@business.com"
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

      <PublicSubmit className="mt-7 w-full" disabled={mutation.isPending}>
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
