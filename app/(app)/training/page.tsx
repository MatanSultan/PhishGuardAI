'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Mail,
  Smartphone,
  MessageSquare,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Send,
  SkipForward,
} from 'lucide-react'

import {
  SIMULATION_CATEGORIES,
  type OrganizationType,
  type SimulationCategory,
} from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { getOrganizationExperienceProfile } from '@/lib/organizations/experience'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatDifficultyLabel,
  formatDomainSummary,
  splitSender,
  normalizeSimulationContent,
} from '@/lib/presentation'
import type { getNextTrainingSimulation, submitTrainingAttempt } from '@/lib/training/service'
import { getSuggestedStarterDomains } from '@/lib/training/domains'
import { DomainSelector } from '@/components/domain-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type NextTrainingPayload = Awaited<ReturnType<typeof getNextTrainingSimulation>>
type SubmitAttemptPayload = Awaited<ReturnType<typeof submitTrainingAttempt>>
type Channel = 'email' | 'sms' | 'whatsapp'
type SimulationState = 'active' | 'answered' | 'explained'

const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, { he: string; en: string }> = {
  nursing_home: { he: 'בית אבות', en: 'Nursing home' },
  education: { he: 'חינוך', en: 'Education' },
  nonprofit: { he: 'עמותה', en: 'Nonprofit' },
  municipality: { he: 'רשות מקומית', en: 'Municipality' },
  smb: { he: 'עסק קטן', en: 'SMB' },
  other: { he: 'אחר', en: 'Other' },
}

interface ProfilePayload {
  trainingProfile?: {
    preferred_domains?: SimulationCategory[]
  }
  organization?: {
    organization_type: OrganizationType
    industry: string | null
  } | null
}

