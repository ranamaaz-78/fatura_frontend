import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
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
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.loginTitle', 'Welcome back')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('auth.loginSubtitle', 'Sign in to your Fatura workspace.')}
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('auth.password', 'Password')}
          type="password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {mutation.isPending ? t('auth.signingIn', 'Signing in') : t('auth.login', 'Log in')}
      </Button>

      <div className="flex items-center justify-between text-xs">
        <Link to="/forgot-password" className="font-semibold text-blue-700 hover:text-blue-800">
          {t('auth.forgot', 'Forgot your password?')}
        </Link>
        <span className="text-slate-500">
          {t('auth.noAccount', 'No account yet?')}{' '}
          <Link to="/apply" className="font-semibold text-blue-700 hover:text-blue-800">
            {t('auth.applyInstead', 'Apply for access')}
          </Link>
        </span>
      </div>
    </form>
  )
}

export default Login
