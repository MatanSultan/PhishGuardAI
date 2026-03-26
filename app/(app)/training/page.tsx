'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Shield,
  SkipForward,
  Smartphone,
  Sparkles,
  XCircle,
} from 'lucide-react'

import type { OrganizationType } from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { getOrganizationExperienceProfile } from '@/lib/organizations/experience'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatDifficultyLabel,
  formatDomainSummary,
  normalizeSimulationContent,
  splitSender,
} from '@/lib/presentation'
import type { getNextTrainingSimulation, submitTrainingAttempt } from '@/lib/training/service'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type NextTrainingPayload = Awaited<ReturnType<typeof getNextTrainingSimulation>>
type SubmitAttemptPayload = Awaited<ReturnType<typeof submitTrainingAttempt>>
type Channel = 'email' | 'sms' | 'whatsapp'
type SimulationState = 'ready' | 'active' | 'answered' | 'explained'

const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, { he: string; en: string }> = {
  nursing_home: { he: 'בית אבות', en: 'Nursing home' },
  education: { he: 'חינוך', en: 'Education' },
  nonprofit: { he: 'עמותה', en: 'Nonprofit' },
  municipality: { he: 'רשות מקומית', en: 'Municipality' },
  smb: { he: 'עסק קטן', en: 'SMB' },
  other: { he: 'ארגון', en: 'Organization' },
}

interface ProfilePayload {
  organization?: {
    organization_type: OrganizationType
    industry: string | null
  } | null
}

function getChannelIcon(channel: Channel) {
  if (channel === 'email') {
    return Mail
  }

  if (channel === 'sms') {
    return Smartphone
  }

  return MessageSquare
}

function getChannelTone(channel: Channel) {
  if (channel === 'email') {
    return 'bg-primary/10 text-primary'
  }

  if (channel === 'sms') {
    return 'bg-sky-500/10 text-sky-700'
  }

  return 'bg-emerald-500/10 text-emerald-700'
}

