import { randomBytes } from 'crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  APP_ROUTES,
  DEFAULT_FREE_MAX_MEMBERS,
  DEFAULT_PLAN_STATUS,
  DEFAULT_PLAN_TYPE,
  type OrganizationMemberStatus,
  type OrganizationRole,
  type OrganizationType,
  type PlanStatus,
  type PlanType,
} from '@/lib/constants'
import type { Database, TableInsert, TableRow } from '@/lib/database.types'
import { getAppUrl } from '@/lib/env'
import { applyOrganizationStarterDomains } from '@/lib/organizations/defaults'
import { getProfileBundle } from '@/lib/profile/service'

type AppSupabaseClient = SupabaseClient<Database>

export class OrganizationServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'OrganizationServiceError'
    this.statusCode = statusCode
  }

  static upgradeRequired(message: string) {
    return new OrganizationServiceError(message, 402)
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
  const base = input
    .trim()
    .toLowerCase()
    // allow any letter/number from any script; collapse the rest to hyphens
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  if (base) {
    return base
  }

  // Fallback for names written entirely in non-Latin characters (e.g., Hebrew)
  return `org-${randomBytes(2).toString('hex')}`
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

  if (message.includes('Organization member limit reached')) {
    return OrganizationServiceError.upgradeRequired(
      'Your current plan limit was reached. Upgrade to add more team members.',
    )
  }

  if (message.includes('Organization access is blocked')) {
    return new OrganizationServiceError('Organization access is blocked. Contact support.', 403)
  }

  if (message.includes('Organization is past due')) {
    return OrganizationServiceError.upgradeRequired(
      'Billing is past due. Contact support to continue.',
    )
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

interface OrganizationPlanState {
  planType: PlanType
  planStatus: PlanStatus
  maxMembersAllowed: number
  accessBlocked: boolean
  activeMemberCount: number
}

async function getOrganizationPlanState(
  supabase: AppSupabaseClient,
  organizationId: string,
): Promise<OrganizationPlanState> {
  const [organizationResult, memberCountResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('plan_type, plan_status, max_members_allowed, access_blocked')
      .eq('id', organizationId)
      .single(),
    supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ])

  if (organizationResult.error) {
    throw organizationResult.error
  }

  if (memberCountResult.error) {
    throw memberCountResult.error
  }

  const org = organizationResult.data!
  const activeMemberCount = memberCountResult.count ?? 0

  return {
    planType: (org.plan_type as PlanType) ?? DEFAULT_PLAN_TYPE,
    planStatus: (org.plan_status as PlanStatus) ?? DEFAULT_PLAN_STATUS,
    maxMembersAllowed: org.max_members_allowed ?? DEFAULT_FREE_MAX_MEMBERS,
    accessBlocked: org.access_blocked ?? false,
    activeMemberCount,
  }
}

function assertOrganizationCanAddMembers(plan: OrganizationPlanState) {
  if (plan.accessBlocked || plan.planStatus === 'blocked') {
    throw new OrganizationServiceError('Organization access is blocked. Contact support.', 403)
  }

  if (plan.planStatus === 'past_due') {
    throw OrganizationServiceError.upgradeRequired('Billing is past due. Please contact support.')
  }

  if (plan.maxMembersAllowed && plan.activeMemberCount >= plan.maxMembersAllowed) {
    throw OrganizationServiceError.upgradeRequired(
      plan.maxMembersAllowed <= 1
        ? 'Your current plan allows only one active member. Upgrade to invite employees.'
        : `Your current plan limit is ${plan.maxMembersAllowed} active members. Upgrade to add more.`,
    )
  }
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
    organizationType: OrganizationType
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
      org_type: input.organizationType,
    })

    if (!error) {
      const context = await getCurrentOrganizationContext(supabase, userId)

      if (!context) {
        throw new Error('Organization was created but could not be loaded.')
      }

      await applyOrganizationStarterDomains(
        supabase,
        userId,
        context.organization.organization_type,
        context.organization.industry,
      )

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

  const plan = await getOrganizationPlanState(supabase, input.organizationId)
  assertOrganizationCanAddMembers(plan)

  const existingMembers = await listOrganizationMembers(supabase, input.organizationId)
  const existingMember = existingMembers.find(
    (member) => normalizeInviteEmail(member.profile?.email ?? '') === normalizedEmail,
  )

  if (existingMember) {
    throw new OrganizationServiceError('That user is already a member of this organization.', 409)
  }

  const { data: existingInvites, error: existingInviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('organization_id', input.organizationId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  if (existingInviteError) {
    throw existingInviteError
  }

  const now = Date.now()
  const validExistingInvite = (existingInvites ?? []).find((invite) => {
    if (!invite.expires_at) {
      return true
    }

    return new Date(invite.expires_at).getTime() > now
  }) as TableRow<'team_invites'> | undefined

  if (validExistingInvite) {
    return {
      invite: validExistingInvite,
      inviteUrl: buildInviteUrl(validExistingInvite.token),
      isExisting: true,
    }
  }

  const expiredInviteIds = (existingInvites ?? [])
    .filter((invite) => invite.expires_at && new Date(invite.expires_at).getTime() <= now)
    .map((invite) => invite.id)

  if (expiredInviteIds.length) {
    await supabase.from('team_invites').update({ status: 'expired' }).in('id', expiredInviteIds)
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
  userEmail: string | null,
  token: string,
) {
  await getProfileBundle(supabase, userId)

  const { data: existingMembership, error: membershipError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (existingMembership?.id) {
    throw new OrganizationServiceError('Your account already belongs to an organization.', 409)
  }

  const { data: inviteLookup, error: inviteLookupError } = await supabase
    .from('team_invites')
    .select('status, expires_at, email')
    .eq('token', token)
    .maybeSingle()

  if (!inviteLookupError && inviteLookup) {
    const expiresAt = inviteLookup.expires_at ? new Date(inviteLookup.expires_at).getTime() : null
    const expiredByTime = expiresAt !== null && expiresAt <= Date.now()

    if (inviteLookup.status === 'canceled') {
      throw new OrganizationServiceError('This invite was canceled.', 410)
    }

    if (inviteLookup.status === 'accepted') {
      throw new OrganizationServiceError('This invite has already been used.', 410)
    }

    if (inviteLookup.status === 'expired' || expiredByTime) {
      throw new OrganizationServiceError('This invite has expired.', 410)
    }

    if (inviteLookup.email && userEmail) {
      const invited = inviteLookup.email.trim().toLowerCase()
      const current = userEmail.trim().toLowerCase()
      if (invited !== current) {
        throw new OrganizationServiceError(
          `This invite was sent to ${inviteLookup.email}. You are signed in as ${userEmail}. Sign in with the invited email or ask the admin to send a new invite.\nההזמנה נשלחה ל-${inviteLookup.email}. אתה/את מחובר/ת כ-${userEmail}. התחבר/י עם המייל שהוזמן או בקש/י מהמנהל לשלוח הזמנה חדשה.`,
          403,
        )
      }
    }
  }

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

  await applyOrganizationStarterDomains(
    supabase,
    userId,
    context.organization.organization_type,
    context.organization.industry,
  )

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
