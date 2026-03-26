'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Ban, RefreshCw, Users, Filter, Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocale } from '@/lib/locale-context'
import { getDirection } from '@/lib/i18n'

type OwnerOrg = {
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
  follow_up_status?: string
  owner_note?: string | null
}

type OrgStats = {
  total: number
  free: number
  trial: number
  paid: number
  blocked: number
  hittingLimits: number
  likelyToConvert: number
  activeLast7: number
  recent: string[]
}

type FilterKey = 'all' | 'free' | 'trial' | 'paid' | 'blocked' | 'limit' | 'opportunity'

const copy = {
  he: {
    title: 'קונסולת בעלים',
    subtitle: 'בקרה מהירה על ארגונים, תוכניות ומגבלות.',
    organizations: 'ארגונים',
    orgSubtitle: 'שדרוג, הסרת חסימה או הרחבת מגבלה בלחיצה.',
    filters: 'מסננים',
    filterLabels: {
      all: 'הכל',
      free: 'חינמי',
      trial: 'ניסיון',
      paid: 'בתשלום',
      blocked: 'חסומים',
      limit: 'הגיעו למגבלה',
      opportunity: 'כדאי לפנות',
    },
    stats: {
      total: 'סה״כ ארגונים',
      free: 'חינמי',
      trial: 'ניסיון',
      paid: 'בתשלום',
      blocked: 'חסומים',
      limit: 'הגיעו למגבלה',
      opportunity: 'כדאי לשדרג',
      active: 'פעילים 7 ימים',
    },
    table: {
      name: 'שם',
      segment: 'סגמנט',
      plan: 'מסלול',
      members: 'חברים',
      activity: 'פעילות',
      status: 'סטטוס',
      actions: 'פעולות',
      loading: 'טוען...',
      empty: 'אין ארגונים תחת המסנן הנוכחי.',
    },
    planStatus: {
      free: 'חינמי',
      trial: 'ניסיון',
      active_paid: 'בתשלום',
      past_due: 'באיחור',
      blocked: 'חסום',
    },
    segments: {
      nursing_home: 'בית אבות',
      education: 'חינוך',
      nonprofit: 'עמותה',
      municipality: 'עירייה',
      smb: 'עסק קטן',
      other: 'אחר',
    },
    followUp: {
      label: 'סטטוס פנייה',
      options: {
        new: 'חדש',
        contacted: 'בוצעה פנייה',
        offered_discount: 'הוצעה הנחה',
        upgraded: 'שודרג',
      },
      notePlaceholder: 'הערת מעקב פנימית',
    },
    badges: {
      atLimit: 'הגיע למגבלה',
      blocked: 'חסום',
      likely: 'כדאי לפנות',
    },
    actions: {
      refresh: 'רענון',
      trial: 'התחלת ניסיון',
      paid: 'סימון בתשלום',
      free: 'החזרה לחינם',
      block: 'חסימה',
      unblock: 'ביטול חסימה',
      saveNote: 'שמירת הערה',
      limitLabel: 'מקסימום משתמשים',
    },
    activity: {
      last: 'פעילות אחרונה',
      attempts7: 'נסיונות 7 ימים',
      attempts30: 'נסיונות 30 ימים',
      invites: 'הזמנות ממתינות',
    },
  },
  en: {
    title: 'Owner console',
    subtitle: 'Quick control of org plans and limits.',
    organizations: 'Organizations',
    orgSubtitle: 'Upgrade, unblock, or extend limits manually.',
    filters: 'Filters',
    filterLabels: {
      all: 'All',
      free: 'Free',
      trial: 'Trial',
      paid: 'Paid',
      blocked: 'Blocked',
      limit: 'At limit',
      opportunity: 'Likely to convert',
    },
    stats: {
      total: 'Total orgs',
      free: 'Free',
      trial: 'Trial',
      paid: 'Paid',
      blocked: 'Blocked',
      limit: 'At limit',
      opportunity: 'Likely to upgrade',
      active: 'Active (7d)',
    },
    table: {
      name: 'Name',
      segment: 'Segment',
      plan: 'Plan',
      members: 'Members',
      activity: 'Activity',
      status: 'Status',
      actions: 'Actions',
      loading: 'Loading...',
      empty: 'No organizations match this filter.',
    },
    planStatus: {
      free: 'Free',
      trial: 'Trial',
      active_paid: 'Paid',
      past_due: 'Past due',
      blocked: 'Blocked',
    },
    segments: {
      nursing_home: 'Nursing home',
      education: 'Education',
      nonprofit: 'Nonprofit',
      municipality: 'Municipality',
      smb: 'SMB',
      other: 'Other',
    },
    followUp: {
      label: 'Follow-up',
      options: {
        new: 'New',
        contacted: 'Contacted',
        offered_discount: 'Offered discount',
        upgraded: 'Upgraded',
      },
      notePlaceholder: 'Internal follow-up note',
    },
    badges: {
      atLimit: 'At limit',
      blocked: 'Blocked',
      likely: 'Opportunity',
    },
    actions: {
      refresh: 'Refresh',
      trial: 'Start trial',
      paid: 'Mark paid',
      free: 'Set free',
      block: 'Block',
      unblock: 'Unblock',
      saveNote: 'Save note',
      limitLabel: 'Max members',
    },
    activity: {
      last: 'Last activity',
      attempts7: 'Attempts 7d',
      attempts30: 'Attempts 30d',
      invites: 'Pending invites',
    },
  },
} as const

