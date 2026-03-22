'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Shield,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
} from 'recharts'

import { useLocale } from '@/lib/locale-context'
import { formatCategoryLabel, formatChannelLabel, formatRelativeTimestamp } from '@/lib/presentation'
import type { getReportsData } from '@/lib/training/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type ReportsPayload = Awaited<ReturnType<typeof getReportsData>>

export default function ReportsPage() {
  const { t, locale, dir } = useLocale()
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const response = await fetch('/api/analytics')
      const payload = await response.json()

      if (!active) {
        return
      }

      if (!response.ok) {
        setError(payload.error ?? t.common.error)
        setIsLoading(false)
        return
      }

      setData(payload)
      setIsLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [t.common.error])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <div className="mb-8 space-y-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error ?? t.common.error}</p>
            <Button onClick={() => window.location.reload()}>{t.common.retry}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.reports.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.reports.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.reports.metrics.totalSessions}
            </CardTitle>
            <BarChartIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overview.totalAttempts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dashboard.stats.detectionRate}
            </CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overview.correctRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.reports.metrics.bestStreak}
            </CardTitle>
            <Zap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overview.streakCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locale === 'he' ? 'ציון כולל' : 'Total Score'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.overview.totalScore}</div>
          </CardContent>
        </Card>
      </div>

      {data.overview.totalAttempts === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-10">
            <div>
              <h2 className="text-lg font-semibold">
                {locale === 'he' ? 'עדיין אין אנליטיקה' : 'No analytics yet'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {locale === 'he'
                  ? 'השלימו את סשן האימון הראשון כדי לפתוח גרפים ופילוחים.'
                  : 'Finish your first training session to unlock charts and breakdowns.'}
              </p>
            </div>
            <Link href="/training">
              <Button>{locale === 'he' ? 'התחילו אימון' : 'Start Training'}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.reports.categories}</CardTitle>
            <CardDescription>
              {locale === 'he' ? 'התפלגות דיוק לפי תחום אימון' : 'Accuracy breakdown by training domain'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.categoryBreakdown.map((item) => ({
                  ...item,
                  label: formatCategoryLabel(item.key, locale),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="correctRate" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reports.trends}</CardTitle>
            <CardDescription>
              {locale === 'he' ? 'מגמת צבירת נקודות לאורך זמן' : 'Score trend across your recent attempts'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="index" tickLine={false} axisLine={false} />
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.reports.recentAttempts}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'he' ? 'סימולציה' : 'Simulation'}</TableHead>
                  <TableHead>{locale === 'he' ? 'ערוץ' : 'Channel'}</TableHead>
                  <TableHead>{locale === 'he' ? 'תוצאה' : 'Result'}</TableHead>
                  <TableHead>{locale === 'he' ? 'תאריך' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.title}</TableCell>
                    <TableCell>
                      {attempt.simulation ? formatChannelLabel(attempt.simulation.channel, locale) : '-'}
                    </TableCell>
                    <TableCell>
                      {attempt.isCorrect
                        ? locale === 'he'
                          ? 'נכון'
                          : 'Correct'
                        : locale === 'he'
                          ? 'שגוי'
                          : 'Incorrect'}
                    </TableCell>
                    <TableCell>{formatRelativeTimestamp(attempt.createdAt, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.reports.recommendations}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recommendations.length ? (
              data.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border border-border p-4">
                  <p className="font-medium">{recommendation.recommendation_text}</p>
                  {recommendation.reason ? (
                    <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t.reports.empty.description}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.channels}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {data.channelBreakdown.map((channel) => (
            <div key={channel.key} className="rounded-lg border border-border p-4">
              <p className="font-medium">{formatChannelLabel(channel.key, locale)}</p>
              <p className="mt-1 text-3xl font-bold">{channel.correctRate}%</p>
              <p className="text-sm text-muted-foreground">
                {locale === 'he' ? `${channel.attempts} ניסיונות` : `${channel.attempts} attempts`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
