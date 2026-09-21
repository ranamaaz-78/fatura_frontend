import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { getErrorMessage } from '../../services/api'
import { forgotPassword } from '../../services/auth'

const schema = z.object({ email: z.email('Enter a valid email address.') })

type ForgotForm = z.infer<typeof schema>

function ForgotPassword() {
  const { push } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: ForgotForm) => forgotPassword(values.email),
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  if (mutation.isSuccess) {
    return (
      <div className="space-y-4">
        <MailCheck className="h-8 w-8 text-emerald-600" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t('auth.forgotTitle', 'Reset your password')}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {t('auth.forgotSent', 'If that email is registered, a reset link is on its way.')}
        </p>
        <Link to="/login" className="inline-block text-xs font-semibold text-blue-700">
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('auth.forgotTitle', 'Reset your password')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('auth.forgotSubtitle', 'Enter your email and we will send you a reset link.')}
        </p>
      </div>

      <Input
        label={t('auth.email', 'Email')}
        type="email"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
        {t('auth.forgotSend', 'Send reset link')}
      </Button>

      <Link to="/login" className="inline-block text-xs font-semibold text-blue-700">
        {t('auth.backToLogin', 'Back to log in')}
      </Link>
    </form>
  )
}

export default ForgotPassword
