'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Ban, RefreshCw, Users, Filter } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'

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
}

type OrgStats = {
  total: number
  free: number
  trial: number
  paid: number
  blocked: number
  hittingLimits: number
  recent: string[]
}

type FilterKey = 'all' | 'free' | 'trial' | 'paid' | 'blocked' | 'limit'

function formatPlanStatus(status: string) {
  switch (status) {
    case 'active_paid':
      return 'Paid'
    case 'trial':
      return 'Trial'
    case 'past_due':
      return 'Past due'
    case 'blocked':
      return 'Blocked'
    case 'free':
    default:
      return 'Free'
  }
}

export default function OwnerOrganizationsClient() {
  const [organizations, setOrganizations] = useState<OwnerOrg[]>([])
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [savingId, setSavingId] = useState<string | null>(null)

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
      case 'all':
      default:
        return organizations
    }
  }, [filter, organizations])

  const patchOrg = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id)
    try {
      const response = await fetch(`/api/owner/organizations/${id}`, {
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
      max_members_allowed: Math.max(org.max_members_allowed ?? 1, org.active_members + 5),
    })
  }

  const markPaid = (org: OwnerOrg) => {
    void patchOrg(org.id, {
      plan_status: 'active_paid',
      plan_type: org.plan_type === 'free' ? 'growth' : org.plan_type,
      access_blocked: false,
      max_members_allowed: Math.max(org.max_members_allowed ?? 1, org.active_members + 25),
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

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Owner console</p>
          <h1 className="text-2xl font-bold">Organizations & access</h1>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business overview</CardTitle>
          <CardDescription>Quick view of plans and limits across all orgs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Total orgs" value={stats?.total ?? 0} />
          <StatTile label="Free" value={stats?.free ?? 0} />
          <StatTile label="Trial" value={stats?.trial ?? 0} />
          <StatTile label="Paid" value={stats?.paid ?? 0} />
          <StatTile label="Blocked" value={stats?.blocked ?? 0} />
          <StatTile label="At limit" value={stats?.hittingLimits ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Upgrade, unblock, or extend limits manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filters
            </Badge>
            {(['all', 'free', 'trial', 'paid', 'blocked', 'limit'] as FilterKey[]).map((key) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(key)}
              >
                {key === 'all'
                  ? 'All'
                  : key === 'paid'
                    ? 'Paid'
                    : key === 'limit'
                      ? 'At limit'
                      : key.charAt(0).toUpperCase() + key.slice(1)}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No organizations match this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="space-y-1">
                        <div className="font-semibold">{org.name}</div>
                        <div className="text-xs text-muted-foreground">{org.slug}</div>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {org.organization_type ?? '—'}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={org.plan_status === 'active_paid' ? 'default' : 'outline'}>
                            {formatPlanStatus(org.plan_status)}
                          </Badge>
                          {org.access_blocked ? <Badge variant="destructive">Blocked</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Type: {org.plan_type ?? 'free'} • Limit {org.max_members_allowed ?? 1}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Input
                            type="number"
                            min={1}
                            defaultValue={org.max_members_allowed ?? 1}
                            className="h-8 w-24"
                            onBlur={(event) => updateLimit(org, Number(event.target.value))}
                          />
                          <span>max members</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {org.active_members}/{org.max_members_allowed ?? 1}{' '}
                          {org.limit_reached ? <Badge variant="destructive">At limit</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {org.total_members ?? org.active_members}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.access_blocked ? 'Blocked' : 'Active'}
                      </TableCell>
                      <TableCell className="space-y-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startTrial(org)}
                            disabled={savingId === org.id}
                          >
                            Trial
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaid(org)}
                            disabled={savingId === org.id}
                          >
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markFree(org)}
                            disabled={savingId === org.id}
                          >
                            Free
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
                        {org.access_blocked ? 'Unblock' : 'Block'}
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
