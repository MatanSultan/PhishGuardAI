export type SectionKey = 'overview' | 'organizations' | 'plans' | 'activity'
export type FilterKey = 'all' | 'attention' | 'free' | 'trial' | 'paid' | 'blocked'
export type FollowUpStatus = 'new' | 'contacted' | 'offered_discount' | 'upgraded'

export type OwnerOrg = {
  id: string
  name: string
  slug: string
  organization_type: string | null
  plan_type: string
  plan_status: string
  max_members_allowed: number
  trial_ends_at: string | null
  access_blocked: boolean
  billing_notes?: string | null
  created_at: string
  active_members: number
  total_members: number
  limit_reached?: boolean
  attempts_7d?: number
  attempts_30d?: number
  last_activity?: string | null
  pending_invites?: number
  likely_to_convert?: boolean
  follow_up_status?: FollowUpStatus
  owner_note?: string | null
}

export type FeedbackState =
  | {
      kind: 'success' | 'error'
      message: string
    }
  | null

export const sectionKeys = ['overview', 'organizations', 'plans', 'activity'] as const
export const filterKeys = ['all', 'attention', 'free', 'trial', 'paid', 'blocked'] as const
export const followUpKeys = ['new', 'contacted', 'offered_discount', 'upgraded'] as const