export default function TrainingPage() {
  const { t, locale, dir } = useLocale()
  const [activeChannel, setActiveChannel] = useState<Channel>('email')
  const [selectedDomains, setSelectedDomains] = useState<SimulationCategory[]>([])
  const [simulationState, setSimulationState] = useState<SimulationState>('active')
  const [selectedAnswer, setSelectedAnswer] = useState<'phishing' | 'safe' | null>(null)
  const [confidence, setConfidence] = useState<number>(1)
  const [reasoning, setReasoning] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(120)
  const [startedAt, setStartedAt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDomains, setIsSavingDomains] = useState(false)
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionProgress, setSessionProgress] = useState({ completed: 0, accuracy: 0 })
  const [trainingData, setTrainingData] = useState<NextTrainingPayload | null>(null)
  const [resultData, setResultData] = useState<SubmitAttemptPayload['result'] | null>(null)
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(null)
  const [organizationIndustry, setOrganizationIndustry] = useState<string | null>(null)

  const loadSimulation = useCallback(async (channel: Channel, domains: SimulationCategory[] = []) => {
    setIsLoading(true)
    setError(null)

    const response = await fetch('/api/training/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, preferredDomains: domains }),
    })

    const payload = await response.json()

    if (!response.ok) {
      setError(payload.error ?? t.common.error)
      setIsLoading(false)
      return
    }

    setTrainingData(payload)
    setResultData(null)
    setSimulationState('active')
    setSelectedAnswer(null)
    setConfidence(1)
    setReasoning('')
    setTimeRemaining(120)
    setStartedAt(Date.now())
    setIsLoading(false)
  }, [t.common.error])

  useEffect(() => {
    let active = true

    const loadPreferences = async () => {
      const response = await fetch('/api/profile')
      const payload = (await response.json().catch(() => null)) as ProfilePayload | null

      if (!active) {
        return
      }

      if (response.ok) {
        const orgType = payload?.organization?.organization_type ?? null
        const orgIndustry = payload?.organization?.industry ?? null
        const preferredDomains = payload?.trainingProfile?.preferred_domains ?? []

        setOrganizationType(orgType)
        setOrganizationIndustry(orgIndustry)
        setSelectedDomains(
          preferredDomains.length
            ? preferredDomains
            : getSuggestedStarterDomains(orgType, orgIndustry),
        )
      }

      setPreferencesReady(true)
    }

    void loadPreferences()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!preferencesReady) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void loadSimulation(activeChannel, selectedDomains)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [activeChannel, loadSimulation, preferencesReady, selectedDomains])

  useEffect(() => {
    if (simulationState !== 'active') {
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((previous) => (previous > 0 ? previous - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [simulationState, trainingData?.simulation.id])

  const currentSimulation = trainingData?.simulation ?? null
  const parsedSender = splitSender(currentSimulation?.sender)
  const formattedContent = useMemo(
    () => normalizeSimulationContent(currentSimulation?.content),
    [currentSimulation?.content],
  )
  const redFlags = useMemo(() => {
    if (!currentSimulation || !Array.isArray(currentSimulation.red_flags)) {
      return []
    }

    return currentSimulation.red_flags.filter((item): item is string => typeof item === 'string')
  }, [currentSimulation])

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentSimulation) {
      return
    }

    setIsSubmitting(true)
    const response = await fetch('/api/training/attempt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulationId: currentSimulation.id,
        userAnswer: selectedAnswer === 'phishing',
        confidence,
        userReason: reasoning,
        responseTimeMs: Date.now() - startedAt,
      }),
    })

    const payload = await response.json()
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload.error ?? t.common.error)
      return
    }

    setResultData(payload.result)
    setSimulationState('answered')
    setSessionProgress((previous) => {
      const completed = previous.completed + 1
      const correctCount =
        Math.round((previous.accuracy / 100) * previous.completed) + (payload.result.isCorrect ? 1 : 0)

      return {
        completed,
        accuracy: Math.round((correctCount / completed) * 100),
      }
    })
  }

  const handleShowExplanation = () => {
    setSimulationState('explained')
  }

  const handleNextSimulation = async () => {
    await loadSimulation(activeChannel, selectedDomains)
  }

  const persistDomainSelection = async (domains: SimulationCategory[]) => {
    setIsSavingDomains(true)

    try {
      const response = await fetch('/api/profile/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domains }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? t.common.error)
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : locale === 'he'
            ? 'לא הצלחנו לשמור את תחומי האימון.'
            : 'We could not save the training domains.',
      )
    } finally {
      setIsSavingDomains(false)
    }
  }

  const handleDomainsChange = (domains: SimulationCategory[]) => {
    setSelectedDomains(domains)
    void persistDomainSelection(domains)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const channels = [
    { id: 'email' as const, label: t.training.channels.email, icon: Mail },
    { id: 'sms' as const, label: t.training.channels.sms, icon: Smartphone },
    { id: 'whatsapp' as const, label: t.training.channels.whatsapp, icon: MessageSquare },
  ]
  const isFirstTimeUser = (trainingData?.context.trainingProfile.total_attempts ?? 0) === 0
  const starterDomains = getSuggestedStarterDomains(organizationType, organizationIndustry)
  const organizationProfile = organizationType
    ? getOrganizationSegmentProfile(organizationType, organizationIndustry, locale)
    : null
  const organizationExperience = getOrganizationExperienceProfile(organizationType, locale)

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.training.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.training.subtitle}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => setActiveChannel(channel.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
              activeChannel === channel.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            <channel.icon className="h-4 w-4" />
            {channel.label}
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {locale === 'he' ? 'תחומי אימון' : 'Training Domains'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {locale === 'he'
              ? 'בחרו תחום אחד או יותר. מצב מעורב ישמור על גיוון בין תרחישים.'
              : 'Choose one or more domains. Mixed mode keeps the scenarios varied.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <DomainSelector
            locale={locale}
            availableDomains={[...SIMULATION_CATEGORIES]}
            selectedDomains={selectedDomains}
            onChange={handleDomainsChange}
            organizationType={organizationType}
            disabled={isLoading || isSavingDomains}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {locale === 'he'
                ? `הבחירה הנוכחית: ${formatDomainSummary(selectedDomains, locale, 3, organizationType)}`
                : `Current selection: ${formatDomainSummary(selectedDomains, locale, 3, organizationType)}`}
            </span>
            {isSavingDomains ? (
              <span>{locale === 'he' ? 'שומרים העדפה...' : 'Saving preference...'}</span>
            ) : null}
          </div>
          {isFirstTimeUser ? (
            <div className="rounded-lg border border-dashed border-border p-4">
              <p className="font-medium">
                {locale === 'he'
                  ? 'התחילו עם התרחישים שהכי רלוונטיים לארגון שלכם'
                  : 'Start with the scenarios your organization is most likely to see'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {organizationProfile?.employeeHint ??
                  (locale === 'he'
                    ? 'משלוחים, אבטחת חשבון ובנקאות חושפים מהר את הדפוסים הנפוצים ביותר.'
                    : 'Delivery, account security, and banking expose the most useful early patterns.')}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {organizationExperience.scenarioExamples.slice(0, 2).map((example) => (
                  <div key={example} className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                    {example}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {organizationExperience.noSecurityTeamHint}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {starterDomains.map((domain) => (
                  <Button
                    key={domain}
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDomainsChange([domain])}
                  >
                    {formatCategoryLabel(domain, locale, organizationType)}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDomainsChange([...starterDomains])}
                >
                  {locale === 'he' ? 'השתמשו בכל ההמלצות' : 'Use all suggestions'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.training.progress.completed}:</span>
          <span className="font-semibold">{sessionProgress.completed}</span>
        </div>
        <div className="flex-1">
          <Progress value={Math.min(sessionProgress.completed * 20, 100)} className="h-2" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.training.progress.accuracy}:</span>
          <span className="font-semibold">{sessionProgress.accuracy}%</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className={cn('font-mono text-sm', timeRemaining < 30 && 'text-destructive')}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {error ? (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void loadSimulation(activeChannel, selectedDomains)}>
              {t.common.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {isLoading || !currentSimulation ? (
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            ) : (
              <>
                {currentSimulation.channel === 'email' ? (
                  <div className="border-b border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t.training.simulation.from}:</span>
                          <span className="font-medium">{parsedSender.name || parsedSender.address}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t.training.simulation.subject}:</span>
                          <span className="font-medium">
                            {currentSimulation.title || formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                          </span>
                        </div>
                        {parsedSender.address ? (
                          <div className="mt-1 text-sm text-muted-foreground">{parsedSender.address}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {currentSimulation.channel === 'sms' ? (
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {currentSimulation.sender || formatChannelLabel(currentSimulation.channel, locale)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {formatChannelLabel(currentSimulation.channel as Channel, locale)}
                    </span>
                    <span className="rounded-full border border-border/70 px-3 py-1">
                      {formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                    </span>
                    {organizationType ? (
                      <span className="rounded-full border border-border/70 px-3 py-1">
                        {ORGANIZATION_TYPE_LABELS[organizationType][locale === 'he' ? 'he' : 'en']}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'whitespace-pre-wrap text-sm leading-relaxed break-words',
                      currentSimulation.channel !== 'email' && 'rounded-lg bg-muted p-4',
                    )}
                    dir={currentSimulation.language === 'he' ? 'rtl' : 'ltr'}
                  >
                    {formattedContent}
                  </div>
                </CardContent>

                {simulationState === 'active' ? (
                  <div className="border-t border-border bg-muted/30 p-6">
                    <div className="space-y-6">
                      <div>
                        <p className="mb-3 text-sm font-medium">
                          {locale === 'he' ? 'מהי התשובה שלך?' : 'What is your answer?'}
                        </p>
                        <div className="flex gap-3">
                          <Button
                            variant={selectedAnswer === 'phishing' ? 'default' : 'outline'}
                            className={cn(
                              'flex-1',
                              selectedAnswer === 'phishing' && 'bg-destructive hover:bg-destructive/90',
                            )}
                            onClick={() => setSelectedAnswer('phishing')}
                          >
                            <AlertTriangle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                            {t.training.simulation.isPhishing}
                          </Button>
                          <Button
                            variant={selectedAnswer === 'safe' ? 'default' : 'outline'}
                            className={cn(
                              'flex-1',
                              selectedAnswer === 'safe' &&
                                'bg-success text-success-foreground hover:bg-success/90',
                            )}
                            onClick={() => setSelectedAnswer('safe')}
                          >
                            <Shield className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                            {t.training.simulation.isSafe}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-medium">{t.training.simulation.confidence}</p>
                        <div className="flex gap-2">
                          {t.training.simulation.confidenceLevels.map((level, index) => (
                            <button
                              key={index}
                              onClick={() => setConfidence(index)}
                              className={cn(
                                'flex-1 rounded-lg border px-3 py-2 text-sm transition-all',
                                confidence === index
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/50',
                              )}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium">{t.training.simulation.whyOptional}</p>
                        <Textarea
                          value={reasoning}
                          onChange={(event) => setReasoning(event.target.value)}
                          placeholder={locale === 'he' ? 'הסבירו את הסיבות שלכם...' : 'Explain your reasoning...'}
                          className="h-20 resize-none"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={handleSubmit}
                          disabled={!selectedAnswer || isSubmitting}
                          className="flex-1"
                        >
                          <Send className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          {isSubmitting ? t.common.loading : t.training.simulation.submit}
                        </Button>
                        <Button variant="ghost" onClick={() => void handleNextSimulation()}>
                          <SkipForward className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          {t.training.simulation.skip}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {simulationState === 'answered' && resultData ? (
                  <div className="border-t border-border p-6">
                    <div
                      className={cn(
                        'flex items-center gap-4 rounded-lg p-4',
                        resultData.isCorrect ? 'bg-success/10' : 'bg-destructive/10',
                      )}
                    >
                      {resultData.isCorrect ? (
                        <CheckCircle className="h-8 w-8 text-success" />
                      ) : (
                        <XCircle className="h-8 w-8 text-destructive" />
                      )}
                      <div>
                        <h3
                          className={cn(
                            'text-lg font-semibold',
                            resultData.isCorrect ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {resultData.isCorrect ? t.training.result.correct : t.training.result.incorrect}
                        </h3>
                        <p className="text-sm text-muted-foreground">{resultData.feedback.shortRule}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button onClick={handleShowExplanation} className="flex-1">
                        <Sparkles className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                        {t.training.result.explanation}
                      </Button>
                      <Button variant="outline" onClick={() => void handleNextSimulation()}>
                        {t.training.result.nextSimulation}
                        <ChevronRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {simulationState === 'explained' && resultData ? (
                  <div className="space-y-6 border-t border-border p-6">
                    <div
                      className={cn(
                        'flex items-center gap-4 rounded-lg p-4',
                        resultData.isCorrect ? 'bg-success/10' : 'bg-destructive/10',
                      )}
                    >
                      {resultData.isCorrect ? (
                        <CheckCircle className="h-8 w-8 text-success" />
                      ) : (
                        <XCircle className="h-8 w-8 text-destructive" />
                      )}
                      <div>
                        <h3
                          className={cn(
                            'text-lg font-semibold',
                            resultData.isCorrect ? 'text-success' : 'text-destructive',
                          )}
                        >
                          {resultData.isCorrect ? t.training.result.correct : t.training.result.incorrect}
                        </h3>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {t.training.result.explanation}
                      </h4>
                      <div className="space-y-3 rounded-lg bg-muted p-4 text-sm leading-relaxed">
                        <p>{resultData.feedback.feedback}</p>
                        <p className="font-medium text-primary">{resultData.feedback.recommendedFocus}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        {t.training.result.redFlags}
                      </h4>
                      <ul className="space-y-2">
                        {redFlags.map((flag, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 rounded-lg border border-border p-3"
                          >
                            <div
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                                currentSimulation.is_phishing ? 'bg-destructive/10' : 'bg-success/10',
                              )}
                            >
                              {currentSimulation.is_phishing ? (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              ) : (
                                <CheckCircle className="h-3 w-3 text-success" />
                              )}
                            </div>
                            <span className="text-sm">{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-border p-4">
                      <p className="font-medium">{resultData.recommendation.recommendationText}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{resultData.recommendation.reason}</p>
                    </div>

                    <Button onClick={() => void handleNextSimulation()} className="w-full">
                      {t.training.result.nextSimulation}
                      <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === 'he' ? 'סטטיסטיקות מהירות' : 'Quick Stats'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {locale === 'he' ? 'סך הניסיונות' : 'Total Attempts'}
                </span>
                <span className="font-semibold">
                  {trainingData?.context.trainingProfile.total_attempts ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {locale === 'he' ? 'רמה נוכחית' : 'Current Level'}
                </span>
                <span className="font-semibold">
                  {trainingData
                    ? formatDifficultyLabel(trainingData.context.trainingProfile.current_level, locale)
                    : formatDifficultyLabel('easy', locale)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {locale === 'he' ? 'תחום מיקוד' : 'Focus Domain'}
                </span>
                <span className="font-semibold">
                  {trainingData ? formatCategoryLabel(trainingData.context.selection.category, locale, organizationType) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {locale === 'he' ? 'תמהיל תחומים' : 'Domain Mix'}
                </span>
                <span className="text-right font-semibold">
                  {formatDomainSummary(selectedDomains, locale, 2, organizationType)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {locale === 'he' ? 'מיקוד חכם' : 'Adaptive Focus'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {trainingData?.context.selection.reasons?.length ? (
                trainingData.context.selection.reasons.map((reason, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{reason}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {locale === 'he'
                      ? 'המערכת תתאים את המיקוד אחרי כמה ניסיונות.'
                      : 'The system will adapt focus after a few attempts.'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
