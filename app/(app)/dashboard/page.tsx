'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Shield,
  Swords,
  BarChart3,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Target,
} from 'lucide-react'

import { type OrganizationType } from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import { formatCategoryLabel, formatDomainSummary, formatRelativeTimestamp } from '@/lib/presentation'
import type { getDashboardData } from '@/lib/training/service'
import { getSuggestedStarterDomains } from '@/lib/training/domains'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type DashboardPayload = Awaited<ReturnType<typeof getDashboardData>>

export default function DashboardPage() {
  const { t, locale, dir } = useLocale()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard')
      const payload = await response.json()

      if (!isMounted) {
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

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [t.common.error])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <div className="mb-8 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">{t.common.error}</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>{t.common.retry}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const organizationType = (data.organization?.organization_type ?? null) as OrganizationType | null
  const weakestCategory = formatCategoryLabel(data.stats.weakestCategory, locale, organizationType)
  const strongestCategory = formatCategoryLabel(data.stats.strongestCategory, locale, organizationType)
  const preferredDomains = data.trainingProfile.preferred_domains ?? []
  const starterDomains = getSuggestedStarterDomains(
    organizationType,
    data.organization?.industry ?? null,
  )
  const organizationProfile = getOrganizationSegmentProfile(
    organizationType,
    data.organization?.industry ?? null,
    locale,
  )
  const employeeGuidanceCopy =
    locale === 'he'
      ? {
          practiceExampleTitle: '\u05d3\u05d5\u05d2\u05de\u05d4 \u05dc\u05de\u05d4 \u05e9\u05ea\u05ea\u05e8\u05d2\u05dc\u05d5',
          practiceExampleDescription:
            '\u05d4\u05d3\u05d5\u05d2\u05de\u05d4 \u05d4\u05d6\u05d5 \u05de\u05ea\u05d0\u05d9\u05de\u05d4 \u05dc\u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05e9\u05d0\u05ea\u05dd \u05e2\u05e9\u05d5\u05d9\u05d9\u05dd \u05dc\u05e8\u05d0\u05d5\u05ea \u05d1\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d4\u05d9\u05d5\u05de\u05d9\u05d5\u05de\u05d9\u05ea.',
          aiDescriptionPrefix:
            '\u05d4\u05d4\u05de\u05dc\u05e6\u05d5\u05ea \u05de\u05ea\u05de\u05e7\u05d3\u05d5\u05ea \u05d1\u05de\u05e1\u05e8\u05d9\u05dd \u05e9\u05ea\u05d5\u05d0\u05de\u05d9\u05dd \u05dc\u05ea\u05e7\u05e9\u05d5\u05e8\u05ea \u05d4\u05d9\u05d5\u05de\u05d9\u05d5\u05de\u05d9\u05ea \u05e9\u05dc\u05db\u05dd.',
          noRecommendations:
            '\u05d4\u05de\u05dc\u05e6\u05d5\u05ea \u05d9\u05d5\u05e4\u05d9\u05e2\u05d5 \u05dc\u05d0\u05d7\u05e8 \u05db\u05de\u05d4 \u05e0\u05d9\u05e1\u05d9\u05d5\u05e0\u05d5\u05ea, \u05d5\u05d9\u05ea\u05de\u05e7\u05d3\u05d5 \u05d1\u05e1\u05d5\u05d2\u05d9 \u05d4\u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05e9\u05d4\u05db\u05d9 \u05e8\u05dc\u05d5\u05d5\u05e0\u05d8\u05d9\u05d9\u05dd \u05dc\u05ea\u05e4\u05e7\u05d9\u05d3 \u05e9\u05dc\u05db\u05dd.',
        }
      : {
          practiceExampleTitle: 'Example to practice first',
          practiceExampleDescription:
            'This example matches the kinds of messages you are likely to see in your day-to-day work.',
          aiDescriptionPrefix:
            'These recommendations stay focused on the message types that match your daily workflow.',
          noRecommendations:
            'Recommendations will appear after a few attempts and will stay tied to the kinds of messages most relevant to your role.',
        }
  const personalSummaryCopy =
    locale === 'he'
      ? {
          title: 'סיכום שיפור אישי מבוסס AI',
          description: 'מבט קצר על מה שאתם עושים טוב, איפה כדאי להתחזק, ואילו כללים יעזרו לכם בהחלטה הבאה.',
          strengths: 'מה הולך טוב',
          focusAreas: 'איפה להתמקד',
          rules: 'כללים שכדאי לזכור',
        }
      : {
          title: 'AI Personal Improvement Summary',
          description: 'A concise view of what you are doing well, where to focus next, and which rules to keep in mind.',
          strengths: 'What is going well',
          focusAreas: 'Where to focus',
          rules: 'Rules to remember',
        }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t.dashboard.welcome}, {data.profile.full_name || data.profile.email}
          </h1>
          <p className="mt-1 text-muted-foreground">{t.dashboard.overview}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/training">
            <Button>
              <Swords className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t.dashboard.startTraining}
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline">
              <BarChart3 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t.dashboard.viewReports}
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dashboard.stats.detectionRate}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
              <Shield className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.correctRate}%</div>
            <div className="mt-1 flex items-center text-sm text-muted-foreground">
              <TrendingUp className="ltr:mr-1 rtl:ml-1 h-4 w-4 text-success" />
              <span>
                {locale === 'he'
                  ? `פישינג ${data.stats.phishingDetectionRate}% | בטוח ${data.stats.legitDetectionRate}%`
                  : `Phishing ${data.stats.phishingDetectionRate}% | Safe ${data.stats.legitDetectionRate}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dashboard.stats.trainingSessions}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.totalAttempts}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {locale === 'he' ? `ציון כולל ${data.stats.totalScore}` : `Total score ${data.stats.totalScore}`}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dashboard.stats.currentStreak}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <Zap className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.stats.streakCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.dashboard.stats.days}</div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.dashboard.stats.weakestArea}
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{weakestCategory}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {locale === 'he' ? `חוזקה מובילה: ${strongestCategory}` : `Strongest area: ${strongestCategory}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.stats.totalAttempts === 0 ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'התחילו בסשן ראשון ממוקד' : 'Start with a focused first session'}</CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'בחרו תחומי אימון במסך האימון או הישארו במצב מעורב כדי לקבל גיוון מההתחלה.'
                : 'Choose training domains in the arena or stay on mixed mode for variety from the start.'}
            </CardDescription>
            <p className="text-sm text-muted-foreground">{organizationProfile.employeeHint}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              {preferredDomains.length
                ? locale === 'he'
                  ? `התחומים המועדפים שלך: ${formatDomainSummary(preferredDomains, locale, 3, organizationType)}`
                  : `Your preferred domains: ${formatDomainSummary(preferredDomains, locale, 3, organizationType)}`
                : locale === 'he'
                  ? `מומלץ להתחיל עם: ${formatDomainSummary(starterDomains, locale, 3, organizationType)}`
                  : `Suggested starter domains: ${formatDomainSummary(starterDomains, locale, 3, organizationType)}`}
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium">{employeeGuidanceCopy.practiceExampleTitle}</p>
                <p className="mt-2 text-sm text-foreground">{organizationProfile.focusTopics[0]}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {organizationProfile.employeeHint}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {employeeGuidanceCopy.practiceExampleDescription}
                </p>
              </div>
              <Link href="/training">
                <Button>
                  <Swords className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {t.dashboard.startTraining}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {personalSummaryCopy.title}
          </CardTitle>
          <CardDescription>{personalSummaryCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm leading-7 text-foreground">{data.aiSummary.summary}</p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {personalSummaryCopy.strengths}
            </h3>
            <div className="space-y-3">
              {data.aiSummary.strengths.map((strength, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  {strength}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {personalSummaryCopy.focusAreas}
            </h3>
            <div className="space-y-3">
              {data.aiSummary.focusAreas.map((item, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {personalSummaryCopy.rules}
            </h3>
            <div className="space-y-3">
              {data.aiSummary.practicalRules.map((rule, index) => (
                <div key={index} className="rounded-lg border border-border p-3 text-sm">
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.dashboard.recentActivity}</CardTitle>
            <CardDescription>
              {locale === 'he' ? 'הניסיונות האחרונים שלך במערכת' : 'Your latest attempts and learning activity'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', activity.isCorrect ? 'bg-success/10' : 'bg-destructive/10')}>
                      {activity.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{formatRelativeTimestamp(activity.createdAt, locale)}</p>
                    </div>
                    <div className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', activity.isCorrect ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                      {activity.isCorrect ? (locale === 'he' ? 'נכון' : 'Correct') : locale === 'he' ? 'שגוי' : 'Incorrect'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Swords className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-medium">{t.dashboard.noActivity}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.noActivityDesc}</p>
                <Link href="/training" className="mt-4">
                  <Button>
                    {t.dashboard.startTraining}
                    <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.dashboard.aiRecommendations}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{employeeGuidanceCopy.aiDescriptionPrefix}</p>
            <CardDescription>
              {locale === 'he' ? 'המלצות מותאמות אישית על בסיס הזיכרון והביצועים שלך' : 'Personalized guidance based on your memory profile and recent attempts'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recommendations.length > 0 ? (
              data.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border border-border p-4">
                  <h4 className="font-medium">{recommendation.recommendation_text}</h4>
                  {recommendation.reason ? (
                    <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {locale === 'he'
                  ? 'ההמלצות יתעדכנו לאחר שתשלימו כמה ניסיונות אימון.'
                  : 'Recommendations will appear after you complete a few training attempts.'}
              </div>
            )}

            <Link href="/training" className="block">
              <Button className="w-full" variant="outline">
                {t.dashboard.startTraining}
                <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
