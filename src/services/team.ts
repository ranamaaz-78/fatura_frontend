import { api, unwrap } from './api'

export type TeamMember = {
  id: number
  name: string
  email: string
  phone: string | null
  status: 'active' | 'disabled'
  /** manager, cashier, accountant, or custom once the ticks no longer match one. */
  team_role: string
  permissions: string[]
  last_login_at: string | null
}

export type TeamCatalogue = {
  /** Area => the actions that exist for it. */
  modules: Record<string, string[]>
  /** Role => the permissions it starts with. */
  presets: Record<string, string[]>
  /** Roles this company changed from the standard. */
  customized?: string[]
}

export type TeamOverview = { members: TeamMember[]; catalogue: TeamCatalogue }

export type TeamMemberInput = {
  name: string
  email: string
  phone?: string
  password: string
  /** The role picked to start from. */
  team_role?: string
  permissions: string[]
}

/** What comes back when a login was emailed: whether the email left. */
export type TeamMemberSaved = TeamMember & { email_sent?: boolean; email_error?: string | null }

export function getTeam(): Promise<TeamOverview> {
  return unwrap<TeamOverview>(api.get('/app/team'))
}

export function createTeamMember(input: TeamMemberInput): Promise<TeamMemberSaved> {
  return unwrap<TeamMemberSaved>(api.post('/app/team', input))
}

export function updateTeamMember(
  id: number,
  input: { name?: string; phone?: string | null; team_role?: string; permissions?: string[] },
): Promise<TeamMember> {
  return unwrap<TeamMember>(api.patch(`/app/team/${id}`, input))
}

export function setTeamMemberStatus(id: number, status: 'active' | 'disabled'): Promise<TeamMember> {
  return unwrap<TeamMember>(api.patch(`/app/team/${id}/status`, { status }))
}

export function resetTeamMemberPassword(id: number, password: string): Promise<TeamMemberSaved> {
  return unwrap<TeamMemberSaved>(api.post(`/app/team/${id}/password`, { password }))
}

export function deleteTeamMember(id: number): Promise<unknown> {
  return unwrap(api.delete(`/app/team/${id}`))
}

/** Keeps the ticks as this company's own version of a role (members already made are not changed). */
export function saveTeamRole(role: string, permissions: string[]): Promise<{ presets: Record<string, string[]>; customized: string[] }> {
  return unwrap(api.put(`/app/team/roles/${role}`, { permissions }))
}

/** Back to the standard permissions for a role. */
export function resetTeamRole(role: string): Promise<{ presets: Record<string, string[]>; customized: string[] }> {
  return unwrap(api.delete(`/app/team/roles/${role}`))
}
