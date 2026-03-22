'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, Trophy, Users } from 'lucide-react'

import { formatOrganizationRoleLabel, getCompanyCopy } from '@/lib/company-copy'
import { useLocale } from '@/lib/locale-context'
import { formatCategoryLabel, formatDifficultyLabel } from '@/lib/presentation'
import type { getOrganizationLeaderboard } from '@/lib/company-analytics/service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type LeaderboardPayload = Awaited<ReturnType<typeof getOrganizationLeaderboard>>

export default function LeaderboardPage() {
  const { locale, dir } = useLocale()
  const companyCopy = getCompanyCopy(locale)
  const [data, setData] = useState<LeaderboardPayload | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresOrganization, setRequiresOrganization] = useState(false)
  const [requiresAdmin, setRequiresAdmin] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setRequiresOrganization(false)
      setRequiresAdmin(false)

      try {
        const response = await fetch(`/api/organization/leaderboard?page=${page}&limit=15`)
        const payload = await response.json().catch(() => null)

        if (!active) {
          return
        }

        if (!response.ok) {
          if (response.status === 403 && payload?.error === 'Organization membership is required.') {
            setRequiresOrganization(true)
          } else if (response.status === 403 && payload?.error === 'Organization admin access is required.') {
            setRequiresAdmin(true)
          } else {
            setError(payload?.error ?? companyCopy.leaderboard.loadError)
          }
          setIsLoading(false)
          return
        }

        setData(payload)
        setIsLoading(false)
      } catch {
        if (!active) {
          return
        }

        setError(companyCopy.leaderboard.loadError)
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [companyCopy.leaderboard.loadError, page])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (requiresOrganization) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.leaderboard.noOrganizationTitle}</CardTitle>
            <CardDescription>{companyCopy.leaderboard.noOrganizationDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button>{companyCopy.common.openSettings}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requiresAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle>{companyCopy.leaderboard.restrictedTitle}</CardTitle>
            <CardDescription>{companyCopy.leaderboard.restrictedDescription}</CardDescription>
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

  if (!data.settings?.allow_leaderboard) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {companyCopy.leaderboard.disabled}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {companyCopy.leaderboard.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {`${companyCopy.leaderboard.subtitlePrefix} ${data.organization.name}`}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Users className="h-4 w-4 text-primary" />
            {data.pagination.total}
            <span className="text-muted-foreground">
              {companyCopy.leaderboard.rankedEmployees}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {companyCopy.leaderboard.rankingTitle}
          </CardTitle>
          <CardDescription>{companyCopy.leaderboard.rankingDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.rows.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === 'he' ? 'מקום' : 'Rank'}</TableHead>
                    <TableHead>{locale === 'he' ? 'עובד' : 'Employee'}</TableHead>
                    <TableHead>{locale === 'he' ? 'תפקיד' : 'Role'}</TableHead>
                    <TableHead>{locale === 'he' ? 'ציון' : 'Score'}</TableHead>
                    <TableHead>{locale === 'he' ? 'דיוק' : 'Accuracy'}</TableHead>
                    <TableHead>{locale === 'he' ? 'רצף' : 'Streak'}</TableHead>
                    <TableHead>{locale === 'he' ? 'ניסיונות' : 'Attempts'}</TableHead>
                    <TableHead>{locale === 'he' ? 'רמה' : 'Level'}</TableHead>
                    <TableHead>{locale === 'he' ? 'מוקד' : 'Focus'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-semibold">#{row.rank}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.fullName}</p>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatOrganizationRoleLabel(row.role, locale)}
                      </TableCell>
                      <TableCell>{row.totalScore}</TableCell>
                      <TableCell>{row.accuracyRate}%</TableCell>
                      <TableCell>{row.streakCount}</TableCell>
                      <TableCell>{row.totalAttempts}</TableCell>
                      <TableCell>{formatDifficultyLabel(row.currentLevel, locale)}</TableCell>
                      <TableCell>{formatCategoryLabel(row.weakestCategory, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {`${companyCopy.leaderboard.pagePrefix} ${data.pagination.page} ${companyCopy.leaderboard.pageOf} ${data.pagination.totalPages}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={data.pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {companyCopy.leaderboard.previous}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    {companyCopy.leaderboard.next}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p>{companyCopy.leaderboard.noRows}</p>
              <p className="mt-2">{companyCopy.leaderboard.noRowsHint}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
