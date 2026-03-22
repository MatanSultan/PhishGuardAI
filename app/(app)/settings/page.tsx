'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Globe, Mail, ShieldCheck, User, Users } from 'lucide-react'

import { DomainSelector } from '@/components/domain-selector'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOrganizationRoleLabel, getCompanyCopy } from '@/lib/company-copy'
import { SIMULATION_CATEGORIES, type SimulationCategory } from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { formatDifficultyLabel, formatDomainSummary } from '@/lib/presentation'

interface ProfilePayload {
  profile: {
    full_name: string | null
    email: string
    preferred_language: 'en' | 'he'
  }
  trainingProfile: {
    current_level: string
    total_attempts: number
    total_score: number
    preferred_domains: SimulationCategory[]
  }
}

interface OrganizationPayload {
  organization: {
    id: string
    name: string
    slug: string
    industry: string | null
  } | null
  membership: {
    role: 'member' | 'admin'
    joined_at: string
  } | null
  settings: {
    allow_leaderboard: boolean
  } | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { locale, setLocale, dir } = useLocale()
  const companyCopy = getCompanyCopy(locale)
  const [profileData, setProfileData] = useState<ProfilePayload | null>(null)
  const [organizationData, setOrganizationData] = useState<OrganizationPayload | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<SimulationCategory[]>([])
  const [organizationName, setOrganizationName] = useState('')
  const [organizationIndustry, setOrganizationIndustry] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingDomains, setIsSavingDomains] = useState(false)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [domainStatus, setDomainStatus] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const [organizationStatus, setOrganizationStatus] = useState<{
    kind: 'success' | 'error'
    message: string
  } | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const [profileResponse, organizationResponse] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/organization'),
        ])

        const profilePayload = await profileResponse.json().catch(() => null)
        const organizationPayload = await organizationResponse.json().catch(() => null)

        if (!active) {
          return
        }

        if (!profileResponse.ok || !organizationResponse.ok) {
          setLoadError(companyCopy.settings.loadError)
          setIsLoading(false)
          return
        }

        setProfileData(profilePayload)
        setSelectedDomains(profilePayload.trainingProfile.preferred_domains ?? [])
        setOrganizationData(organizationPayload)
        setIsLoading(false)
      } catch {
        if (!active) {
          return
        }

        setLoadError(companyCopy.settings.loadError)
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [companyCopy.settings.loadError])

  const persistDomains = async (domains: SimulationCategory[]) => {
    setSelectedDomains(domains)
    setIsSavingDomains(true)
    setDomainStatus(null)

    try {
      const response = await fetch('/api/profile/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domains }),
      })

      const payload = await response.json().catch(() => null)
      setIsSavingDomains(false)

      if (!response.ok) {
        setDomainStatus({
          kind: 'error',
          message: payload?.error ?? companyCopy.settings.domainsSaveError,
        })
        return
      }

      setProfileData((current) =>
        current
          ? {
              ...current,
              trainingProfile: {
                ...current.trainingProfile,
                preferred_domains: payload.preferredDomains ?? domains,
              },
            }
          : current,
      )
      setDomainStatus({
        kind: 'success',
        message: companyCopy.settings.domainsSaved,
      })
    } catch {
      setIsSavingDomains(false)
      setDomainStatus({
        kind: 'error',
        message: companyCopy.settings.domainsSaveError,
      })
    }
  }

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsCreatingOrganization(true)
    setOrganizationStatus(null)

    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organizationName,
          industry: organizationIndustry,
        }),
      })

      const payload = await response.json().catch(() => null)
      setIsCreatingOrganization(false)

      if (!response.ok) {
        setOrganizationStatus({
          kind: 'error',
          message: payload?.error ?? companyCopy.settings.organizationCreateError,
        })
        return
      }

      setOrganizationData(payload)
      setOrganizationStatus({
        kind: 'success',
        message: companyCopy.settings.organizationCreated,
      })
      router.replace('/admin')
      router.refresh()
    } catch {
      setIsCreatingOrganization(false)
      setOrganizationStatus({
        kind: 'error',
        message: companyCopy.settings.organizationCreateError,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError || !profileData || !organizationData) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8" dir={dir}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-destructive">{loadError ?? companyCopy.settings.loadError}</p>
            <Button onClick={() => window.location.reload()}>{companyCopy.common.retry}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {locale === 'he' ? 'הגדרות' : 'Settings'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {locale === 'he'
            ? 'ניהול פרופיל, שפה, העדפות אימון ומצב ארגוני.'
            : 'Manage your profile, language, training preferences, and company setup.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'פרופיל משתמש' : 'User Profile'}</CardTitle>
          <CardDescription>
            {locale === 'he'
              ? 'המידע הבסיסי שמחובר לחשבון שלכם.'
              : 'Basic information associated with your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{locale === 'he' ? 'שם מלא' : 'Full name'}</span>
            </div>
            <p className="font-medium">{profileData.profile.full_name || '-'}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{locale === 'he' ? 'אימייל' : 'Email'}</span>
            </div>
            <p className="font-medium">{profileData.profile.email || '-'}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>{locale === 'he' ? 'שפה מועדפת' : 'Preferred language'}</span>
            </div>
            <p className="font-medium">
              {profileData.profile.preferred_language === 'he' ? 'עברית' : 'English'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'שפה' : 'Language'}</CardTitle>
          <CardDescription>
            {locale === 'he'
              ? 'העדכון נשמר גם בפרופיל וגם בעוגיית הדפדפן.'
              : 'This updates both your profile preference and the browser locale cookie.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant={locale === 'he' ? 'default' : 'outline'} onClick={() => setLocale('he')}>
            עברית
          </Button>
          <Button variant={locale === 'en' ? 'default' : 'outline'} onClick={() => setLocale('en')}>
            English
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'תחומי אימון מועדפים' : 'Preferred Training Domains'}</CardTitle>
          <CardDescription>
            {locale === 'he'
              ? 'התחומים האלה יקבלו עדיפות בפעם הבאה שתתאמנו.'
              : 'These domains will be prioritized the next time you train.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DomainSelector
            locale={locale}
            availableDomains={[...SIMULATION_CATEGORIES]}
            selectedDomains={selectedDomains}
            onChange={persistDomains}
            disabled={isSavingDomains}
          />
          <p className="text-sm text-muted-foreground">
            {locale === 'he'
              ? `הבחירה הנוכחית: ${formatDomainSummary(selectedDomains, locale)}`
              : `Current selection: ${formatDomainSummary(selectedDomains, locale)}`}
          </p>
          {domainStatus ? (
            <Alert variant={domainStatus.kind === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{domainStatus.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{companyCopy.settings.companyTitle}</CardTitle>
          <CardDescription>{companyCopy.settings.companyDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {organizationData.organization ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{locale === 'he' ? 'ארגון' : 'Organization'}</span>
                  </div>
                  <p className="font-medium">{organizationData.organization.name}</p>
                  <p className="text-sm text-muted-foreground">{organizationData.organization.slug}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{locale === 'he' ? 'הרשאה' : 'Role'}</span>
                  </div>
                  <p className="font-medium">
                    {organizationData.membership?.role === 'admin'
                      ? locale === 'he'
                        ? 'מנהל ארגון'
                        : 'Organization admin'
                      : formatOrganizationRoleLabel('member', locale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{locale === 'he' ? 'תכונות צוות' : 'Team features'}</span>
                  </div>
                  <p className="font-medium">
                    {organizationData.settings?.allow_leaderboard
                      ? locale === 'he'
                        ? 'דירוג פעיל'
                        : 'Leaderboard enabled'
                      : locale === 'he'
                        ? 'דירוג כבוי'
                        : 'Leaderboard disabled'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {organizationData.membership?.role === 'admin' ? (
                  <>
                    <Link href="/admin">
                      <Button>{locale === 'he' ? 'מרכז ניהול צוות' : 'Open Team Admin'}</Button>
                    </Link>
                    <Link href="/admin/reports">
                      <Button variant="outline">
                        {locale === 'he' ? 'דוחות צוות' : 'Open Team Reports'}
                      </Button>
                    </Link>
                  </>
                ) : null}
                {organizationData.settings?.allow_leaderboard ? (
                  <Link href="/leaderboard">
                    <Button variant="outline">
                      {locale === 'he' ? 'טבלת דירוג' : 'Leaderboard'}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization-name">
                    {locale === 'he' ? 'שם הארגון' : 'Organization name'}
                  </Label>
                  <Input
                    id="organization-name"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder={locale === 'he' ? 'לדוגמה Acme Security' : 'For example, Acme Security'}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-industry">
                    {locale === 'he' ? 'תחום פעילות' : 'Industry'}
                  </Label>
                  <Input
                    id="organization-industry"
                    value={organizationIndustry}
                    onChange={(event) => setOrganizationIndustry(event.target.value)}
                    placeholder={locale === 'he' ? 'לדוגמה Fintech' : 'For example, Fintech'}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {companyCopy.settings.createDescription}
              </p>
              <Button type="submit" disabled={isCreatingOrganization}>
                {isCreatingOrganization
                  ? locale === 'he'
                    ? 'יוצרים ארגון...'
                    : 'Creating organization...'
                  : locale === 'he'
                    ? 'יצירת ארגון'
                    : 'Create Organization'}
              </Button>
            </form>
          )}

          {organizationStatus ? (
            <Alert variant={organizationStatus.kind === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{organizationStatus.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'he' ? 'מצב למידה' : 'Training State'}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{locale === 'he' ? 'רמה' : 'Level'}</p>
            <p className="text-2xl font-bold">
              {profileData.trainingProfile.current_level
                ? formatDifficultyLabel(
                    profileData.trainingProfile.current_level as 'easy' | 'medium' | 'hard',
                    locale,
                  )
                : '-'}
            </p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{locale === 'he' ? 'ניסיונות' : 'Attempts'}</p>
            <p className="text-2xl font-bold">{profileData.trainingProfile.total_attempts ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{locale === 'he' ? 'ציון' : 'Score'}</p>
            <p className="text-2xl font-bold">{profileData.trainingProfile.total_score ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
