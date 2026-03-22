import { randomBytes } from 'crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  APP_ROUTES,
  type OrganizationMemberStatus,
  type OrganizationRole,
} from '@/lib/constants'
import type { Database, TableInsert, TableRow } from '@/lib/database.types'
import { getAppUrl } from '@/lib/env'
import { getProfileBundle } from '@/lib/profile/service'

type AppSupabaseClient = SupabaseClient<Database>

export class OrganizationServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'OrganizationServiceError'
    this.statusCode = statusCode
  }
}

export interface OrganizationContext {
  organization: TableRow<'organizations'>
  membership: TableRow<'organization_members'>
  settings: TableRow<'organization_settings'> | null
}

export interface OrganizationMemberRecord {
  membership: TableRow<'organization_members'>
  profile: TableRow<'profiles'> | null
  trainingProfile: TableRow<'user_training_profile'> | null
}

function normalizeOrganizationSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function buildUniqueSlugCandidate(baseSlug: string) {
  const suffix = randomBytes(2).toString('hex')
  return `${baseSlug}-${suffix}`
}

function buildInviteToken() {
  return randomBytes(24).toString('hex')
}

function buildInviteUrl(token: string) {
  return `${getAppUrl()}${APP_ROUTES.invite}/${token}`
}

function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

function mapOrganizationError(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (message.includes('User already belongs to an organization')) {
    return new OrganizationServiceError('You already belong to an organization.', 409)
  }

  if (message.includes('Organization name is required')) {
    return new OrganizationServiceError('Organization name is required.', 400)
  }

  if (message.includes('Organization slug is required')) {
    return new OrganizationServiceError('Organization slug could not be generated.', 400)
  }

  if (message.includes('Invite not found or expired')) {
    return new OrganizationServiceError('This invite is no longer valid.', 410)
  }

  if (message.includes('Invite email does not match the authenticated user')) {
    return new OrganizationServiceError(
      'This invite was sent to a different email address.',
      403,
    )
  }

  if (message.includes('Organization admin access is required')) {
    return new OrganizationServiceError('Organization admin access is required.', 403)
  }

  if (message.includes('You cannot invite your own account')) {
    return new OrganizationServiceError('You cannot invite your own account.', 400)
  }

  if (message.includes('already a member of this organization')) {
    return new OrganizationServiceError('That user is already a member of this organization.', 409)
  }

  if (message.includes('Organization member not found')) {
    return new OrganizationServiceError('The selected organization member could not be found.', 404)
  }

  if (message.includes('You can only manage members in your own organization')) {
    return new OrganizationServiceError(
      'You can only manage members in your own organization.',
      403,
    )
  }

  if (message.includes('You cannot change your own organization role')) {
    return new OrganizationServiceError(
      'You cannot change your own organization role.',
      400,
    )
  }

  if (message.includes('You cannot remove your own organization access')) {
    return new OrganizationServiceError(
      'You cannot remove your own organization access.',
      400,
    )
  }

  if (message.includes('The last organization admin cannot be changed')) {
    return new OrganizationServiceError(
      'The last organization admin cannot be changed.',
      409,
    )
  }

  if (message.includes('The last organization admin cannot be removed')) {
    return new OrganizationServiceError(
      'The last organization admin cannot be removed.',
      409,
    )
  }

  if (message.includes('The last organization admin cannot be suspended')) {
    return new OrganizationServiceError(
      'The last organization admin cannot be suspended.',
      409,
    )
  }

  if (message.includes('Invalid organization role')) {
    return new OrganizationServiceError('The requested organization role is invalid.', 400)
  }

  if (message.includes('Invalid organization member status')) {
    return new OrganizationServiceError('The requested member status is invalid.', 400)
  }

  if (message.includes('You cannot change your own organization status')) {
    return new OrganizationServiceError(
      'You cannot change your own organization status.',
      400,
    )
  }

  if (message.includes('Invite not found')) {
    return new OrganizationServiceError('The selected invite could not be found.', 404)
  }

  if (message.includes('You can only manage invites in your own organization')) {
    return new OrganizationServiceError(
      'You can only manage invites in your own organization.',
      403,
    )
  }

  if (message.includes('Only pending invites can be canceled')) {
    return new OrganizationServiceError('Only pending invites can be canceled.', 409)
  }

  return error
}

export async function getCurrentOrganizationContext(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<OrganizationContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (!membership) {
    return null
  }

  const [organizationResult, settingsResult] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', membership.organization_id).single(),
    supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .maybeSingle(),
  ])

  if (organizationResult.error) {
    throw organizationResult.error
  }

  if (settingsResult.error) {
    throw settingsResult.error
  }

  return {
    organization: organizationResult.data as TableRow<'organizations'>,
    membership: membership as TableRow<'organization_members'>,
    settings: (settingsResult.data as TableRow<'organization_settings'> | null) ?? null,
  }
}

export async function createOrganization(
  supabase: AppSupabaseClient,
  userId: string,
  input: {
    name: string
    industry?: string | null
  },
) {
  await getProfileBundle(supabase, userId)

  const baseSlug = normalizeOrganizationSlug(input.name)

  if (!baseSlug) {
    throw new Error('Unable to derive an organization slug from the provided name.')
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : buildUniqueSlugCandidate(baseSlug)
    const { error } = await supabase.rpc('create_organization_with_admin', {
      org_name: input.name,
      org_slug: slug,
      org_industry: input.industry?.trim() ? input.industry.trim() : null,
    })

    if (!error) {
      const context = await getCurrentOrganizationContext(supabase, userId)

      if (!context) {
        throw new Error('Organization was created but could not be loaded.')
      }

      return context
    }

    if (error.code === '23505' && attempt < 3) {
      continue
    }

    throw mapOrganizationError(error)
  }

  throw new Error('Unable to create an organization with a unique slug.')
}

