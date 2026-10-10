import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { t } from '../../i18n'
import { changePassword } from '../../services/auth'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useToast } from '../ui/Toast'

/** Changes the password of whoever is signed in: needs the current one, then the new one twice. */
export function ChangePasswordForm({ scope }: { scope: 'app' | 'admin' }) {
  const { session } = useAuth()
  const { push } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () =>
      changePassword(
        { current_password: currentPassword, password, password_confirmation: confirmation },
        scope,
      ),
    onSuccess: () => {
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setErrors({})
      push({ tone: 'success', title: t('settings.passwordSaved', 'Password updated.') })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const canSave = currentPassword !== '' && password.length >= 8 && confirmation !== ''

  return (
    <div className="flex max-w-lg flex-col gap-5">
      <p className="text-xs text-slate-500">
        {t('settings.passwordHint', 'Changes the password for the account you are signed in with.')}
      </p>
      {session?.user.email ? (
        <p className="text-xs text-slate-600">
          {t('settings.accountEmail', 'Signed in as')} <span className="font-semibold text-slate-800">{session.user.email}</span>
        </p>
      ) : null}
      <Input
        type="password"
        autoComplete="current-password"
        label={t('settings.currentPassword', 'Current password')}
        value={currentPassword}
        error={errors.current_password}
        required
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={t('settings.newPassword', 'New password')}
        hint={t('settings.passwordRule', 'Use at least 8 characters.')}
        value={password}
        error={errors.password}
        required
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        type="password"
        autoComplete="new-password"
        label={t('settings.confirmPassword', 'Confirm new password')}
        value={confirmation}
        error={errors.password_confirmation}
        required
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <div>
        <Button type="button" disabled={!canSave} loading={save.isPending} onClick={() => save.mutate()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  )
}
