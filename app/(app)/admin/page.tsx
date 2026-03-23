'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Copy,
  MailPlus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  UserMinus,
  Users,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useLocale } from '@/lib/locale-context'
import {
  getOrganizationSegmentLabel,
  getOrganizationSegmentProfile,
} from '@/lib/organizations/segments'
import {
  formatCategoryLabel,
  formatDifficultyLabel,
  formatRelativeTimestamp,
} from '@/lib/presentation'
import type {
  CompanyAttentionFlag,
  CompanyRecommendation,
  getOrganizationDashboardData,
} from '@/lib/company-analytics/service'
import type { TableRow as DbRow } from '@/lib/database.types'
import {
  formatInviteStatusLabel,
  formatOrganizationMemberStatusLabel,
  formatOrganizationRoleLabel,
  getCompanyCopy,
} from '@/lib/company-copy'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { OrganizationMemberRecord } from '@/lib/organizations/service'

type DashboardPayload = Awaited<ReturnType<typeof getOrganizationDashboardData>>

interface SimulationPreviewPayload {
  simulations: Array<{
    id: string
    title: string | null
    difficulty: 'easy' | 'medium' | 'hard'
    category: string
    created_at: string
  }>
}

interface MembersPayload {
  members: OrganizationMemberRecord[]
}

interface InvitesPayload {
  invites: DbRow<'team_invites'>[]
}

function getAttentionFlagCopy(
  flag: CompanyAttentionFlag,
  locale: 'en' | 'he',
  organizationType?: string | null,
) {
  const parts: string[] = []

  if (flag.reasons.includes('low_accuracy')) {
    parts.push(
      locale === 'he'
        ? `דיוק של ${flag.accuracyRate}%`
        : `${flag.accuracyRate}% accuracy`,
    )
  }

  if (flag.reasons.includes('inactive')) {
    parts.push(
      flag.daysSinceLastActivity === null
        ? locale === 'he'
          ? 'עדיין לא התחיל להתאמן'
          : 'has not started training yet'
        : locale === 'he'
          ? `לא התאמן ${flag.daysSinceLastActivity} ימים`
          : `inactive for ${flag.daysSinceLastActivity} days`,
    )
  }

  if (flag.reasons.includes('repeated_category_failure') && flag.repeatedCategory) {
    parts.push(
      locale === 'he'
        ? `כשל חוזר ב-${formatCategoryLabel(flag.repeatedCategory, locale, organizationType as never)}`
        : `repeated misses in ${formatCategoryLabel(flag.repeatedCategory, locale, organizationType as never)}`,
    )
  }

  return parts.join(locale === 'he' ? ' • ' : ' • ')
}

