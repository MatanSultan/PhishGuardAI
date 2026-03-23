import { z } from 'zod'

import {
  CHANNELS,
  ORGANIZATION_TYPES,
  ORGANIZATION_MEMBER_STATUSES,
  ORGANIZATION_ROLES,
  SIMULATION_CATEGORIES,
} from '@/lib/constants'

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organizationType: z.enum(ORGANIZATION_TYPES).default('other'),
  industry: z.string().trim().max(120).optional().or(z.literal('')),
})

export const inviteMemberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(ORGANIZATION_ROLES).default('member'),
  expiresInDays: z.number().int().min(1).max(30).default(7).optional(),
})

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(16).max(255),
})

export const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const organizationMemberParamsSchema = z.object({
  memberId: z.string().uuid(),
})

export const updateOrganizationMemberRoleSchema = z.object({
  role: z.enum(ORGANIZATION_ROLES),
})

export const updateOrganizationMemberStatusSchema = z.object({
  status: z.enum(ORGANIZATION_MEMBER_STATUSES),
})

export const updateOrganizationMemberSchema = z
  .object({
    role: z.enum(ORGANIZATION_ROLES).optional(),
    status: z.enum(ORGANIZATION_MEMBER_STATUSES).optional(),
  })
  .refine((value) => Number(Boolean(value.role)) + Number(Boolean(value.status)) === 1, {
    message: 'Exactly one organization member update action is required.',
  })

export const organizationInviteParamsSchema = z.object({
  inviteId: z.string().uuid(),
})

export const organizationReportsQuerySchema = z.object({
  category: z.preprocess(
    emptyStringToUndefined,
    z.enum(SIMULATION_CATEGORIES).optional(),
  ),
  channel: z.preprocess(emptyStringToUndefined, z.enum(CHANNELS).optional()),
  employeeId: z.preprocess(
    emptyStringToUndefined,
    z.string().uuid().optional(),
  ),
  dateFrom: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
  dateTo: z.preprocess(
    emptyStringToUndefined,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ),
})
