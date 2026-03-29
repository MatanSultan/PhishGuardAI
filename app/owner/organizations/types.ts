export type SectionKey = 'overview' | 'organizations' | 'billing' | 'plans' | 'activity'
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

export type OwnerBillingSummary = {
  completedPayments: number
  pendingOrders: number
  failedPayments: number
  completedAmount: number
  currency: string
}

export type OwnerBillingOrderItem = {
  id: string
  organizationId: string
  organizationName: string
  amount: number
  currency: string
  status: string
  createdAt: string
  capturedAt: string | null
  payerEmail: string | null
  targetPlanType: string
  targetPlanStatus: string
  captureStatus: string | null
}

export type OwnerBillingEventItem = {
  id: string
  organizationId: string | null
  organizationName: string | null
  eventType: string
  source: string
  status: string | null
  summary: string
  createdAt: string
}

export type OwnerPlanChangeItem = {
  id: string
  organizationId: string
  organizationName: string
  previousPlanType: string
  previousPlanStatus: string
  nextPlanType: string
  nextPlanStatus: string
  source: string
  note: string | null
  createdAt: string
}

export type OwnerBillingPayload = {
  summary: OwnerBillingSummary
  recentOrders: OwnerBillingOrderItem[]
  recentEvents: OwnerBillingEventItem[]
  recentPlanChanges: OwnerPlanChangeItem[]
}

export const sectionKeys = ['overview', 'organizations', 'billing', 'plans', 'activity'] as const
export const filterKeys = ['all', 'attention', 'free', 'trial', 'paid', 'blocked'] as const
export const followUpKeys = ['new', 'contacted', 'offered_discount', 'upgraded'] as const