function getRecommendationCopy(
  recommendation: CompanyRecommendation,
  locale: 'en' | 'he',
  organizationType?: string | null,
) {
  if (recommendation.kind === 'focus_category') {
    return {
      title:
        locale === 'he'
          ? `תעדפו תרגול ב-${formatCategoryLabel(recommendation.category, locale, (recommendation.organizationType ?? organizationType) as never)}`
          : `Prioritize ${formatCategoryLabel(recommendation.category, locale, (recommendation.organizationType ?? organizationType) as never)} scenarios next`,
      reason:
        locale === 'he'
          ? `${recommendation.count ?? 0} עובדים סימנו את התחום הזה כאזור חלש.`
          : `${recommendation.count ?? 0} team members currently list this as a weak area.`,
    }
  }

  if (recommendation.kind === 'improve_safe_detection') {
    return {
      title:
        locale === 'he'
          ? 'שפרו זיהוי של הודעות לגיטימיות'
          : 'Improve recognition of legitimate messages',
      reason:
        locale === 'he'
          ? 'זיהוי הודעות תקינות נמוך מהיעד, מה שעשוי להעיד על חשדנות יתר.'
          : 'Safe-message detection is lower than expected, which may indicate over-cautious behavior.',
    }
  }

  if (recommendation.kind === 'increase_phishing_exposure') {
    return {
      title:
        locale === 'he'
          ? 'הגבירו חשיפה לתרחישי פישינג'
          : 'Increase exposure to phishing-heavy scenarios',
      reason:
        locale === 'he'
          ? 'זיהוי הפישינג של הצוות עדיין מתחת ליעד.'
          : 'Team phishing detection is still trailing the target threshold.',
    }
  }

  if (recommendation.kind === 'reengage_low_activity') {
    return {
      title:
        locale === 'he'
          ? 'החזירו עובדים עם מעורבות נמוכה'
          : 'Re-engage low-activity employees',
      reason:
        locale === 'he'
          ? `${recommendation.count ?? 0} עובדים לא התאמנו לאחרונה בשבועיים האחרונים.`
          : `${recommendation.count ?? 0} employees have no recent training activity in the last two weeks.`,
    }
  }

  return {
    title:
      locale === 'he'
        ? `השתמשו בתמהיל רלוונטי ל-${recommendation.industry}`
        : `Use a segment-relevant mix for ${getOrganizationSegmentLabel(recommendation.organizationType ?? organizationType, locale)}`,
    reason:
      locale === 'he'
        ? `תמהיל מומלץ: ${(recommendation.domains ?? [])
            .map((domain) => formatCategoryLabel(domain, locale, (recommendation.organizationType ?? organizationType) as never))
            .join(', ')}.`
        : `Recommended mix: ${(recommendation.domains ?? [])
            .map((domain) => formatCategoryLabel(domain, locale, (recommendation.organizationType ?? organizationType) as never))
            .join(', ')}.`,
  }
}