export default function TrainingPage() {
  const { t, locale, dir } = useLocale()
  const [simulationState, setSimulationState] = useState<SimulationState>('ready')
  const [selectedAnswer, setSelectedAnswer] = useState<'phishing' | 'safe' | null>(null)
  const [confidence, setConfidence] = useState<number>(1)
  const [reasoning, setReasoning] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(120)
  const [startedAt, setStartedAt] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contextReady, setContextReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionProgress, setSessionProgress] = useState({ completed: 0, accuracy: 0 })
  const [trainingData, setTrainingData] = useState<NextTrainingPayload | null>(null)
  const [resultData, setResultData] = useState<SubmitAttemptPayload['result'] | null>(null)
  const [organizationType, setOrganizationType] = useState<OrganizationType | null>(null)
  const [organizationIndustry, setOrganizationIndustry] = useState<string | null>(null)

  const loadSimulation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const response = await fetch('/api/training/next', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locale }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setError(payload?.error ?? t.common.error)
      setIsLoading(false)
      return
    }

    setTrainingData(payload)
    setResultData(null)
    setSimulationState('ready')
    setSelectedAnswer(null)
    setConfidence(1)
    setReasoning('')
    setTimeRemaining(120)
    setStartedAt(0)
    setIsLoading(false)
  }, [locale, t.common.error])

  useEffect(() => {
    let active = true

    const loadProfileContext = async () => {
      const response = await fetch('/api/profile')
      const payload = (await response.json().catch(() => null)) as ProfilePayload | null

      if (!active) {
        return
      }

      if (response.ok) {
        setOrganizationType(payload?.organization?.organization_type ?? null)
        setOrganizationIndustry(payload?.organization?.industry ?? null)
      }

      setContextReady(true)
    }

    void loadProfileContext()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!contextReady) {
      return
    }

    void loadSimulation()
  }, [contextReady, loadSimulation])

  useEffect(() => {
    if (simulationState !== 'active' || !trainingData?.simulation.id) {
      return
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((previous) => (previous > 0 ? previous - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
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

  const handleStartSimulation = () => {
    setStartedAt(Date.now())
    setSimulationState('active')
  }

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
        responseTimeMs: startedAt ? Date.now() - startedAt : null,
      }),
    })

    const payload = await response.json().catch(() => null)
    setIsSubmitting(false)

    if (!response.ok) {
      setError(payload?.error ?? t.common.error)
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
    await loadSimulation()
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const organizationProfile = organizationType
    ? getOrganizationSegmentProfile(organizationType, organizationIndustry, locale)
    : null
  const organizationExperience = getOrganizationExperienceProfile(organizationType, locale)
  const channelIcon = currentSimulation ? getChannelIcon(currentSimulation.channel as Channel) : Mail
  const assignmentDomains = trainingData?.context.selection.selectedDomains ?? []
  const assignmentReasons = trainingData?.context.selection.reasons?.slice(0, 3) ?? []
  const stateBadge =
    simulationState === 'ready'
      ? locale === 'he'
        ? 'מוכן להתחלה'
        : 'Ready to start'
      : simulationState === 'active'
        ? locale === 'he'
          ? 'בתהליך'
          : 'In progress'
        : simulationState === 'answered'
          ? locale === 'he'
            ? 'תשובה התקבלה'
            : 'Answer submitted'
          : locale === 'he'
            ? 'הסבר פתוח'
            : 'Explanation open'
  const stateSummary =
    simulationState === 'ready'
      ? locale === 'he'
        ? 'התרחיש כבר נבחר עבורך. נשאר רק להתחיל.'
        : 'Your next scenario is already prepared. You only need to begin.'
      : simulationState === 'active'
        ? locale === 'he'
          ? 'קראו את ההודעה, החליטו אם היא חשודה או תקינה, ושלחו תשובה.'
          : 'Read the message, decide if it is suspicious or safe, and submit your answer.'
        : simulationState === 'answered'
          ? locale === 'he'
            ? 'התשובה נקלטה. אפשר לפתוח הסבר קצר או לעבור לתרחיש הבא.'
            : 'Your answer was received. Open the explanation or move to the next drill.'
          : locale === 'he'
            ? 'הנה ההסבר, הסימנים החשובים, ומה כדאי לחזק בהמשך.'
            : 'Here is the explanation, the key signs, and what to reinforce next.'

  const signalsTitle =
    currentSimulation?.is_phishing === false
      ? locale === 'he'
        ? 'סימנים שמעידים שההודעה תקינה'
        : 'Signals that make this message legitimate'
      : locale === 'he'
        ? 'סימנים שצריך לשים לב אליהם'
        : 'Signals to notice'

  const pageCopy =
    locale === 'he'
      ? {
          title: 'אימון זיהוי הודעות',
          subtitle:
            'המערכת מכינה עבורך בכל פעם תרחיש רלוונטי. קוראים, מחליטים, ומקבלים מיד הסבר קצר וברור.',
          preparedTitle: 'התרחיש הבא מוכן',
          preparedDescription:
            'נבחר אוטומטית לפי ההקשר הארגוני, האימונים הקודמים והדפוסים שכדאי לחזק.',
          preparedBadge: 'הוקצה אוטומטית',
          start: 'התחלת הסימולציה',
          swap: 'תרחיש אחר',
          answerTitle: 'מה ההחלטה שלך?',
          answerDescription:
            'התייחסו להודעה כמו בחיים האמיתיים ובחרו את התשובה שנראית לכם נכונה.',
          phishingHint: 'יש כאן סימנים מחשידים או בקשה חריגה.',
          safeHint: 'זו נראית כמו הודעה תקינה בלי לחץ או בקשה מסוכנת.',
          whyTitle: 'אם תרצה/י, כתוב/כתבי בקצרה למה בחרת כך',
          whyPlaceholder: 'למשל: יש לחץ זמן, קישור לא מוכר, או שזה נראה כמו הודעה שגרתית.',
          sessionTitle: 'מצב האימון',
          sessionDescription: 'פחות הגדרות. יותר תרגול ברור ומהיר.',
          progressCompleted: 'סימולציות שהושלמו',
          progressAccuracy: 'דיוק במפגש',
          currentLevel: 'רמה נוכחית',
          autoMix: 'תמהיל אוטומטי',
          chosenChannel: 'הערוץ שנבחר',
          focusTitle: 'למה קיבלתם את התרחיש הזה',
          focusDescription: 'בחירה אוטומטית, אבל לא אקראית לגמרי.',
          orgTitle: 'רלוונטי לארגון שלכם',
          orgDescription: 'דוגמאות לסוגי מצבים שהמערכת תשלב לאורך האימונים.',
          steps: [
            'קוראים את ההודעה כמו בסיטואציה אמיתית.',
            'מחליטים אם זו התחזות או הודעה תקינה.',
            'מקבלים הסבר קצר והמלצה לתרגול הבא.',
          ],
          timer: 'זמן לתגובה',
          explanation: 'הצג הסבר',
          nextSimulation: 'לתרחיש הבא',
          preparedForYou: 'הוכן במיוחד עבורך',
          noReasonYet: 'אחרי כמה תרגולים המערכת תדייק עוד יותר את הבחירה האוטומטית.',
          messageTitle: 'הודעה לבדיקה',
          autoMixFallback: 'התמהיל ייבנה אוטומטית תוך כדי האימונים.',
        }
      : {
          title: 'Message Detection Training',
          subtitle:
            'Each drill is prepared for you automatically. Read it, decide, and get a short clear explanation right away.',
          preparedTitle: 'Your next scenario is ready',
          preparedDescription:
            'It was selected automatically using organization context, recent training, and the patterns that still need reinforcement.',
          preparedBadge: 'Automatically assigned',
          start: 'Start simulation',
          swap: 'Another scenario',
          answerTitle: 'What is your decision?',
          answerDescription:
            'Treat the message like a real situation and choose the answer that fits best.',
          phishingHint: 'There are suspicious signals or an unusual request here.',
          safeHint: 'This looks like a normal message without pressure or risky requests.',
          whyTitle: 'If helpful, briefly explain why you chose that answer',
          whyPlaceholder: 'For example: urgency, an unfamiliar link, or a routine-looking message.',
          sessionTitle: 'Session status',
          sessionDescription: 'Less setup. Faster, clearer practice.',
          progressCompleted: 'Completed drills',
          progressAccuracy: 'Session accuracy',
          currentLevel: 'Current level',
          autoMix: 'Automatic mix',
          chosenChannel: 'Selected channel',
          focusTitle: 'Why this scenario was assigned',
          focusDescription: 'Automatic does not mean random without context.',
          orgTitle: 'Relevant to your organization',
          orgDescription: 'Examples of situations the system can rotate through over time.',
          steps: [
            'Read the message as if it arrived in real life.',
            'Decide whether it is phishing or legitimate.',
            'Review the explanation and move to the next drill.',
          ],
          timer: 'Response timer',
          explanation: 'See explanation',
          nextSimulation: 'Next scenario',
          preparedForYou: 'Prepared for you',
          noReasonYet: 'After a few drills, the system will sharpen automatic assignment even more.',
          messageTitle: 'Message to review',
          autoMixFallback: 'The mix will build itself automatically as you train.',
        }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-background/95 p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{pageCopy.title}</h1>
              <p className="mt-2 text-muted-foreground">{pageCopy.subtitle}</p>
            </div>

            <Card className="w-full max-w-md border-primary/25 bg-primary/5 shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">{pageCopy.preparedForYou}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentSimulation
                        ? pageCopy.preparedDescription
                        : locale === 'he'
                          ? 'אנחנו מכינים עבורך את התרחיש הבא.'
                          : 'We are preparing your next scenario.'}
                    </p>
                  </div>
                  <Badge variant="secondary">{stateBadge}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentSimulation ? (
                    <>
                      <Badge variant="outline">
                        {formatChannelLabel(currentSimulation.channel as Channel, locale)}
                      </Badge>
                      <Badge variant="outline">
                        {formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                      </Badge>
                      <Badge variant="outline">
                        {formatDifficultyLabel(currentSimulation.difficulty, locale)}
                      </Badge>
                      {organizationType ? (
                        <Badge variant="outline">
                          {ORGANIZATION_TYPE_LABELS[organizationType][locale === 'he' ? 'he' : 'en']}
                        </Badge>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                  {stateSummary}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button variant="outline" onClick={() => void loadSimulation()}>
                {t.common.retry}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-border/60">
              {isLoading || !currentSimulation ? (
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              ) : (
                <>
                  {currentSimulation.channel === 'email' ? (
                    <div className="border-b border-border bg-muted/30 p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{pageCopy.messageTitle}</Badge>
                        <Badge variant="outline">
                          {formatChannelLabel(currentSimulation.channel as Channel, locale)}
                        </Badge>
                        <Badge variant="outline">
                          {formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{t.training.simulation.from}:</span>
                          <span className="font-medium">{parsedSender.name || parsedSender.address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{t.training.simulation.subject}:</span>
                          <span className="font-medium">
                            {currentSimulation.title ||
                              formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                          </span>
                        </div>
                        {parsedSender.address ? (
                          <div className="text-sm text-muted-foreground">{parsedSender.address}</div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="border-b border-border bg-muted/30 p-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl',
                            getChannelTone(currentSimulation.channel as Channel),
                          )}
                        >
                          {(() => {
                            const Icon = channelIcon
                            return <Icon className="h-5 w-5" />
                          })()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {currentSimulation.sender ||
                              formatChannelLabel(currentSimulation.channel as Channel, locale)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatChannelLabel(currentSimulation.channel as Channel, locale)} •{' '}
                            {formatCategoryLabel(currentSimulation.category, locale, organizationType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/70 px-3 py-1">
                        {formatDifficultyLabel(currentSimulation.difficulty, locale)}
                      </span>
                      {organizationType ? (
                        <span className="rounded-full border border-border/70 px-3 py-1">
                          {ORGANIZATION_TYPE_LABELS[organizationType][locale === 'he' ? 'he' : 'en']}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        'whitespace-pre-wrap rounded-2xl text-sm leading-7 break-words',
                        currentSimulation.channel === 'email'
                          ? 'bg-background'
                          : 'border border-border/60 bg-muted/40 p-5',
                      )}
                      dir={currentSimulation.language === 'he' ? 'rtl' : 'ltr'}
                    >
                      {formattedContent}
                    </div>
                  </CardContent>

                  {simulationState === 'ready' ? (
                    <div className="border-t border-border bg-primary/5 p-6">
                      <div className="rounded-2xl border border-primary/20 bg-background/90 p-5">
                        <div className="flex flex-col gap-5">
                          <div>
                            <p className="text-sm font-semibold text-primary">{pageCopy.preparedBadge}</p>
                            <h2 className="mt-1 text-lg font-semibold">{pageCopy.preparedTitle}</h2>
                            <p className="mt-2 text-sm text-muted-foreground">{pageCopy.preparedDescription}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            {pageCopy.steps.map((step, index) => (
                              <div key={step} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {locale === 'he' ? `שלב ${index + 1}` : `Step ${index + 1}`}
                                </p>
                                <p className="text-sm">{step}</p>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button className="sm:flex-1" onClick={handleStartSimulation}>
                              {pageCopy.start}
                              <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                            </Button>
                            <Button variant="outline" onClick={() => void handleNextSimulation()}>
                              <SkipForward className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                              {pageCopy.swap}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {simulationState === 'active' ? (
                    <div className="border-t border-border bg-muted/20 p-6">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-base font-semibold">{pageCopy.answerTitle}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{pageCopy.answerDescription}</p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAnswer('phishing')}
                            className={cn(
                              'rounded-2xl border p-4 text-start transition',
                              selectedAnswer === 'phishing'
                                ? 'border-destructive bg-destructive/5'
                                : 'border-border/60 hover:border-destructive/40 hover:bg-destructive/5',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              {t.training.simulation.isPhishing}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{pageCopy.phishingHint}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAnswer('safe')}
                            className={cn(
                              'rounded-2xl border p-4 text-start transition',
                              selectedAnswer === 'safe'
                                ? 'border-success bg-success/5'
                                : 'border-border/60 hover:border-success/40 hover:bg-success/5',
                            )}
                          >
                            <div className="flex items-center gap-2 font-semibold text-success">
                              <Shield className="h-4 w-4" />
                              {t.training.simulation.isSafe}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{pageCopy.safeHint}</p>
                          </button>
                        </div>

                        <div>
                          <p className="mb-3 text-sm font-medium">{t.training.simulation.confidence}</p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {t.training.simulation.confidenceLevels.map((level, index) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setConfidence(index)}
                                className={cn(
                                  'rounded-xl border px-3 py-2 text-sm transition',
                                  confidence === index
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border/60 hover:border-primary/40',
                                )}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-medium">{pageCopy.whyTitle}</p>
                          <Textarea
                            value={reasoning}
                            onChange={(event) => setReasoning(event.target.value)}
                            placeholder={pageCopy.whyPlaceholder}
                            className="min-h-24 resize-none"
                          />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button onClick={handleSubmit} disabled={!selectedAnswer || isSubmitting} className="sm:flex-1">
                            <Send className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                            {isSubmitting ? t.common.loading : t.training.simulation.submit}
                          </Button>
                          <Button variant="outline" onClick={() => void handleNextSimulation()}>
                            <SkipForward className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                            {pageCopy.swap}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {simulationState === 'answered' && resultData ? (
                    <div className="border-t border-border p-6">
                      <div
                        className={cn(
                          'flex items-center gap-4 rounded-2xl p-4',
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
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Button onClick={handleShowExplanation} className="sm:flex-1">
                          <Sparkles className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                          {pageCopy.explanation}
                        </Button>
                        <Button variant="outline" onClick={() => void handleNextSimulation()}>
                          {pageCopy.nextSimulation}
                          <ChevronRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {simulationState === 'explained' && resultData ? (
                    <div className="space-y-6 border-t border-border p-6">
                      <div
                        className={cn(
                          'flex items-center gap-4 rounded-2xl p-4',
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

                      <div>
                        <h4 className="mb-3 flex items-center gap-2 font-semibold">
                          <Sparkles className="h-5 w-5 text-primary" />
                          {pageCopy.explanation}
                        </h4>
                        <div className="space-y-3 rounded-2xl bg-muted/40 p-4 text-sm leading-relaxed">
                          <p>{resultData.feedback.feedback}</p>
                          <p className="font-medium text-primary">{resultData.feedback.recommendedFocus}</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-3 flex items-center gap-2 font-semibold">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          {signalsTitle}
                        </h4>
                        <ul className="space-y-2">
                          {redFlags.map((flag, index) => (
                            <li key={index} className="flex items-start gap-3 rounded-2xl border border-border/60 p-3">
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

                      <div className="rounded-2xl border border-border/60 bg-background p-4">
                        <p className="font-medium">{resultData.recommendation.recommendationText}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{resultData.recommendation.reason}</p>
                      </div>

                      <Button onClick={() => void handleNextSimulation()} className="w-full">
                        {pageCopy.nextSimulation}
                        <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">{pageCopy.sessionTitle}</CardTitle>
                <CardDescription>{pageCopy.sessionDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{pageCopy.progressCompleted}</span>
                    <span className="font-semibold">{sessionProgress.completed}</span>
                  </div>
                  <Progress value={Math.min(sessionProgress.completed * 20, 100)} className="h-2" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                    <span className="text-sm text-muted-foreground">{pageCopy.progressAccuracy}</span>
                    <span className="font-semibold">{sessionProgress.accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                    <span className="text-sm text-muted-foreground">{pageCopy.currentLevel}</span>
                    <span className="font-semibold">
                      {trainingData
                        ? formatDifficultyLabel(trainingData.context.trainingProfile.current_level, locale)
                        : formatDifficultyLabel('easy', locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                    <span className="text-sm text-muted-foreground">{pageCopy.chosenChannel}</span>
                    <span className="font-semibold">
                      {currentSimulation
                        ? formatChannelLabel(currentSimulation.channel as Channel, locale)
                        : '-'}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border/60 p-4">
                    <span className="text-sm text-muted-foreground">{pageCopy.autoMix}</span>
                    <p className="mt-2 font-semibold">
                      {assignmentDomains.length
                        ? formatDomainSummary(assignmentDomains, locale, 3, organizationType)
                        : pageCopy.autoMixFallback}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{pageCopy.timer}</span>
                  </div>
                  <span className={cn('font-mono text-sm font-semibold', timeRemaining < 30 && 'text-destructive')}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {pageCopy.focusTitle}
                </CardTitle>
                <CardDescription>{pageCopy.focusDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {assignmentReasons.length ? (
                  assignmentReasons.map((reason) => (
                    <div key={reason} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                      {reason}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-3">
                    {pageCopy.noReasonYet}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">{pageCopy.orgTitle}</CardTitle>
                <CardDescription>{pageCopy.orgDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {organizationExperience.scenarioExamples.slice(0, 2).map((example) => (
                  <div key={example} className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm">
                    {example}
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {organizationProfile?.employeeHint ?? organizationExperience.noSecurityTeamHint}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
