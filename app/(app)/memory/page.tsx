'use client'

import { useEffect, useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, Target } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import {
  formatCategoryLabel,
  formatDomainSummary,
  formatRelativeTimestamp,
  formatWeaknessLabel,
} from '@/lib/presentation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MemoryPayload {
  bundle: {
    trainingProfile: {
      current_level: 'easy' | 'medium' | 'hard'
      preferred_domains: string[]
      total_attempts: number
    }
  }
  weaknesses: Array<{
    id: string
    weakness_key: string
    weakness_label: string
    score: number
    category: string | null
    last_seen_at: string
  }>
  memories: Array<{
    id: string
    memory_type: 'summary' | 'weakness' | 'pattern' | 'improvement'
    content: string
    importance_score: number
    related_category: string | null
    created_at: string
  }>
  recommendations: Array<{
    id: string
    recommendation_text: string
    reason: string | null
    priority: number
  }>
  recentAttempts: Array<{
    id: string
    is_correct: boolean
    created_at: string
    simulation: {
      category: string
      channel: 'email' | 'sms' | 'whatsapp'
      title: string | null
    } | null
  }>
}

export default function MemoryPage() {
  const { t, locale, dir } = useLocale()
  const [data, setData] = useState<MemoryPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const response = await fetch('/api/memory')
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
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full lg:col-span-2" />
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

  const topWeakness = data.weaknesses[0]

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.memory.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.memory.subtitle}</p>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'תמונת למידה' : 'Learning Snapshot'}</CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'מה המערכת זיהתה עד עכשיו לגבי קצב ומוקדי הלמידה שלך'
                : 'What the system has detected so far about your learning pace and focus'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{locale === 'he' ? 'תחומים מועדפים' : 'Preferred domains'}</span>
              <span className="font-medium">
                {formatDomainSummary(data.bundle.trainingProfile.preferred_domains, locale, 2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{locale === 'he' ? 'ניסיונות' : 'Attempts'}</span>
              <span className="font-medium">{data.bundle.trainingProfile.total_attempts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{locale === 'he' ? 'מוקד עליון' : 'Top focus'}</span>
              <span className="font-medium">
                {topWeakness
                  ? formatWeaknessLabel(topWeakness.weakness_key, topWeakness.weakness_label, locale)
                  : locale === 'he'
                    ? 'עדיין אין'
                    : 'No signal yet'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {t.memory.learningTimeline}
            </CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'מה המערכת זוכרת על דפוסי הלמידה שלך'
                : 'What the system is remembering about your learning patterns'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.memories.length ? (
              data.memories.map((memory) => (
                <div key={memory.id} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          memory.memory_type === 'improvement' && 'bg-success',
                          memory.memory_type === 'weakness' && 'bg-destructive',
                          memory.memory_type === 'pattern' && 'bg-warning',
                          memory.memory_type === 'summary' && 'bg-primary',
                        )}
                      />
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {memory.memory_type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTimestamp(memory.created_at, locale)}
                    </span>
                  </div>
                  <p className="text-sm">{memory.content}</p>
                  {memory.related_category ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatCategoryLabel(memory.related_category, locale)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t.memory.empty.description}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t.memory.weakAreas}
            </CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'האזורים שהמערכת מתעדפת כעת לחיזוק'
                : 'The areas the system is prioritizing for reinforcement'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.weaknesses.length ? (
              data.weaknesses.map((weakness) => (
                <div key={weakness.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {formatWeaknessLabel(weakness.weakness_key, weakness.weakness_label, locale)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCategoryLabel(weakness.category, locale)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{weakness.score}</span>
                  </div>
                  <Progress value={Math.min(weakness.score * 12, 100)} className="h-2" />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t.memory.empty.description}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              {t.memory.recommendation}
            </CardTitle>
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
              <p className="text-sm text-muted-foreground">{t.memory.empty.description}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.memory.mistakes}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentAttempts.length ? (
              data.recentAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {attempt.simulation?.title ||
                        formatCategoryLabel(attempt.simulation?.category, locale)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatRelativeTimestamp(attempt.created_at, locale)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      attempt.is_correct
                        ? 'bg-success/10 text-success'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {attempt.is_correct
                      ? locale === 'he'
                        ? 'נכון'
                        : 'Correct'
                      : locale === 'he'
                        ? 'שגוי'
                        : 'Incorrect'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t.memory.empty.description}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