export async function listOrganizationMembers(
  supabase: AppSupabaseClient,
  organizationId: string,
) {
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true })

  if (membershipError) {
    throw membershipError
  }

  const typedMemberships = (memberships ?? []) as TableRow<'organization_members'>[]
  const userIds = typedMemberships.map((member) => member.user_id)

  if (!userIds.length) {
    return [] as OrganizationMemberRecord[]
  }

  const [profilesResult, trainingProfilesResult] = await Promise.all([
    supabase.from('profiles').select('*').in('id', userIds),
    supabase.from('user_training_profile').select('*').in('user_id', userIds),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }

  if (trainingProfilesResult.error) {
    throw trainingProfilesResult.error
  }

  const profiles = new Map(
    ((profilesResult.data ?? []) as TableRow<'profiles'>[]).map((profile) => [profile.id, profile]),
  )
  const trainingProfiles = new Map(
    ((trainingProfilesResult.data ?? []) as TableRow<'user_training_profile'>[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  )

  return typedMemberships
    .map((membership) => ({
      membership,
      profile: profiles.get(membership.user_id) ?? null,
      trainingProfile: trainingProfiles.get(membership.user_id) ?? null,
    }))
    .sort((left, right) => {
      if (left.membership.status !== right.membership.status) {
        return left.membership.status === 'active' ? -1 : 1
      }

      if (left.membership.role !== right.membership.role) {
        return left.membership.role === 'admin' ? -1 : 1
      }

      const leftScore = left.trainingProfile?.total_score ?? 0
      const rightScore = right.trainingProfile?.total_score ?? 0
      return rightScore - leftScore
    })
}

export async function listTeamInvites(
  supabase: AppSupabaseClient,
  organizationId: string,
  limit = 20,
) {
  const { data, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'team_invites'>[]
}

export async function inviteOrganizationMember(
  supabase: AppSupabaseClient,
  input: {
    organizationId: string
    invitedBy: string
    email: string
    role: OrganizationRole
    expiresInDays?: number
  },
) {
  const normalizedEmail = normalizeInviteEmail(input.email)
  const inviterProfile = await getProfileBundle(supabase, input.invitedBy)

  if (normalizedEmail === normalizeInviteEmail(inviterProfile.profile.email)) {
    throw new OrganizationServiceError('You cannot invite your own account.', 400)
  }

  const existingMembers = await listOrganizationMembers(supabase, input.organizationId)
  const existingMember = existingMembers.find(
    (member) => normalizeInviteEmail(member.profile?.email ?? '') === normalizedEmail,
  )

  if (existingMember) {
    throw new OrganizationServiceError('That user is already a member of this organization.', 409)
  }

  const { data: existingInvite, error: existingInviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('organization_id', input.organizationId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInviteError) {
    throw existingInviteError
  }

  if (existingInvite) {
    return {
      invite: existingInvite as TableRow<'team_invites'>,
      inviteUrl: buildInviteUrl(existingInvite.token),
      isExisting: true,
    }
  }

  const expiresAt = new Date(Date.now() + 86_400_000 * (input.expiresInDays ?? 7)).toISOString()
  const payload: TableInsert<'team_invites'> = {
    organization_id: input.organizationId,
    invited_by: input.invitedBy,
    email: normalizedEmail,
    role: input.role,
    token: buildInviteToken(),
    status: 'pending',
    expires_at: expiresAt,
  }

  const { data, error } = await supabase
    .from('team_invites')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const invite = data as TableRow<'team_invites'>

  return {
    invite,
    inviteUrl: buildInviteUrl(invite.token),
    isExisting: false,
  }
}

export async function acceptOrganizationInvite(
  supabase: AppSupabaseClient,
  userId: string,
  token: string,
) {
  await getProfileBundle(supabase, userId)

  const { error } = await supabase.rpc('accept_team_invite', {
    invite_token: token,
  })

  if (error) {
    throw mapOrganizationError(error)
  }

  const context = await getCurrentOrganizationContext(supabase, userId)

  if (!context) {
    throw new Error('Invite was accepted but no organization membership was found.')
  }

  return context
}

export async function updateOrganizationMemberRole(
  supabase: AppSupabaseClient,
  input: {
    memberId: string
    role: OrganizationRole
  },
) {
  const { data, error } = await supabase.rpc('update_organization_member_role', {
    target_member_id: input.memberId,
    next_role: input.role,
  })

  if (error) {
    throw mapOrganizationError(error)
  }

  return data
}

export async function updateOrganizationMemberStatus(
  supabase: AppSupabaseClient,
  input: {
    memberId: string
    status: OrganizationMemberStatus
  },
) {
  const { data, error } = await supabase.rpc('update_organization_member_status', {
    target_member_id: input.memberId,
    next_status: input.status,
  })

  if (error) {
    throw mapOrganizationError(error)
  }

  return data
}

export async function removeOrganizationMember(
  supabase: AppSupabaseClient,
  memberId: string,
) {
  const { data, error } = await supabase.rpc('remove_organization_member', {
    target_member_id: memberId,
  })

  if (error) {
    throw mapOrganizationError(error)
  }

  return data
}

export async function cancelOrganizationInvite(
  supabase: AppSupabaseClient,
  inviteId: string,
) {
  const { data, error } = await supabase.rpc('cancel_team_invite', {
    target_invite_id: inviteId,
  })

  if (error) {
    throw mapOrganizationError(error)
  }

  return data
}
