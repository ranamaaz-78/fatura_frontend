import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dices, KeyRound, Pencil, Plus, Power, RotateCcw, Save, Trash2, UserCog, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  createTeamMember,
  deleteTeamMember,
  getTeam,
  resetTeamMemberPassword,
  resetTeamRole,
  saveTeamRole,
  setTeamMemberStatus,
  updateTeamMember,
  type TeamCatalogue,
  type TeamMember,
  type TeamMemberSaved,
} from '../../services/team'
import { PermissionMatrix, roleLabel } from './PermissionMatrix'

const teamKey = ['app', 'team']

type Form = { name: string; email: string; phone: string; password: string; permissions: string[] }

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

/** A readable password the owner can pass on, without look-alike characters. */
function makePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function blankForm(catalogue: TeamCatalogue | undefined): Form {
  const first = Object.keys(catalogue?.presets ?? {})[0]
  return { name: '', email: '', phone: '', password: '', permissions: first ? (catalogue?.presets[first] ?? []) : [] }
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {subtitle ? <p className="mt-0.5 mb-4 text-xs text-ink-muted">{subtitle}</p> : <div className="mb-4" />}
      {children}
    </section>
  )
}

/**
 * The owner's team. Roles and permissions on the left, the account being made on the right (half and half),
 * and everyone who already has a login underneath, full width.
 */