export default function AdminPage() {
  const { locale, dir } = useLocale()
  const companyCopy = getCompanyCopy(locale)
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [simulationData, setSimulationData] = useState<SimulationPreviewPayload | null>(null)
  const [members, setMembers] = useState<OrganizationMemberRecord[]>([])
  const [invites, setInvites] = useState<DbRow<'team_invites'>[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)
  const [invitesError, setInvitesError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresAdmin, setRequiresAdmin] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviteState, setInviteState] = useState<'idle' | 'submitting'>('idle')
  const [inviteResult, setInviteResult] = useState<string | null>(null)
  const [inviteFeedback, setInviteFeedback] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const [memberFeedback, setMemberFeedback] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const [memberActionKey, setMemberActionKey] = useState<string | null>(null)
  const [inviteActionKey, setInviteActionKey] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMemberRecord | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setRequiresAdmin(false)
      setMembersError(null)
      setInvitesError(null)

      try {
        const [dashboardResponse, simulationsResponse, membersResponse, invitesResponse] = await Promise.all([
          fetch('/api/organization/dashboard'),
          fetch('/api/admin/simulations'),
          fetch('/api/organization/members'),
          fetch('/api/organization/invites'),
        ])

        const dashboardPayload = await dashboardResponse.json().catch(() => null)
        const simulationsPayload = await simulationsResponse.json().catch(() => null)
        const membersPayload = await membersResponse.json().catch(() => null)
        const invitesPayload = await invitesResponse.json().catch(() => null)

        if (!active) {
          return
        }

        if (!dashboardResponse.ok) {
          if (dashboardResponse.status === 403) {
            setRequiresAdmin(true)
          }
          setError(dashboardPayload?.error ?? companyCopy.admin.loadError)
          setIsLoading(false)
          return
        }

        setData(dashboardPayload)
        setSimulationData(simulationsResponse.ok ? simulationsPayload : { simulations: [] })
        setMembers(membersResponse.ok ? ((membersPayload as MembersPayload | null)?.members ?? []) : [])
        setInvites(invitesResponse.ok ? ((invitesPayload as InvitesPayload | null)?.invites ?? []) : [])
        if (!membersResponse.ok) {
          setMembersError(membersPayload?.error ?? companyCopy.admin.membersLoadError)
        }
        if (!invitesResponse.ok) {
          setInvitesError(invitesPayload?.error ?? companyCopy.admin.inviteCancelError)
        }
        setIsLoading(false)
      } catch {
        if (!active) {
          return
        }

        setError(companyCopy.admin.loadError)
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [
    companyCopy.admin.inviteCancelError,
    companyCopy.admin.loadError,
    companyCopy.admin.membersLoadError,
    refreshKey,
  ])

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviteState('submitting')
    setInviteResult(null)
    setInviteFeedback(null)
    setInvitesError(null)

    try {
      const response = await fetch('/api/organization/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const payload = await response.json().catch(() => null)
      setInviteState('idle')

      if (!response.ok) {
        setInviteFeedback({
          kind: 'error',
          message: payload?.error ?? (locale === 'he' ? 'לא הצלחנו ליצור הזמנה.' : 'We could not create the invite.'),
        })
        return
      }

      setInviteEmail('')
      setInviteResult(payload.inviteUrl)
      setInviteFeedback({
        kind: 'success',
        message:
          payload.isExisting
            ? locale === 'he'
              ? 'כבר קיימת הזמנה ממתינה לכתובת הזו. הקישור הקיים נטען מחדש.'
              : 'A pending invite already exists for this email. The existing link was loaded again.'
            : companyCopy.admin.inviteCreated,
      })
      setData((current) =>
        current
          ? {
              ...current,
              pendingInvites: payload.invite
                ? [payload.invite, ...current.pendingInvites.filter((invite) => invite.id !== payload.invite.id)].slice(0, 5)
                : current.pendingInvites,
            }
          : current,
      )
      setInvites((current) =>
        payload.invite
          ? [payload.invite, ...current.filter((invite) => invite.id !== payload.invite.id)]
          : current,
      )
    } catch {
      setInviteState('idle')
      setInviteFeedback({
        kind: 'error',
        message: locale === 'he' ? 'לא הצלחנו ליצור הזמנה.' : 'We could not create the invite.',
      })
    }
  }

  const copyInviteLink = async () => {
    if (!inviteResult) {
      return
    }

    try {
      await navigator.clipboard.writeText(inviteResult)
      setInviteFeedback({
        kind: 'success',
        message: companyCopy.admin.copiedLink,
      })
    } catch {
      setInviteFeedback({
        kind: 'error',
        message: companyCopy.admin.copyFailed,
      })
    }
  }

  const handleRoleChange = async (member: OrganizationMemberRecord, role: 'member' | 'admin') => {
    setMemberActionKey(`role:${member.membership.id}`)
    setMemberFeedback(null)

    try {
      const response = await fetch(`/api/organization/members/${member.membership.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })

      const payload = await response.json().catch(() => null)
      setMemberActionKey(null)

      if (!response.ok) {
        setMemberFeedback({
          kind: 'error',
          message: payload?.error ?? companyCopy.admin.roleUpdateError,
        })
        return
      }

      setMemberFeedback({
        kind: 'success',
        message: companyCopy.admin.roleUpdated,
      })
      setRefreshKey((current) => current + 1)
    } catch {
      setMemberActionKey(null)
      setMemberFeedback({
        kind: 'error',
        message: companyCopy.admin.roleUpdateError,
      })
    }
  }

  const handleStatusChange = async (
    member: OrganizationMemberRecord,
    status: 'active' | 'suspended',
  ) => {
    setMemberActionKey(`status:${member.membership.id}`)
    setMemberFeedback(null)

    try {
      const response = await fetch(`/api/organization/members/${member.membership.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const payload = await response.json().catch(() => null)
      setMemberActionKey(null)

      if (!response.ok) {
        setMemberFeedback({
          kind: 'error',
          message: payload?.error ?? companyCopy.admin.memberStatusUpdateError,
        })
        return
      }

      setMemberFeedback({
        kind: 'success',
        message: companyCopy.admin.memberStatusUpdated,
      })
      setRefreshKey((current) => current + 1)
    } catch {
      setMemberActionKey(null)
      setMemberFeedback({
        kind: 'error',
        message: companyCopy.admin.memberStatusUpdateError,
      })
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    setInviteActionKey(inviteId)
    setInviteFeedback(null)
    setInvitesError(null)

    try {
      const response = await fetch(`/api/organization/invites/${inviteId}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)
      setInviteActionKey(null)

      if (!response.ok) {
        setInviteFeedback({
          kind: 'error',
          message: payload?.error ?? companyCopy.admin.inviteCancelError,
        })
        return
      }

      setInviteFeedback({
        kind: 'success',
        message: companyCopy.admin.inviteCanceled,
      })
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId
            ? {
                ...invite,
                status: 'canceled',
              }
            : invite,
        ),
      )
      setData((current) =>
        current
          ? {
              ...current,
              pendingInvites: current.pendingInvites.filter((invite) => invite.id !== inviteId),
            }
          : current,
      )
    } catch {
      setInviteActionKey(null)
      setInviteFeedback({
        kind: 'error',
        message: companyCopy.admin.inviteCancelError,
      })
    }
  }

  const confirmRemoveMember = async () => {
    if (!memberToRemove) {
      return
    }

    setMemberActionKey(`remove:${memberToRemove.membership.id}`)
    setMemberFeedback(null)

    try {
      const response = await fetch(`/api/organization/members/${memberToRemove.membership.id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)
      setMemberActionKey(null)

      if (!response.ok) {
        setMemberFeedback({
          kind: 'error',
          message: payload?.error ?? companyCopy.admin.memberRemoveError,
        })
        return
      }

      setMemberToRemove(null)
      setMemberFeedback({
        kind: 'success',
        message: companyCopy.admin.memberRemoved,
      })
      setRefreshKey((current) => current + 1)
    } catch {
      setMemberActionKey(null)
      setMemberFeedback({
        kind: 'error',
        message: companyCopy.admin.memberRemoveError,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (requiresAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.admin.accessTitle}</CardTitle>
            <CardDescription>{companyCopy.admin.accessDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>{companyCopy.common.backToDashboard}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()}>
              {companyCopy.common.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const singleAdminTeam = data.overview.totalEmployees <= 1
  const hasTrendData = data.teamProgressTrend.length > 0
  const hasRecommendations = data.companyRecommendations.length > 0
  const hasWeakCategories = data.weakestCategories.length > 0
  const hasStrongCategories = data.strongestCategories.length > 0
  const hasRecentActivity = data.recentActivity.length > 0
  const hasAttentionFlags = data.attentionFlags.length > 0
  const simulationPreview = simulationData?.simulations.slice(0, 5) ?? []
  const adminCount = members.filter(
    (member) => member.membership.role === 'admin' && member.membership.status === 'active',
  ).length
  const organizationProfile = getOrganizationSegmentProfile(
    data.organization.organization_type,
    data.organization.industry,
    locale,
  )

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{data.organization.name}</span>
            <span>• {getOrganizationSegmentLabel(data.organization.organization_type, locale)}</span>
            {data.organization.industry ? <span>• {data.organization.industry}</span> : null}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {companyCopy.admin.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{companyCopy.admin.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/reports">
            <Button variant="outline">
              <Activity className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {companyCopy.admin.teamReports}
            </Button>
          </Link>
          {data.settings?.allow_leaderboard ? (
            <Link href="/leaderboard">
              <Button variant="outline">
                <Trophy className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {companyCopy.admin.leaderboard}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {singleAdminTeam ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {companyCopy.admin.nextStepTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{companyCopy.admin.nextStepDescription}</p>
            </div>
            <Link href="#invite-members">
              <Button>
                <MailPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {companyCopy.admin.inviteTeam}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'מוקד הסיכון לארגון הזה' : 'What matters for this segment'}</CardTitle>
          <CardDescription>{organizationProfile.adminHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {organizationProfile.focusTopics.slice(0, 3).map((topic) => (
            <div key={topic} className="rounded-lg border border-border p-3 text-sm">
              {topic}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {companyCopy.admin.totalEmployees}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.overview.totalEmployees}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {companyCopy.admin.activeEmployees}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.overview.activeEmployees}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {companyCopy.admin.completedSimulations}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.overview.totalSimulationsCompleted}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {companyCopy.admin.phishingDetection}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.overview.phishingDetectionRate}%</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {companyCopy.admin.safeDetection}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{data.overview.safeDetectionRate}%</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {companyCopy.admin.aiSummaryTitle}
          </CardTitle>
          <CardDescription>{companyCopy.admin.aiSummaryDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm leading-7 text-foreground">{data.aiSummary.summary}</p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {companyCopy.admin.aiSummarySignals}
            </h3>
            <div className="space-y-3">
              {data.aiSummary.riskSignals.length ? (
                data.aiSummary.riskSignals.map((signal, index) => (
                  <div key={index} className="rounded-lg border border-border p-3 text-sm">
                    {signal}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{companyCopy.admin.noRecommendations}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {companyCopy.admin.aiSummaryActions}
            </h3>
            <div className="space-y-3">
              {data.aiSummary.actions.map((action, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  {action}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {companyCopy.admin.attentionFlagsTitle}
          </CardTitle>
          <CardDescription>{companyCopy.admin.attentionFlagsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasAttentionFlags ? (
            data.attentionFlags.map((flag) => (
              <div
                key={flag.userId}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{flag.fullName}</p>
                    <Badge variant="secondary">
                      {formatOrganizationRoleLabel(flag.role, locale)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{flag.email}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {getAttentionFlagCopy(flag, locale, data.organization.organization_type)}
                  </p>
                </div>
                <div className="text-sm font-medium">
                  {flag.totalAttempts} {locale === 'he' ? 'ניסיונות' : 'attempts'}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{companyCopy.admin.noAttentionFlags}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card id="invite-members">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="h-5 w-5 text-primary" />
              {companyCopy.admin.inviteTitle}
            </CardTitle>
            <CardDescription>{companyCopy.admin.inviteDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{companyCopy.admin.employeeEmail}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="employee@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{companyCopy.admin.role}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={inviteRole === 'member' ? 'default' : 'outline'}
                    onClick={() => setInviteRole('member')}
                  >
                    {formatOrganizationRoleLabel('member', locale)}
                  </Button>
                  <Button
                    type="button"
                    variant={inviteRole === 'admin' ? 'default' : 'outline'}
                    onClick={() => setInviteRole('admin')}
                  >
                    {formatOrganizationRoleLabel('admin', locale)}
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={inviteState === 'submitting'} className="w-full">
                {inviteState === 'submitting' ? companyCopy.admin.creatingInvite : companyCopy.admin.createInvite}
              </Button>
            </form>

            {inviteFeedback ? (
              <Alert className="mt-4" variant={inviteFeedback.kind === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{inviteFeedback.message}</AlertDescription>
              </Alert>
            ) : null}

            {inviteResult ? (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="mb-2 font-medium">{companyCopy.admin.inviteReady}</p>
                <p className="break-all text-muted-foreground">{inviteResult}</p>
                <Button variant="outline" className="mt-3" onClick={() => void copyInviteLink()}>
                  <Copy className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {companyCopy.admin.copyLink}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {companyCopy.admin.teamProgressTrend}
            </CardTitle>
            <CardDescription>{companyCopy.admin.teamProgressDescription}</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.teamProgressTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {companyCopy.admin.noTrend}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {companyCopy.admin.membersTitle}
          </CardTitle>
          <CardDescription>{companyCopy.admin.membersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {memberFeedback ? (
            <Alert variant={memberFeedback.kind === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{memberFeedback.message}</AlertDescription>
            </Alert>
          ) : null}

          {membersError ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {membersError}
            </div>
          ) : members.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'he' ? 'עובד' : 'Employee'}</TableHead>
                  <TableHead>{companyCopy.admin.role}</TableHead>
                  <TableHead>{companyCopy.admin.memberStatus}</TableHead>
                  <TableHead>{locale === 'he' ? 'ציון' : 'Score'}</TableHead>
                  <TableHead>{locale === 'he' ? 'ניסיונות' : 'Attempts'}</TableHead>
                  <TableHead>{locale === 'he' ? 'פעולות' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentAdmin = member.membership.user_id === data.membership.user_id
                  const isLastAdmin =
                    member.membership.role === 'admin' &&
                    member.membership.status === 'active' &&
                    adminCount <= 1
                  const isRoleActionInProgress = memberActionKey === `role:${member.membership.id}`
                  const isStatusActionInProgress = memberActionKey === `status:${member.membership.id}`
                  const isRemoveActionInProgress = memberActionKey === `remove:${member.membership.id}`
                  const isSuspended = member.membership.status === 'suspended'

                  return (
                    <TableRow key={member.membership.id}>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.profile?.full_name?.trim() || member.profile?.email || 'Team member'}
                            </p>
                            {isCurrentAdmin ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {companyCopy.admin.currentAdminTag}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{member.profile?.email ?? ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatOrganizationRoleLabel(member.membership.role, locale)}</TableCell>
                      <TableCell>
                        <Badge variant={isSuspended ? 'outline' : 'secondary'}>
                          {formatOrganizationMemberStatusLabel(member.membership.status, locale)}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.trainingProfile?.total_score ?? 0}</TableCell>
                      <TableCell>{member.trainingProfile?.total_attempts ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              isCurrentAdmin ||
                              isRoleActionInProgress ||
                              isStatusActionInProgress ||
                              isSuspended ||
                              member.membership.role === 'admin'
                            }
                            onClick={() => void handleRoleChange(member, 'admin')}
                          >
                            {isRoleActionInProgress
                              ? companyCopy.admin.actionInProgress
                              : companyCopy.admin.promoteToAdmin}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              isCurrentAdmin ||
                              isRoleActionInProgress ||
                              isStatusActionInProgress ||
                              isSuspended ||
                              member.membership.role === 'member' ||
                              isLastAdmin
                            }
                            onClick={() => void handleRoleChange(member, 'member')}
                          >
                            {isRoleActionInProgress
                              ? companyCopy.admin.actionInProgress
                              : companyCopy.admin.makeEmployee}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isCurrentAdmin || isStatusActionInProgress || isLastAdmin}
                            onClick={() =>
                              void handleStatusChange(member, isSuspended ? 'active' : 'suspended')
                            }
                          >
                            {isStatusActionInProgress
                              ? companyCopy.admin.actionInProgress
                              : isSuspended
                                ? companyCopy.admin.reactivateMember
                                : companyCopy.admin.suspendMember}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isCurrentAdmin || isRemoveActionInProgress || isLastAdmin}
                            onClick={() => setMemberToRemove(member)}
                          >
                            <UserMinus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                            {isRemoveActionInProgress
                              ? companyCopy.admin.actionInProgress
                              : companyCopy.admin.removeMember}
                          </Button>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {isCurrentAdmin ? <p>{companyCopy.admin.selfRoleGuard}</p> : null}
                          {isCurrentAdmin ? <p>{companyCopy.admin.selfStatusGuard}</p> : null}
                          {isLastAdmin ? <p>{companyCopy.admin.lastAdminGuard}</p> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {companyCopy.admin.noMembers}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {companyCopy.admin.leaderboardPreview}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.leaderboardPreview.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === 'he' ? 'מקום' : 'Rank'}</TableHead>
                    <TableHead>{locale === 'he' ? 'עובד' : 'Employee'}</TableHead>
                    <TableHead>{locale === 'he' ? 'ציון' : 'Score'}</TableHead>
                    <TableHead>{locale === 'he' ? 'דיוק' : 'Accuracy'}</TableHead>
                    <TableHead>{locale === 'he' ? 'רצף' : 'Streak'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leaderboardPreview.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell>#{member.rank}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.fullName}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{member.totalScore}</TableCell>
                      <TableCell>{member.accuracyRate}%</TableCell>
                      <TableCell>{member.streakCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {companyCopy.leaderboard.noRows}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {companyCopy.admin.teamRecommendations}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasRecommendations ? (
              data.companyRecommendations.map((recommendation, index) => {
                const copy = getRecommendationCopy(
                  recommendation,
                  locale,
                  data.organization.organization_type,
                )

                return (
                  <div key={index} className="rounded-lg border border-border p-4">
                    <p className="font-medium">{copy.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.reason}</p>
                  </div>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {companyCopy.admin.noRecommendations}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              {companyCopy.admin.topWeakCategories}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasWeakCategories ? (
              data.weakestCategories.map((item) => (
                <div key={item.category} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span>{formatCategoryLabel(item.category, locale, data.organization.organization_type)}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.admin.noWeakCategories}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-success" />
              {companyCopy.admin.topStrongCategories}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasStrongCategories ? (
              data.strongestCategories.map((item) => (
                <div key={item.category} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span>{formatCategoryLabel(item.category, locale, data.organization.organization_type)}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.admin.noStrongCategories}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.admin.invitesTitle}</CardTitle>
            <CardDescription>{companyCopy.admin.invitesDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invitesError ? (
              <p className="text-sm text-muted-foreground">{invitesError}</p>
            ) : invites.length ? (
              invites.slice(0, 8).map((invite) => {
                const isPending = invite.status === 'pending'
                const isActionInProgress = inviteActionKey === invite.id

                return (
                  <div key={invite.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{invite.email}</p>
                      <Badge variant={isPending ? 'secondary' : 'outline'}>
                        {formatInviteStatusLabel(invite.status, locale)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {formatOrganizationRoleLabel(invite.role, locale)}
                    </p>
                    <p className="text-muted-foreground">
                      {formatRelativeTimestamp(invite.created_at, locale)}
                    </p>
                    {invite.expires_at ? (
                      <p className="text-muted-foreground">
                        {locale === 'he'
                          ? `פג תוקף ${formatRelativeTimestamp(invite.expires_at, locale)}`
                          : `Expires ${formatRelativeTimestamp(invite.expires_at, locale)}`}
                      </p>
                    ) : null}
                    {isPending ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={isActionInProgress}
                        onClick={() => void handleCancelInvite(invite.id)}
                      >
                        {isActionInProgress
                          ? companyCopy.admin.actionInProgress
                          : companyCopy.admin.cancelInvite}
                      </Button>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.admin.noInvites}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{companyCopy.admin.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasRecentActivity ? (
              data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{activity.employeeName}</p>
                    <p className="truncate text-sm text-muted-foreground">{activity.title}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatRelativeTimestamp(activity.createdAt, locale)}</p>
                    <p>{activity.isCorrect ? (locale === 'he' ? 'נכון' : 'Correct') : locale === 'he' ? 'שגוי' : 'Incorrect'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.admin.noRecentActivity}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.admin.simulationLibrary}</CardTitle>
            <CardDescription>{companyCopy.admin.simulationLibraryDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {simulationPreview.length ? (
              simulationPreview.map((simulation) => (
                <div key={simulation.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    {simulation.title || formatCategoryLabel(simulation.category, locale, data.organization.organization_type)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatDifficultyLabel(simulation.difficulty, locale)} • {formatCategoryLabel(simulation.category, locale, data.organization.organization_type)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.admin.noSimulations}</p>
            )}
            <Link href="/training">
              <Button variant="outline" className="w-full">
                {companyCopy.admin.openTraining}
                <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(memberToRemove)} onOpenChange={(open) => (!open ? setMemberToRemove(null) : null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{companyCopy.admin.removeConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {companyCopy.admin.removeConfirmDescription}
              {memberToRemove?.profile?.email ? ` ${memberToRemove.profile.email}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{companyCopy.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmRemoveMember()}>
              {companyCopy.admin.removeMember}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
