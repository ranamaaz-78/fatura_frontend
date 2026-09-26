import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { PublicInput, PublicSubmit } from '../../components/ui/PublicField'
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
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#007d55]">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
          {t('auth.forgotTitle', 'Reset your password')}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#434655]">
          {t('auth.forgotSent', 'If that email is registered, a reset link is on its way.')}
        </p>
        <Link to="/login" className="mt-7 inline-block text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
          {t('auth.backToLogin', 'Back to log in')}
        </Link>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}>
      <h1 className="text-[30px] font-extrabold tracking-[-0.025em] text-[#0b1c30]">
        {t('auth.forgotTitle', 'Reset your password')}
      </h1>
      <p className="mt-1.5 text-[15px] text-[#434655]">
        {t('auth.forgotSubtitle', 'Enter your email and we will send you a reset link.')}
      </p>

      <div className="mt-7">
        <PublicInput
          label={t('auth.email', 'Email')}
          type="email"
          autoComplete="email"
          required
          placeholder="you@business.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <PublicSubmit className="mt-7 w-full" disabled={mutation.isPending}>
        {t('auth.forgotSend', 'Send reset link')}
      </PublicSubmit>

      <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-[#004ac6] hover:text-[#2563eb]">
        {t('auth.backToLogin', 'Back to log in')}
      </Link>
    </form>
  )
}

export default ForgotPassword
