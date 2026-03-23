'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BarChart3, TrendingUp, Users, Zap } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  CHANNELS,
  SIMULATION_CATEGORIES,
  type Channel,
  type SimulationCategory,
} from '@/lib/constants'
import {
  formatOrganizationMemberStatusLabel,
  formatOrganizationRoleLabel,
  getCompanyCopy,
} from '@/lib/company-copy'
import { useLocale } from '@/lib/locale-context'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatRelativeTimestamp,
} from '@/lib/presentation'
import type { getOrganizationReportsData } from '@/lib/company-analytics/service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ReportsPayload = Awaited<ReturnType<typeof getOrganizationReportsData>>

interface ReportsFiltersState {
  category: SimulationCategory | ''
  channel: Channel | ''
  employeeId: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: ReportsFiltersState = {
  category: '',
  channel: '',
  employeeId: '',
  dateFrom: '',
  dateTo: '',
}

function hasActiveFilters(filters: ReportsFiltersState) {
  return Boolean(
    filters.category ||
      filters.channel ||
      filters.employeeId ||
      filters.dateFrom ||
      filters.dateTo,
  )
}

export default function AdminReportsPage() {
  const { locale, dir } = useLocale()
  const companyCopy = getCompanyCopy(locale)
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [filters, setFilters] = useState<ReportsFiltersState>(EMPTY_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [requiresAdmin, setRequiresAdmin] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()

    if (filters.category) {
      params.set('category', filters.category)
    }

    if (filters.channel) {
      params.set('channel', filters.channel)
    }

    if (filters.employeeId) {
      params.set('employeeId', filters.employeeId)
    }

    if (filters.dateFrom) {
      params.set('dateFrom', filters.dateFrom)
    }

    if (filters.dateTo) {
      params.set('dateTo', filters.dateTo)
    }

    return params.toString()
  }, [filters])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (hasLoadedOnceRef.current) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      setRequiresAdmin(false)

      try {
        const response = await fetch(
          queryString ? `/api/organization/reports?${queryString}` : '/api/organization/reports',
        )
        const payload = await response.json().catch(() => null)

        if (!active) {
          return
        }

        if (!response.ok) {
          if (response.status === 403) {
            setRequiresAdmin(true)
          }
          setError(payload?.error ?? companyCopy.reports.loadError)
          setIsLoading(false)
          setIsRefreshing(false)
          return
        }

        setData(payload)
        hasLoadedOnceRef.current = true
        setIsLoading(false)
        setIsRefreshing(false)
      } catch {
        if (!active) {
          return
        }

        setError(companyCopy.reports.loadError)
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [companyCopy.reports.loadError, queryString])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (requiresAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.reports.accessTitle}</CardTitle>
            <CardDescription>{companyCopy.reports.accessDescription}</CardDescription>
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

