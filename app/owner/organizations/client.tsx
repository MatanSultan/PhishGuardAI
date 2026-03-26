'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getDirection } from '@/lib/i18n'
import { useLocale } from '@/lib/locale-context'
import { cn } from '@/lib/utils'

import { ownerConsoleCopy } from './copy'
import {
  InfoField,
  MetricCard,
  OwnerConsoleSkeleton,
  PanelEmptyState,
  PlanMixRow,
  PriorityRow,
  SimpleInfoRow,
  SummaryBadge,
} from './panels'
import {
  filterKeys,
  followUpKeys,
  type FeedbackState,
  type FilterKey,
  type FollowUpStatus,
  type OwnerOrg,
  type SectionKey,
  sectionKeys,
} from './types'

function getTimestamp(value?: string | null) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getPriorityScore(org: OwnerOrg) {
  let score = 0
  if (org.access_blocked || org.plan_status === 'blocked') score += 100
  if (org.likely_to_convert) score += 60
  if (org.limit_reached) score += 40
  score += Math.min(org.attempts_7d ?? 0, 15)
  return score
}

export default function OwnerOrganizationsClient() {
  const { locale } = useLocale()
  const activeLocale = locale === 'he' ? 'he' : 'en'
  const t = ownerConsoleCopy[activeLocale]
  const isRtl = getDirection(activeLocale) === 'rtl'

  const [organizations, setOrganizations] = useState<OwnerOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [section, setSection] = useState<SectionKey>('overview')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [billingDrafts, setBillingDrafts] = useState<Record<string, string>>({})
  const [limitDrafts, setLimitDrafts] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/owner/organizations', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({
          kind: 'error',
          message: payload?.error ?? t.messages.loadError,
        })
        setOrganizations([])
        setLoading(false)
        return
      }

      const nextOrganizations = (payload?.organizations ?? []) as OwnerOrg[]
      setOrganizations(nextOrganizations)
      setSelectedOrgId((current) =>
        current && nextOrganizations.some((org) => org.id === current)
          ? current
          : nextOrganizations[0]?.id ?? null,
      )
      setLoading(false)
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : t.messages.loadError,
      })
      setOrganizations([])
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(
    () => ({
      total: organizations.length,
      attention: organizations.filter((org) => org.likely_to_convert).length,
      blocked: organizations.filter((org) => org.plan_status === 'blocked' || org.access_blocked).length,
      active: organizations.filter((org) => (org.attempts_7d ?? 0) > 0).length,
      free: organizations.filter((org) => org.plan_status === 'free').length,
      trial: organizations.filter((org) => org.plan_status === 'trial').length,
      paid: organizations.filter((org) => org.plan_status === 'active_paid').length,
      pendingInvites: organizations.reduce((total, org) => total + (org.pending_invites ?? 0), 0),
    }),
    [organizations],
  )

  const recentOrganizations = useMemo(
    () => [...organizations].sort((a, b) => getTimestamp(b.created_at) - getTimestamp(a.created_at)).slice(0, 5),
    [organizations],
  )

  const priorityOrganizations = useMemo(
    () =>
      [...organizations]
        .filter((org) => org.likely_to_convert || org.access_blocked || org.limit_reached)
        .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
        .slice(0, 6),
    [organizations],
  )

  const activeOrganizations = useMemo(
    () =>
      [...organizations]
        .filter((org) => Boolean(org.last_activity))
        .sort((a, b) => getTimestamp(b.last_activity) - getTimestamp(a.last_activity))
        .slice(0, 6),
    [organizations],
  )

  const quietOrganizations = useMemo(
    () =>
      [...organizations]
        .filter((org) => (org.attempts_30d ?? 0) === 0)
        .sort((a, b) => getTimestamp(b.created_at) - getTimestamp(a.created_at))
        .slice(0, 6),
    [organizations],
  )

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return organizations.filter((org) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'attention'
            ? Boolean(org.likely_to_convert || org.limit_reached || org.access_blocked)
            : filter === 'blocked'
              ? Boolean(org.plan_status === 'blocked' || org.access_blocked)
              : filter === 'paid'
                ? org.plan_status === 'active_paid'
                : org.plan_status === filter

      if (!matchesFilter) return false
      if (!query) return true

      return [org.name, org.slug, org.organization_type ?? '', org.plan_status, org.plan_type]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [filter, organizations, search])

  useEffect(() => {
    if (!filteredOrganizations.length) return

    if (!selectedOrgId || !filteredOrganizations.some((org) => org.id === selectedOrgId)) {
      setSelectedOrgId(filteredOrganizations[0].id)
    }
  }, [filteredOrganizations, selectedOrgId])

  const selectedOrganization = useMemo(() => {
    if (!organizations.length) return null
    return organizations.find((org) => org.id === selectedOrgId) ?? organizations[0]
  }, [organizations, selectedOrgId])

  const setSectionAndOrg = (nextSection: SectionKey, organizationId: string) => {
    setSelectedOrgId(organizationId)
    setSection(nextSection)
  }

  const patchOrganization = async (id: string, body: Record<string, unknown>, successMessage?: string) => {
    setSavingId(id)

    try {
      const response = await fetch(`/api/owner/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setFeedback({
          kind: 'error',
          message: payload?.error ?? t.messages.updateError,
        })
        return
      }

      const updated = (payload?.organization as OwnerOrg | undefined) ?? null

      if (updated) {
        setOrganizations((current) =>
          current.map((org) =>
            org.id === id
              ? {
                  ...org,
                  ...updated,
                  limit_reached: (updated.active_members ?? 0) >= (updated.max_members_allowed ?? 1),
                }
              : org,
          ),
        )
        setNoteDrafts((current) => ({ ...current, [id]: updated.owner_note ?? '' }))
        setBillingDrafts((current) => ({ ...current, [id]: updated.billing_notes ?? '' }))
        setLimitDrafts((current) => ({ ...current, [id]: String(updated.max_members_allowed ?? 1) }))
      }

      setFeedback({ kind: 'success', message: successMessage ?? t.messages.updated })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : t.messages.updateError,
      })
    } finally {
      setSavingId(null)
    }
  }

  const handleLimitSave = (organization: OwnerOrg) => {
    const nextValue = Number(limitDrafts[organization.id] ?? organization.max_members_allowed ?? 1)

    if (!Number.isFinite(nextValue) || nextValue < 1) {
      setFeedback({ kind: 'error', message: t.messages.invalidLimit })
      return
    }

    void patchOrganization(organization.id, { max_members_allowed: Math.round(nextValue) })
  }

  const formatStatus = (status: string) => t.statuses[status as keyof typeof t.statuses] ?? status
  const formatPlanType = (planType: string) => t.planTypes[planType as keyof typeof t.planTypes] ?? planType
  const formatSegment = (segment: string | null) =>
    segment ? t.segments[segment as keyof typeof t.segments] ?? t.segments.other : t.segments.other

  const formatDate = (value?: string | null) => {
    if (!value) return t.common.noDate
    return new Date(value).toLocaleDateString(activeLocale === 'he' ? 'he-IL' : 'en-US')
  }

  const renderSignals = (organization: OwnerOrg) => {
    const signals: string[] = []
    if (organization.access_blocked || organization.plan_status === 'blocked') signals.push(t.alerts.blocked)
    if (organization.limit_reached) signals.push(t.alerts.atLimit)
    if (organization.likely_to_convert) signals.push(t.alerts.likely)
    if ((organization.attempts_30d ?? 0) === 0) signals.push(t.alerts.inactive)
    return signals
  }

  if (loading) {
    return <OwnerConsoleSkeleton />
  }

  if (!organizations.length) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8">
        <PanelEmptyState title={t.organizations.title} description={t.overview.recentEmpty} />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8">
      <header className="rounded-3xl border border-border/60 bg-gradient-to-b from-background to-muted/30 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary/80">{t.eyebrow}</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryBadge label={t.badges.total} value={stats.total} />
              <SummaryBadge label={t.badges.attention} value={stats.attention} tone="warning" />
              <SummaryBadge label={t.badges.blocked} value={stats.blocked} tone="danger" />
              <SummaryBadge label={t.badges.active} value={stats.active} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSection('activity')}>
              <Sparkles className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t.primaryAction}
            </Button>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t.refresh}
            </Button>
          </div>
        </div>
      </header>

      {feedback ? (
        <div
          className={cn(
            'rounded-2xl border p-4 text-sm shadow-sm',
            feedback.kind === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      <Tabs value={section} onValueChange={(value) => setSection(value as SectionKey)} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1 md:grid-cols-4">
          {sectionKeys.map((key) => (
            <TabsTrigger key={key} value={key} className="h-auto rounded-xl px-4 py-3 text-sm">
              {t.sections[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t.badges.total} value={stats.total} description={t.overview.description} icon={Building2} />
            <MetricCard title={t.badges.attention} value={stats.attention} description={t.activity.opportunitiesDescription} icon={AlertTriangle} />
            <MetricCard title={t.badges.blocked} value={stats.blocked} description={t.alerts.blocked} icon={ShieldCheck} />
            <MetricCard title={t.badges.active} value={stats.active} description={`${stats.pendingInvites} ${t.activity.pendingInvites.toLowerCase()}`} icon={TrendingUp} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>{t.overview.attentionTitle}</CardTitle>
                <CardDescription>{t.overview.attentionDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityOrganizations.length ? (
                  priorityOrganizations.map((organization) => (
                    <PriorityRow
                      key={organization.id}
                      title={organization.name}
                      subtitle={`${formatSegment(organization.organization_type)} • ${formatStatus(organization.plan_status)}`}
                      meta={`${t.organizations.lastActivity}: ${formatDate(organization.last_activity)}`}
                      badges={renderSignals(organization)}
                      actionLabel={t.overview.openPlans}
                      onAction={() => setSectionAndOrg('plans', organization.id)}
                    />
                  ))
                ) : (
                  <PanelEmptyState title={t.overview.attentionTitle} description={t.overview.attentionEmpty} compact />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>{t.overview.recentTitle}</CardTitle>
                  <CardDescription>{t.overview.recentDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentOrganizations.length ? (
                    recentOrganizations.map((organization) => (
                      <SimpleInfoRow
                        key={organization.id}
                        title={organization.name}
                        subtitle={`${formatSegment(organization.organization_type)} • ${formatDate(organization.created_at)}`}
                        badge={formatStatus(organization.plan_status)}
                      />
                    ))
                  ) : (
                    <PanelEmptyState title={t.overview.recentTitle} description={t.overview.recentEmpty} compact />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>{t.overview.mixTitle}</CardTitle>
                  <CardDescription>{t.overview.mixDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PlanMixRow label={t.filters.free} count={stats.free} total={stats.total} />
                  <PlanMixRow label={t.filters.trial} count={stats.trial} total={stats.total} />
                  <PlanMixRow label={t.filters.paid} count={stats.paid} total={stats.total} />
                  <PlanMixRow label={t.filters.blocked} count={stats.blocked} total={stats.total} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{t.organizations.title}</CardTitle>
              <CardDescription>{t.organizations.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.filters.searchPlaceholder}
                    className="rounded-xl bg-background pl-9 rtl:pl-3 rtl:pr-9"
                  />
                </div>
                <Select value={filter} onValueChange={(value) => setFilter(value as FilterKey)}>
                  <SelectTrigger className="w-full rounded-xl lg:w-[220px]">
                    <SelectValue placeholder={t.filters.label} />
                  </SelectTrigger>
                  <SelectContent align={isRtl ? 'end' : 'start'}>
                    {filterKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t.filters[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-3xl border-dashed">
                  <CardContent className="space-y-3 p-4">
                    {filteredOrganizations.length ? (
                      filteredOrganizations.map((organization) => {
                        const isSelected = organization.id === selectedOrganization?.id

                        return (
                          <button
                            key={organization.id}
                            type="button"
                            onClick={() => setSelectedOrgId(organization.id)}
                            className={cn(
                              'w-full rounded-2xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/30',
                              isSelected ? 'border-primary/60 bg-primary/5 shadow-sm' : 'border-border/60',
                            )}
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">{organization.name}</p>
                                  <Badge variant="outline">{formatStatus(organization.plan_status)}</Badge>
                                  {organization.access_blocked ? <Badge variant="destructive">{t.alerts.blocked}</Badge> : null}
                                  {organization.limit_reached ? <Badge variant="secondary">{t.alerts.atLimit}</Badge> : null}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p>{formatSegment(organization.organization_type)} • {organization.slug}</p>
                                  <p>{t.organizations.members}: {organization.active_members}/{organization.max_members_allowed}</p>
                                </div>
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground lg:text-right">
                                <p>{t.organizations.lastActivity}: {formatDate(organization.last_activity)}</p>
                                <p>{t.activity.pendingInvites}: {organization.pending_invites ?? 0}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <PanelEmptyState title={t.organizations.title} description={t.organizations.empty} compact />
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl">
                  <CardHeader>
                    <CardTitle>{t.organizations.selectedTitle}</CardTitle>
                    <CardDescription>{t.organizations.selectedDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedOrganization ? (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold">{selectedOrganization.name}</h3>
                            <Badge variant="outline">{formatStatus(selectedOrganization.plan_status)}</Badge>
                          </div>
                          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                            <InfoField label={t.organizations.segment} value={formatSegment(selectedOrganization.organization_type)} />
                            <InfoField label={t.organizations.slug} value={selectedOrganization.slug} />
                            <InfoField label={t.organizations.members} value={`${selectedOrganization.active_members}/${selectedOrganization.max_members_allowed}`} />
                            <InfoField label={t.organizations.totalMembers} value={String(selectedOrganization.total_members)} />
                            <InfoField label={t.organizations.pendingInvites} value={String(selectedOrganization.pending_invites ?? 0)} />
                            <InfoField label={t.organizations.lastActivity} value={formatDate(selectedOrganization.last_activity)} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {renderSignals(selectedOrganization).map((signal) => (
                            <Badge key={signal} variant="secondary">{signal}</Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => setSection('plans')}>{t.organizations.openPlans}</Button>
                          <Button variant="outline" onClick={() => setSection('activity')}>{t.organizations.openActivity}</Button>
                        </div>
                      </div>
                    ) : (
                      <PanelEmptyState title={t.organizations.selectedTitle} description={t.organizations.noSelection} compact />
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{t.plans.title}</CardTitle>
              <CardDescription>{t.plans.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="max-w-sm">
                <p className="mb-2 text-sm font-medium text-foreground">{t.plans.orgLabel}</p>
                <Select value={selectedOrganization?.id ?? ''} onValueChange={(value) => setSelectedOrgId(value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t.plans.orgLabel} />
                  </SelectTrigger>
                  <SelectContent align={isRtl ? 'end' : 'start'}>
                    {organizations.map((organization) => (
                      <SelectItem key={organization.id} value={organization.id}>
                        {organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrganization ? (
                <>
                  <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <Card className="rounded-3xl border-dashed">
                      <CardHeader>
                        <CardTitle>{t.plans.accessTitle}</CardTitle>
                        <CardDescription>{t.plans.accessDescription}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <InfoField label={t.plans.currentPlan} value={formatPlanType(selectedOrganization.plan_type)} />
                        <InfoField label={t.plans.currentStatus} value={formatStatus(selectedOrganization.plan_status)} />
                        <InfoField label={t.plans.memberUsage} value={`${selectedOrganization.active_members}/${selectedOrganization.max_members_allowed}`} />
                        <InfoField label={t.plans.trialEnds} value={formatDate(selectedOrganization.trial_ends_at)} />
                        <InfoField
                          label={t.plans.followUpLabel}
                          value={t.followUp.options[(selectedOrganization.follow_up_status ?? 'new') as keyof typeof t.followUp.options]}
                        />
                        <div className="flex flex-wrap gap-2 pt-2">
                          {renderSignals(selectedOrganization).map((signal) => (
                            <Badge key={signal} variant="secondary">
                              {signal}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl">
                      <CardHeader>
                        <CardTitle>{t.plans.actionsTitle}</CardTitle>
                        <CardDescription>{t.plans.actionsDescription}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              void patchOrganization(selectedOrganization.id, {
                                plan_status: 'trial',
                                plan_type: selectedOrganization.plan_type === 'free' ? 'growth' : selectedOrganization.plan_type,
                                access_blocked: false,
                                trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
                                max_members_allowed: Math.max(selectedOrganization.max_members_allowed ?? 1, (selectedOrganization.active_members ?? 0) + 5),
                              })
                            }
                            disabled={savingId === selectedOrganization.id}
                          >
                            {t.plans.startTrial}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void patchOrganization(selectedOrganization.id, {
                                plan_status: 'active_paid',
                                plan_type: selectedOrganization.plan_type === 'free' ? 'growth' : selectedOrganization.plan_type,
                                access_blocked: false,
                                max_members_allowed: Math.max(selectedOrganization.max_members_allowed ?? 1, (selectedOrganization.active_members ?? 0) + 25),
                              })
                            }
                            disabled={savingId === selectedOrganization.id}
                          >
                            {t.plans.markPaid}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              void patchOrganization(selectedOrganization.id, {
                                plan_status: 'free',
                                plan_type: 'free',
                                access_blocked: false,
                                max_members_allowed: 1,
                              })
                            }
                            disabled={savingId === selectedOrganization.id}
                          >
                            {t.plans.setFree}
                          </Button>
                          <Button
                            variant={selectedOrganization.access_blocked ? 'secondary' : 'destructive'}
                            onClick={() =>
                              void patchOrganization(selectedOrganization.id, {
                                access_blocked: !selectedOrganization.access_blocked,
                                plan_status: selectedOrganization.access_blocked ? 'active_paid' : 'blocked',
                              })
                            }
                            disabled={savingId === selectedOrganization.id}
                          >
                            {selectedOrganization.access_blocked ? t.plans.unblock : t.plans.block}
                          </Button>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <p className="mb-2 text-sm font-medium">{t.plans.limitLabel}</p>
                              <Input
                                type="number"
                                min={1}
                                value={limitDrafts[selectedOrganization.id] ?? String(selectedOrganization.max_members_allowed ?? 1)}
                                onChange={(event) =>
                                  setLimitDrafts((current) => ({ ...current, [selectedOrganization.id]: event.target.value }))
                                }
                                className="rounded-xl"
                              />
                              <p className="mt-2 text-xs text-muted-foreground">{t.plans.limitHint}</p>
                            </div>
                            <Button onClick={() => handleLimitSave(selectedOrganization)} disabled={savingId === selectedOrganization.id}>
                              {t.plans.saveLimit}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                          <p className="mb-2 text-sm font-medium">{t.plans.followUpLabel}</p>
                          <Select
                            value={selectedOrganization.follow_up_status ?? 'new'}
                            onValueChange={(value) =>
                              void patchOrganization(selectedOrganization.id, { follow_up_status: value as FollowUpStatus })
                            }
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align={isRtl ? 'end' : 'start'}>
                              {followUpKeys.map((key) => (
                                <SelectItem key={key} value={key}>
                                  {t.followUp.options[key]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="rounded-3xl">
                      <CardHeader>
                        <CardTitle>{t.followUp.billingTitle}</CardTitle>
                        <CardDescription>{t.followUp.billingDescription}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={billingDrafts[selectedOrganization.id] ?? selectedOrganization.billing_notes ?? ''}
                          onChange={(event) =>
                            setBillingDrafts((current) => ({ ...current, [selectedOrganization.id]: event.target.value }))
                          }
                          placeholder={t.followUp.billingPlaceholder}
                          className="min-h-[140px] rounded-2xl"
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            void patchOrganization(selectedOrganization.id, {
                              billing_notes: billingDrafts[selectedOrganization.id] ?? selectedOrganization.billing_notes ?? '',
                            })
                          }
                          disabled={savingId === selectedOrganization.id}
                        >
                          <CreditCard className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          {t.followUp.saveBilling}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl">
                      <CardHeader>
                        <CardTitle>{t.followUp.noteTitle}</CardTitle>
                        <CardDescription>{t.followUp.noteDescription}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          value={noteDrafts[selectedOrganization.id] ?? selectedOrganization.owner_note ?? ''}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({ ...current, [selectedOrganization.id]: event.target.value }))
                          }
                          placeholder={t.followUp.notePlaceholder}
                          className="min-h-[140px] rounded-2xl"
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            void patchOrganization(selectedOrganization.id, {
                              owner_note: noteDrafts[selectedOrganization.id] ?? selectedOrganization.owner_note ?? '',
                            })
                          }
                          disabled={savingId === selectedOrganization.id}
                        >
                          {t.followUp.saveNote}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <PanelEmptyState title={t.plans.title} description={t.plans.noSelection} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title={t.badges.active} value={stats.active} description={t.activity.activeDescription} icon={TrendingUp} />
            <MetricCard title={t.badges.attention} value={stats.attention} description={t.activity.opportunitiesDescription} icon={AlertTriangle} />
            <MetricCard title={t.activity.pendingInvites} value={stats.pendingInvites} description={t.activity.description} icon={Clock3} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>{t.activity.opportunitiesTitle}</CardTitle>
                <CardDescription>{t.activity.opportunitiesDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityOrganizations.length ? (
                  priorityOrganizations.map((organization) => (
                    <PriorityRow
                      key={organization.id}
                      title={organization.name}
                      subtitle={`${t.activity.attempts7}: ${organization.attempts_7d ?? 0} • ${t.activity.pendingInvites}: ${organization.pending_invites ?? 0}`}
                      meta={`${t.organizations.lastActivity}: ${formatDate(organization.last_activity)}`}
                      badges={renderSignals(organization)}
                      actionLabel={t.activity.openPlans}
                      onAction={() => setSectionAndOrg('plans', organization.id)}
                    />
                  ))
                ) : (
                  <PanelEmptyState title={t.activity.opportunitiesTitle} description={t.activity.opportunitiesEmpty} compact />
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>{t.activity.activeTitle}</CardTitle>
                  <CardDescription>{t.activity.activeDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeOrganizations.length ? (
                    activeOrganizations.map((organization) => (
                      <SimpleInfoRow
                        key={organization.id}
                        title={organization.name}
                        subtitle={`${t.activity.attempts30}: ${organization.attempts_30d ?? 0}`}
                        badge={formatDate(organization.last_activity)}
                      />
                    ))
                  ) : (
                    <PanelEmptyState title={t.activity.activeTitle} description={t.activity.activeEmpty} compact />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl">
                <CardHeader>
                  <CardTitle>{t.activity.quietTitle}</CardTitle>
                  <CardDescription>{t.activity.quietDescription}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quietOrganizations.length ? (
                    quietOrganizations.map((organization) => (
                      <SimpleInfoRow
                        key={organization.id}
                        title={organization.name}
                        subtitle={`${formatSegment(organization.organization_type)} • ${formatStatus(organization.plan_status)}`}
                        badge={t.alerts.inactive}
                      />
                    ))
                  ) : (
                    <PanelEmptyState title={t.activity.quietTitle} description={t.activity.quietEmpty} compact />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