export default function Team() {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const team = useQuery({ queryKey: teamKey, queryFn: getTeam })

  const catalogue = team.data?.catalogue
  const members = team.data?.members ?? []

  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<Form>(() => blankForm(undefined))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resetting, setResetting] = useState<TeamMember | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [ready, setReady] = useState(false)
  // The role the owner picked. Ticking away from it does not rename it; it is also what "Save as role" saves into.
  const [baseRole, setBaseRole] = useState<string | null>(null)

  // Start the form on the first role once the roles have arrived.
  useEffect(() => {
    if (catalogue && !ready) {
      setForm(blankForm(catalogue))
      setBaseRole(Object.keys(catalogue.presets)[0] ?? null)
      setReady(true)
    }
  }, [catalogue, ready])

  // Still exactly what the role gives, or ticked differently.
  const modified = useMemo(
    () => (baseRole && catalogue?.presets[baseRole] ? !sameSet(catalogue.presets[baseRole], form.permissions) : false),
    [baseRole, catalogue, form.permissions],
  )

  function patch(partial: Partial<Form>) {
    setForm((current) => ({ ...current, ...partial }))
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: teamKey })
  }

  function startNew() {
    setEditing(null)
    setErrors({})
    setForm(blankForm(catalogue))
    setBaseRole(Object.keys(catalogue?.presets ?? {})[0] ?? null)
  }

  function startEdit(member: TeamMember) {
    setEditing(member)
    setErrors({})
    setForm({ name: member.name, email: member.email, phone: member.phone ?? '', password: '', permissions: member.permissions })
    // An account made before roles were kept starts from no role until one is picked.
    setBaseRole(member.team_role && catalogue?.presets[member.team_role] ? member.team_role : null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** The email with the login can fail without the member failing: say so, so the owner can pass it on. */
  function reportEmail(saved: TeamMemberSaved, done: string) {
    if (saved.email_sent === false) {
      push({ tone: 'warning', title: t('team.emailFailed', 'Saved, but the email did not go out: {error}', { error: saved.email_error ?? '' }) })
    } else {
      push({ tone: 'success', title: done })
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const phone = form.phone.trim() === '' ? null : form.phone.trim()
      const team_role = baseRole ?? undefined
      if (editing) return updateTeamMember(editing.id, { name: form.name.trim(), phone, team_role, permissions: form.permissions })
      return createTeamMember({
        team_role,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: phone ?? undefined,
        password: form.password,
        permissions: form.permissions,
      })
    },
    onSuccess: (saved) => {
      const wasEditing = editing !== null
      refresh()
      startNew()
      if (wasEditing) push({ tone: 'success', title: t('team.saved', 'Team member saved.') })
      else reportEmail(saved as TeamMemberSaved, t('team.created', 'Team member created and login emailed.'))
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  /** Keep these ticks as this company's own version of the role, or go back to the standard one. */
  const saveRole = useMutation({
    mutationFn: () => saveTeamRole(baseRole as string, form.permissions),
    onSuccess: () => {
      refresh()
      push({ tone: 'success', title: t('team.roleSaved', 'Saved. New members of this role start from these permissions.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const resetRole = useMutation({
    mutationFn: (key: string) => resetTeamRole(key),
    onSuccess: (result, key) => {
      refresh()
      setForm((current) => ({ ...current, permissions: result.presets[key] ?? current.permissions }))
      push({ tone: 'success', title: t('team.roleReset', 'Back to the standard permissions.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const toggle = useMutation({
    mutationFn: (member: TeamMember) => setTeamMemberStatus(member.id, member.status === 'active' ? 'disabled' : 'active'),
    onSuccess: (member) => {
      refresh()
      push({
        tone: 'success',
        title: member.status === 'disabled' ? t('team.disabled', 'Member disabled and signed out.') : t('team.enabled', 'Member enabled.'),
      })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const reset = useMutation({
    mutationFn: () => resetTeamMemberPassword((resetting as TeamMember).id, newPassword),
    onSuccess: (saved) => {
      setResetting(null)
      setNewPassword('')
      reportEmail(saved, t('team.passwordSent', 'New password set and emailed.'))
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (member: TeamMember) => deleteTeamMember(member.id),
    onSuccess: (_result, member) => {
      setRemoving(null)
      if (editing?.id === member.id) startNew()
      refresh()
      push({ tone: 'success', title: t('team.removed', 'Team member removed.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const canSave =
    form.name.trim() !== '' &&
    (editing !== null || (form.email.trim() !== '' && form.password.length >= 8)) &&
    form.permissions.length > 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('team.title', 'Team and roles')}
        subtitle={t('team.subtitle', 'Give people their own login and decide what each one may do.')}
      />

      {/* Two halves: roles and permissions | the account being made */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t('team.rolesTitle', 'Roles and permissions')} subtitle={t('team.addHint', 'Pick a role to start from, then tick or untick anything you like.')}>
          {!catalogue ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <>
              <Select
                label={t('team.role', 'Role')}
                value={baseRole ?? ''}
                onChange={(event) => {
                  const next = event.target.value
                  if (next === '') return
                  setBaseRole(next)
                  patch({ permissions: catalogue.presets[next] ?? [] })
                }}
              >
                {baseRole === null ? (
                  <option value="" disabled>
                    {t('team.pickRole', 'Pick a role')}
                  </option>
                ) : null}
                {Object.keys(catalogue.presets).map((key) => (
                  <option key={key} value={key}>
                    {roleLabel(key)}
                  </option>
                ))}
              </Select>

              <div className="mt-4">
                <PermissionMatrix catalogue={catalogue} value={form.permissions} onChange={(permissions) => patch({ permissions })} />
                <p className="mt-2 text-[11px] text-ink-muted">
                  {t('team.matrixNote', 'Only what can be done is shown. Issued documents are not edited: Payments covers recording a payment and returning pieces. Converting a document needs Create on what it becomes.')}
                </p>
                {errors.permissions ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.permissions}</p> : null}
              </div>

              {baseRole ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-page px-4 py-3">
                  <span className="min-w-0 flex-1 text-xs text-ink-muted">
                    {t('team.roleDefaultHint', 'Want {role} to always start from these ticks? Save them as the role for your company. Members already created keep what they have.', { role: roleLabel(baseRole) })}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Save className="h-4 w-4" />}
                    loading={saveRole.isPending}
                    disabled={sameSet(form.permissions, catalogue.presets[baseRole] ?? []) || form.permissions.length === 0}
                    onClick={() => saveRole.mutate()}
                  >
                    {t('team.saveRole', 'Save as {role} role', { role: roleLabel(baseRole) })}
                  </Button>
                  {(catalogue.customized ?? []).includes(baseRole) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw className="h-4 w-4" />}
                      loading={resetRole.isPending}
                      onClick={() => resetRole.mutate(baseRole)}
                    >
                      {t('team.resetRole', 'Back to standard')}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card
          title={editing ? t('team.editTitle', 'Edit team member') : t('team.accountTitle', 'Create account')}
          subtitle={
            editing
              ? editing.email
              : t('team.accountHint', 'Their login is emailed to them with the password you set here.')
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('team.name', 'Name')} required value={form.name} error={errors.name} onChange={(event) => patch({ name: event.target.value })} />
            <Input
              label={t('team.email', 'Email')}
              type="email"
              required
              disabled={editing !== null}
              value={form.email}
              error={errors.email}
              onChange={(event) => patch({ email: event.target.value })}
            />
            <Input label={t('team.phone', 'Phone')} value={form.phone} error={errors.phone} onChange={(event) => patch({ phone: event.target.value })} />
            {editing ? null : (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label={t('team.password', 'Password')}
                    required
                    value={form.password}
                    error={errors.password}
                    onChange={(event) => patch({ password: event.target.value })}
                  />
                </div>
                <Button variant="secondary" icon={<Dices className="h-4 w-4" />} onClick={() => patch({ password: makePassword() })}>
                  {t('team.generate', 'Generate')}
                </Button>
              </div>
            )}
          </div>
          {editing ? null : <p className="mt-2 text-[11px] text-ink-muted">{t('team.passwordHint', 'At least 8 characters. It is emailed to them with their email.')}</p>}

          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-page px-4 py-3">
            <span className="text-xs text-ink-muted">
              {t('team.summary', 'Role')}: <b className="text-ink">{baseRole ? roleLabel(baseRole) : '—'}</b>
              {modified ? ` (${t('team.modified', 'ticks changed')})` : ''} · {form.permissions.length} {t('team.permissionsCount', 'permissions')}
            </span>
            <span className="flex items-center gap-2">
              {editing ? (
                <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={startNew}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              ) : null}
              <Button icon={editing ? undefined : <Plus className="h-4 w-4" />} loading={save.isPending} disabled={!canSave || !catalogue} onClick={() => save.mutate()}>
                {editing ? t('common.save', 'Save') : t('team.create', 'Create and email login')}
              </Button>
            </span>
          </div>
        </Card>
      </div>

      {/* Everyone who has a login, full width */}
      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-ink">
            {t('team.membersTitle', 'Team members')} <span className="text-xs font-medium text-ink-muted">({members.length})</span>
          </h2>
        </div>

        {team.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={t('team.emptyTitle', 'No team members yet')}
            description={t('team.emptyBody', 'Add a cashier, a manager or an accountant. They sign in with their own email and see only what you allow.')}
          />
        ) : (
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.id} className={cn('flex flex-wrap items-center gap-3 px-5 py-4', editing?.id === member.id && 'bg-brand-50/60')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{member.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{member.email}</span>
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    {member.last_login_at
                      ? t('team.lastLogin', 'Last sign-in {date}', { date: formatDateTime(member.last_login_at) })
                      : t('team.neverLogin', 'Has not signed in yet')}
                  </span>
                </span>

                <span className="inline-flex items-center rounded-full border border-line bg-page px-2.5 py-0.5 text-xs font-medium text-ink">
                  {member.team_role && member.team_role !== 'custom' ? roleLabel(member.team_role) : '—'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {member.status === 'active' ? t('team.active', 'Active') : t('team.disabledBadge', 'Disabled')}
                </span>

                <span className="flex flex-wrap items-center gap-1">
                  <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => startEdit(member)}>
                    {t('common.edit', 'Edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<KeyRound className="h-4 w-4" />}
                    onClick={() => {
                      setNewPassword('')
                      setResetting(member)
                    }}
                  >
                    {t('team.resetPassword', 'Password')}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Power className="h-4 w-4" />} loading={toggle.isPending && toggle.variables?.id === member.id} onClick={() => toggle.mutate(member)}>
                    {member.status === 'active' ? t('team.disable', 'Disable') : t('team.enable', 'Enable')}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-rose-600" />} onClick={() => setRemoving(member)}>
                    {t('common.delete', 'Delete')}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={resetting !== null}
        onClose={() => setResetting(null)}
        title={t('team.resetTitle', 'Set a new password')}
        subtitle={resetting?.name}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetting(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button loading={reset.isPending} disabled={newPassword.length < 8} onClick={() => reset.mutate()}>
              {t('team.resetConfirm', 'Save and email')}
            </Button>
          </>
        }
      >
        <Input
          label={t('team.password', 'Password')}
          value={newPassword}
          hint={t('team.resetHint', 'At least 8 characters. Anywhere they are signed in is closed, and the new password is emailed to them.')}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
        loading={remove.isPending}
        title={t('team.removeTitle', 'Remove this member?')}
        description={t('team.removeBody', '{name} will no longer be able to sign in. The documents they made stay as they are.', { name: removing?.name ?? '' })}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}