  const hasTeamAttempts = data.overview.totalAttempts > 0
  const hasChannelBreakdown = data.channelBreakdown.length > 0
  const hasEmployeePerformance = data.employeePerformance.length > 0
  const hasRecentActivity = data.recentActivity.length > 0
  const filtersApplied = hasActiveFilters(filters)
  const organizationProfile = getOrganizationSegmentProfile(
    data.organization.organization_type,
    data.organization.industry,
    locale,
  )

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {companyCopy.reports.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {`${companyCopy.reports.subtitlePrefix} ${data.organization.name}`}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{companyCopy.reports.filtersTitle}</CardTitle>
          <CardDescription>{companyCopy.reports.filtersDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label>{companyCopy.reports.category}</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    category: value === 'all' ? '' : (value as SimulationCategory),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={companyCopy.reports.allDomains} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{companyCopy.reports.allDomains}</SelectItem>
                  {SIMULATION_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {formatCategoryLabel(category, locale, data.organization.organization_type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{companyCopy.reports.channel}</Label>
              <Select
                value={filters.channel || 'all'}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    channel: value === 'all' ? '' : (value as Channel),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={companyCopy.reports.allChannels} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{companyCopy.reports.allChannels}</SelectItem>
                  {CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {formatChannelLabel(channel, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{companyCopy.reports.employee}</Label>
              <Select
                value={filters.employeeId || 'all'}
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    employeeId: value === 'all' ? '' : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={companyCopy.reports.allEmployees} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{companyCopy.reports.allEmployees}</SelectItem>
                  {data.availableEmployees.map((employee) => (
                    <SelectItem key={employee.userId} value={employee.userId}>
                      {employee.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">{companyCopy.reports.dateFrom}</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">{companyCopy.reports.dateTo}</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filtersApplied ? companyCopy.reports.filtersApplied : ''}
            </p>
            <Button
              variant="outline"
              onClick={() => setFilters(EMPTY_FILTERS)}
              disabled={!filtersApplied || isRefreshing}
            >
              {companyCopy.common.clearFilters}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'סיכום פשוט למנהלים' : 'Plain-language manager summary'}</CardTitle>
          <CardDescription>{organizationProfile.adminHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-7 text-foreground">
            {data.plainLanguageSummary}
          </div>
          <div className="space-y-3">
            {data.practicalRecommendations.map((item) => (
              <div key={item} className="rounded-lg border border-border p-3 text-sm">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!hasTeamAttempts ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>{companyCopy.reports.noTeamDataTitle}</CardTitle>
            <CardDescription>{companyCopy.reports.noTeamDataDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button>{locale === 'he' ? 'חזרו לניהול הצוות' : 'Back to Team Admin'}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className={isRefreshing ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {locale === 'he' ? 'סה״כ עובדים' : 'Total Employees'}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.overview.totalEmployees}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {locale === 'he' ? 'סה״כ ניסיונות' : 'Total Attempts'}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.overview.totalAttempts}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {locale === 'he' ? 'דיוק ממוצע' : 'Average Accuracy'}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.overview.averageAccuracy}%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {locale === 'he' ? 'עובדים פעילים' : 'Active Employees'}
              </CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent className="text-3xl font-bold">{data.overview.activeEmployees}</CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'he' ? 'דיוק לפי תחום' : 'Accuracy by Domain'}</CardTitle>
              <CardDescription>
                {locale === 'he'
                  ? 'התפלגות ביצועים לפי תחומי אימון בצוות.'
                  : 'Team-wide performance breakdown by training domain.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {data.categoryBreakdown.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.categoryBreakdown.map((item) => ({
                      ...item,
                      label: formatCategoryLabel(item.key, locale, data.organization.organization_type),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="correctRate" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  {companyCopy.reports.noCategoryBreakdown}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'he' ? 'מגמת ציונים' : 'Score Trend'}</CardTitle>
              <CardDescription>
                {locale === 'he'
                  ? 'שינוי נפח וציונים לאורך הפעילות הארגונית.'
                  : 'Volume and score trend over organizational activity.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {data.scoreTrend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-accent)"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  {companyCopy.reports.noScoreTrend}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'he' ? 'ערוצים מובילים' : 'Channel Breakdown'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasChannelBreakdown ? (
                data.channelBreakdown.map((item) => (
                  <div key={item.key} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{formatChannelLabel(item.key, locale)}</p>
                    <p className="text-2xl font-bold">{item.correctRate}%</p>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'he' ? `${item.attempts} ניסיונות` : `${item.attempts} attempts`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{companyCopy.reports.noChannelBreakdown}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'he' ? 'עובדים בשיפור' : 'Most Improved'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.mostImproved.length ? (
                data.mostImproved.map((employee) => (
                  <div key={employee.userId} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    <p className="mt-2 text-sm">
                      {locale === 'he'
                        ? `שיפור של ${employee.improvement} נקודות דיוק`
                        : `${employee.improvement} point accuracy improvement`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === 'he'
                    ? 'עדיין אין מספיק נתונים לזיהוי מגמת שיפור.'
                    : 'There is not enough data yet to identify improvement trends.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'he' ? 'מעורבות נמוכה' : 'Low Engagement'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.lowEngagement.length ? (
                data.lowEngagement.map((employee) => (
                  <div key={employee.userId} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {employee.lastTrainedAt
                        ? locale === 'he'
                          ? `פעילות אחרונה ${formatRelativeTimestamp(employee.lastTrainedAt, locale)}`
                          : `Last activity ${formatRelativeTimestamp(employee.lastTrainedAt, locale)}`
                        : locale === 'he'
                          ? 'אין פעילות אימון עדיין'
                          : 'No training activity yet'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === 'he'
                    ? 'לא זוהו עובדים במעורבות נמוכה כרגע.'
                    : 'No low-engagement employees were identified right now.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'קבוצות שצריכות רענון' : 'Groups needing a refresher'}</CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'חלוקה פשוטה למנהלים: את מי כדאי לחזק קודם.'
                : 'A simple manager view of which employee groups should be reinforced first.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.employeeGroupsNeedingRefreshers.length ? (
              data.employeeGroupsNeedingRefreshers.map((item) => (
                <div key={item} className="rounded-lg border border-border p-3 text-sm">
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {locale === 'he'
                  ? 'כרגע לא בולטת קבוצת עובדים שדורשת רענון מיוחד.'
                  : 'No specific employee group currently stands out for extra refresher work.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'ביצועי עובדים' : 'Employee Performance'}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasEmployeePerformance ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === 'he' ? 'עובד' : 'Employee'}</TableHead>
                    <TableHead>{locale === 'he' ? 'תפקיד' : 'Role'}</TableHead>
                    <TableHead>{companyCopy.reports.status}</TableHead>
                    <TableHead>{locale === 'he' ? 'ציון' : 'Score'}</TableHead>
                    <TableHead>{locale === 'he' ? 'דיוק' : 'Accuracy'}</TableHead>
                    <TableHead>{locale === 'he' ? 'רצף' : 'Streak'}</TableHead>
                    <TableHead>{locale === 'he' ? 'ניסיונות' : 'Attempts'}</TableHead>
                    <TableHead>{locale === 'he' ? 'קטגוריה חלשה' : 'Weakest Category'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employeePerformance.map((employee) => (
                    <TableRow key={employee.userId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.fullName}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatOrganizationRoleLabel(employee.role, locale)}</TableCell>
                      <TableCell>
                        {formatOrganizationMemberStatusLabel(employee.status, locale)}
                      </TableCell>
                      <TableCell>{employee.totalScore}</TableCell>
                      <TableCell>{employee.accuracyRate}%</TableCell>
                      <TableCell>{employee.streakCount}</TableCell>
                      <TableCell>{employee.totalAttempts}</TableCell>
                      <TableCell>{formatCategoryLabel(employee.weakestCategory, locale, data.organization.organization_type)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.reports.noEmployeePerformance}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'סיכום פעילות אחרונה' : 'Recent Team Activity'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasRecentActivity ? (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{activity.employeeName}</p>
                    <p className="truncate text-sm text-muted-foreground">{activity.title}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{activity.channel ? formatChannelLabel(activity.channel, locale) : '-'}</p>
                    <p>{formatRelativeTimestamp(activity.createdAt, locale)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{companyCopy.reports.noRecentActivity}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