export default function OwnerOrganizationsClient() {
  const { locale } = useLocale()
  const t = copy[locale]
  const isRtl = getDirection(locale) === 'rtl'

  const [organizations, setOrganizations] = useState<OwnerOrg[]>([])
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/owner/organizations')
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error ?? 'Unable to load organizations.')
        setLoading(false)
        return
      }

      setOrganizations((payload?.organizations ?? []) as OwnerOrg[])
      setStats((payload?.stats as OrgStats | null) ?? null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load organizations.')
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'free':
        return organizations.filter((org) => org.plan_status === 'free')
      case 'trial':
        return organizations.filter((org) => org.plan_status === 'trial')
      case 'paid':
        return organizations.filter((org) => org.plan_status === 'active_paid')
      case 'blocked':
        return organizations.filter((org) => org.plan_status === 'blocked' || org.access_blocked)
      case 'limit':
        return organizations.filter((org) => org.limit_reached)
      case 'opportunity':
        return organizations.filter((org) => org.likely_to_convert)
      case 'all':
      default:
        return organizations
    }
  }, [filter, organizations])

  const patchOrg = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id)
    try {
      const response = await fetch(/api/owner/organizations/, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error ?? 'Unable to update organization.')
        setSavingId(null)
        return
      }

      const updated = (payload?.organization as OwnerOrg | undefined) ?? null

      if (updated) {
        const limitReached =
          (updated.active_members ?? 0) >= (updated.max_members_allowed ?? 1)

        setOrganizations((current) =>
          current.map((org) => (org.id === id ? { ...updated, limit_reached: limitReached } : org)),
        )
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update organization.')
    } finally {
      setSavingId(null)
    }
  }

  const startTrial = (org: OwnerOrg) => {
    const trialEnds = new Date(Date.now() + 14 * 86_400_000).toISOString()
    void patchOrg(org.id, {
      plan_status: 'trial',
      plan_type: org.plan_type === 'free' ? 'growth' : org.plan_type,
      access_blocked: false,
      trial_ends_at: trialEnds,
      max_members_allowed: Math.max(org.max_members_allowed ?? 1, (org.active_members ?? 0) + 5),
    })
  }

  const markPaid = (org: OwnerOrg) => {
    void patchOrg(org.id, {
      plan_status: 'active_paid',
      plan_type: org.plan_type === 'free' ? 'growth' : org.plan_type,
      access_blocked: false,
      max_members_allowed: Math.max(org.max_members_allowed ?? 1, (org.active_members ?? 0) + 25),
    })
  }

  const markFree = (org: OwnerOrg) => {
    void patchOrg(org.id, {
      plan_status: 'free',
      plan_type: 'free',
      access_blocked: false,
      max_members_allowed: 1,
    })
  }

  const toggleBlock = (org: OwnerOrg) => {
    void patchOrg(org.id, {
      access_blocked: !org.access_blocked,
      plan_status: org.access_blocked ? 'active_paid' : 'blocked',
    })
  }

  const updateLimit = (org: OwnerOrg, value: number) => {
    if (!Number.isFinite(value) || value < 1) {
      return
    }

    void patchOrg(org.id, {
      max_members_allowed: Math.round(value),
    })
  }

  const updateFollowUp = (org: OwnerOrg, status: string) => {
    void patchOrg(org.id, {
      follow_up_status: status,
    })
  }

  const saveNote = (org: OwnerOrg) => {
    const note = noteDrafts[org.id] ?? org.owner_note ?? ''
    void patchOrg(org.id, { owner_note: note })
  }

  const formatPlanStatus = (status: string) => {
    return t.planStatus[status as keyof typeof t.planStatus] ?? t.planStatus.free
  }

  const formatSegment = (segment: string | null) => {
    if (!segment) return t.segments.other
    return t.segments[segment as keyof typeof t.segments] ?? t.segments.other
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{t.title}</p>
          <h1 className="text-2xl font-bold">{t.subtitle}</h1>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t.actions.refresh}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label={t.stats.total} value={stats?.total ?? 0} />
          <StatTile label={t.stats.free} value={stats?.free ?? 0} />
          <StatTile label={t.stats.trial} value={stats?.trial ?? 0} />
          <StatTile label={t.stats.paid} value={stats?.paid ?? 0} />
          <StatTile label={t.stats.blocked} value={stats?.blocked ?? 0} />
          <StatTile label={t.stats.limit} value={stats?.hittingLimits ?? 0} />
          <StatTile label={t.stats.opportunity} value={stats?.likelyToConvert ?? 0} />
          <StatTile label={t.stats.active} value={stats?.activeLast7 ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.organizations}</CardTitle>
          <CardDescription>{t.orgSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {t.filters}
            </Badge>
            {(['all', 'free', 'trial', 'paid', 'blocked', 'limit', 'opportunity'] as FilterKey[]).map((key) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key)}
              >
                {t.filterLabels[key]}
              </Button>
            ))}
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.table.name}</TableHead>
                  <TableHead>{t.table.segment}</TableHead>
                  <TableHead>{t.table.plan}</TableHead>
                  <TableHead>{t.table.members}</TableHead>
                  <TableHead>{t.table.activity}</TableHead>
                  <TableHead>{t.table.status}</TableHead>
                  <TableHead className="text-right">{t.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      {t.table.loading}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      {t.table.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="space-y-1">
                        <div className="font-semibold">{org.name}</div>
                        <div className="text-xs text-muted-foreground">{org.slug}</div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{formatSegment(org.organization_type)}</TableCell>
                      <TableCell className="space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={org.plan_status === 'active_paid' ? 'default' : 'outline'}>
                            {formatPlanStatus(org.plan_status)}
                          </Badge>
                          {org.access_blocked ? <Badge variant="destructive">{t.badges.blocked}</Badge> : null}
                          {org.likely_to_convert ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {t.badges.likely}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {org.plan_type ?? 'free'} • {t.actions.limitLabel} {org.max_members_allowed ?? 1}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Input
                            type="number"
                            min={1}
                            defaultValue={org.max_members_allowed ?? 1}
                            className="h-8 w-24"
                            onBlur={(event) => updateLimit(org, Number(event.target.value))}
                          />
                          <span>{t.actions.limitLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {org.active_members}/{org.max_members_allowed ?? 1}{' '}
                          {org.limit_reached ? <Badge variant="destructive">{t.badges.atLimit}</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {locale === 'he' ? 'סה״כ: ' : 'Total: '}{org.total_members ?? org.active_members}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {t.activity.last}: {formatDate(org.last_activity)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.activity.attempts7}: {org.attempts_7d ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.activity.attempts30}: {org.attempts_30d ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.activity.invites}: {org.pending_invites ?? 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {t.followUp.options[org.follow_up_status as keyof typeof t.followUp.options] ??
                              t.followUp.options.new}
                          </Badge>
                          {org.access_blocked ? <Badge variant="destructive">{t.badges.blocked}</Badge> : null}
                        </div>
                        <Select
                          defaultValue={org.follow_up_status ?? 'new'}
                          onValueChange={(value) => updateFollowUp(org, value)}
                          disabled={savingId === org.id}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align={isRtl ? 'end' : 'start'}>
                            {Object.entries(t.followUp.options).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-1">
                          <Textarea
                            defaultValue={org.owner_note ?? ''}
                            onChange={(event) =>
                              setNoteDrafts((current) => ({ ...current, [org.id]: event.target.value }))
                            }
                            onBlur={() => saveNote(org)}
                            placeholder={t.followUp.notePlaceholder}
                            className="min-h-[70px]"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="space-y-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startTrial(org)}
                            disabled={savingId === org.id}
                          >
                            {t.actions.trial}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaid(org)}
                            disabled={savingId === org.id}
                          >
                            {t.actions.paid}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markFree(org)}
                            disabled={savingId === org.id}
                          >
                            {t.actions.free}
                          </Button>
                          <Button
                            size="sm"
                            variant={org.access_blocked ? 'secondary' : 'destructive'}
                            onClick={() => toggleBlock(org)}
                            disabled={savingId === org.id}
                          >
                            {org.access_blocked ? (
                              <ShieldCheck className="ltr:mr-1 rtl:ml-1 h-4 w-4" />
                            ) : (
                              <Ban className="ltr:mr-1 rtl:ml-1 h-4 w-4" />
                            )}
                            {org.access_blocked ? t.actions.unblock : t.actions.block}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
