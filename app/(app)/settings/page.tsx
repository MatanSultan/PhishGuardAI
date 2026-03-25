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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOrganizationRoleLabel, getCompanyCopy } from '@/lib/company-copy'
import {
  ORGANIZATION_TYPES,
  SIMULATION_CATEGORIES,
  type OrganizationType,
  type SimulationCategory,
} from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { getOrganizationExperienceProfile } from '@/lib/organizations/experience'
import {
  getOrganizationSegmentLabel,
  getOrganizationSegmentProfile,
} from '@/lib/organizations/segments'
import type { OrganizationSignupDraft } from '@/lib/organizations/signup-draft'
import { formatDifficultyLabel, formatDomainSummary } from '@/lib/presentation'
import { getSuggestedStarterDomains } from '@/lib/training/domains'

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
  signupDraft: OrganizationSignupDraft | null
}

interface OrganizationPayload {
  organization: {
    id: string
    name: string
    slug: string
    industry: string | null
    organization_type: OrganizationType
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
  const [organizationType, setOrganizationType] = useState<OrganizationType>('other')
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

        const profilePayload = (await profileResponse.json().catch(() => null)) as ProfilePayload | null
        const organizationPayload = (await organizationResponse.json().catch(() => null)) as OrganizationPayload | null

        if (!active) {
          return
        }

        if (!profileResponse.ok || !organizationResponse.ok || !profilePayload || !organizationPayload) {
          setLoadError(companyCopy.settings.loadError)
          setIsLoading(false)
          return
        }

        const preferredDomains = profilePayload.trainingProfile.preferred_domains ?? []
        const signupDraft = profilePayload.signupDraft
        const nextOrganizationType =
          organizationPayload.organization?.organization_type ??
          signupDraft?.organizationType ??
          'other'
        const nextOrganizationIndustry =
          organizationPayload.organization?.industry ??
          signupDraft?.industry ??
          ''
        const nextOrganizationName =
          organizationPayload.organization?.name ??
          signupDraft?.name ??
          ''
        const defaultDomains =
          preferredDomains.length > 0
            ? preferredDomains
            : getSuggestedStarterDomains(nextOrganizationType, nextOrganizationIndustry)

        setProfileData(profilePayload)
        setSelectedDomains(defaultDomains)
        setOrganizationData(organizationPayload)

        if (!organizationPayload.organization) {
          setOrganizationName(nextOrganizationName)
          setOrganizationType(nextOrganizationType)
          setOrganizationIndustry(nextOrganizationIndustry)
        }

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
                preferred_domains: payload?.preferredDomains ?? domains,
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
          organizationType,
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

  const activeOrganizationType = organizationData.organization?.organization_type ?? organizationType
  const activeOrganizationIndustry = organizationData.organization?.industry ?? organizationIndustry
  const activeSegmentProfile = getOrganizationSegmentProfile(
    activeOrganizationType,
    activeOrganizationIndustry,
    locale,
  )
  const activeExperienceProfile = getOrganizationExperienceProfile(activeOrganizationType, locale)
  const settingsCopy =
    locale === 'he'
      ? {
          title: 'הגדרות',
          subtitle: 'ניהול פרופיל, שפה, העדפות אימון והגדרת הארגון.',
          profileTitle: 'פרופיל משתמש',
          profileDescription: 'המידע הבסיסי שמחובר לחשבון שלכם.',
          fullName: 'שם מלא',
          email: 'אימייל',
          preferredLanguage: 'שפה מועדפת',
          languageTitle: 'שפה',
          languageDescription: 'העדכון נשמר גם בפרופיל וגם בעוגיית הדפדפן.',
          domainTitle: 'תחומי אימון מועדפים',
          domainDescription: 'התחומים האלה יקבלו עדיפות בפעם הבאה שתתאמנו.',
          currentSelection: 'הבחירה הנוכחית',
          companyOrganization: 'ארגון',
          companyRole: 'הרשאה',
          companyFeatures: 'תכונות צוות',
          teamAdmin: 'מנהל ארגון',
          leaderboardEnabled: 'דירוג פעיל',
          leaderboardDisabled: 'דירוג כבוי',
          segmentSetup: 'התאמה לארגון',
          segmentGuideTitle: 'איך הארגון הזה יוגדר במערכת',
          examplesTitle: 'תרחישים שיופיעו בעדיפות',
          actionsTitle: 'מה כדאי לעשות ראשון',
          defaultDomains: 'תחומי ברירת המחדל',
          companyName: 'שם הארגון',
          organizationType: 'סוג ארגון',
          industry: 'תחום פעילות',
          companyPlaceholder: 'לדוגמה, בית אלונים',
          industryPlaceholder: 'לדוגמה, רשת חינוך אזורית',
          createOrganization: 'יצירת ארגון',
          creatingOrganization: 'יוצרים ארגון...',
          teamAdminButton: 'מרכז ניהול צוות',
          teamReportsButton: 'דוחות צוות',
          leaderboardButton: 'טבלת דירוג',
          trainingState: 'מצב למידה',
          level: 'רמה',
          attempts: 'ניסיונות',
          score: 'ציון',
        }
      : {
          title: 'Settings',
          subtitle: 'Manage your profile, language, training preferences, and company setup.',
          profileTitle: 'User Profile',
          profileDescription: 'Basic information associated with your account.',
          fullName: 'Full name',
          email: 'Email',
          preferredLanguage: 'Preferred language',
          languageTitle: 'Language',
          languageDescription: 'This updates both your profile preference and the browser locale cookie.',
          domainTitle: 'Preferred Training Domains',
          domainDescription: 'These domains will be prioritized the next time you train.',
          currentSelection: 'Current selection',
          companyOrganization: 'Organization',
          companyRole: 'Role',
          companyFeatures: 'Team features',
          teamAdmin: 'Organization admin',
          leaderboardEnabled: 'Leaderboard enabled',
          leaderboardDisabled: 'Leaderboard disabled',
          segmentSetup: 'Segment setup',
          segmentGuideTitle: 'How this organization will be configured',
          examplesTitle: 'Examples that will be prioritized',
          actionsTitle: 'Best first steps',
          defaultDomains: 'Default starter domains',
          companyName: 'Organization name',
          organizationType: 'Organization type',
          industry: 'Industry',
          companyPlaceholder: 'For example, Beit Alonim',
          industryPlaceholder: 'For example, Regional education network',
          createOrganization: 'Create Organization',
          creatingOrganization: 'Creating organization...',
          teamAdminButton: 'Open Team Admin',
          teamReportsButton: 'Open Team Reports',
          leaderboardButton: 'Leaderboard',
          trainingState: 'Training State',
          level: 'Level',
          attempts: 'Attempts',
          score: 'Score',
        }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{settingsCopy.title}</h1>
        <p className="mt-1 text-muted-foreground">{settingsCopy.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{settingsCopy.profileTitle}</CardTitle>
          <CardDescription>{settingsCopy.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{settingsCopy.fullName}</span>
            </div>
            <p className="font-medium">{profileData.profile.full_name || '-'}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{settingsCopy.email}</span>
            </div>
            <p className="font-medium">{profileData.profile.email || '-'}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>{settingsCopy.preferredLanguage}</span>
            </div>
            <p className="font-medium">
              {profileData.profile.preferred_language === 'he' ? 'עברית' : 'English'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{settingsCopy.languageTitle}</CardTitle>
          <CardDescription>{settingsCopy.languageDescription}</CardDescription>
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
          <CardTitle>{settingsCopy.domainTitle}</CardTitle>
          <CardDescription>{settingsCopy.domainDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DomainSelector
            locale={locale}
            availableDomains={[...SIMULATION_CATEGORIES]}
            selectedDomains={selectedDomains}
            onChange={persistDomains}
            organizationType={activeOrganizationType}
            disabled={isSavingDomains}
          />
          <p className="text-sm text-muted-foreground">
            {settingsCopy.currentSelection}:{' '}
            {formatDomainSummary(selectedDomains, locale, 3, activeOrganizationType)}
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{settingsCopy.companyOrganization}</span>
                  </div>
                  <p className="font-medium">{organizationData.organization.name}</p>
                  <p className="text-sm text-muted-foreground">{organizationData.organization.slug}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{settingsCopy.companyRole}</span>
                  </div>
                  <p className="font-medium">
                    {organizationData.membership?.role === 'admin'
                      ? settingsCopy.teamAdmin
                      : formatOrganizationRoleLabel('member', locale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{settingsCopy.companyFeatures}</span>
                  </div>
                  <p className="font-medium">
                    {organizationData.settings?.allow_leaderboard
                      ? settingsCopy.leaderboardEnabled
                      : settingsCopy.leaderboardDisabled}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <div>
                    <p className="font-medium">{settingsCopy.segmentSetup}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getOrganizationSegmentLabel(
                        organizationData.organization.organization_type,
                        locale,
                      )}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeSegmentProfile.onboardingHint}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {settingsCopy.defaultDomains}:{' '}
                      {formatDomainSummary(
                        activeSegmentProfile.suggestedDomains,
                        locale,
                        4,
                        activeOrganizationType,
                      )}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeExperienceProfile.noSecurityTeamHint}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{settingsCopy.examplesTitle}</p>
                      <div className="mt-2 space-y-2">
                        {activeExperienceProfile.scenarioExamples.slice(0, 3).map((example) => (
                          <div key={example} className="rounded-lg border border-border p-3 text-sm">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{settingsCopy.actionsTitle}</p>
                      <div className="mt-2 space-y-2">
                        {activeExperienceProfile.managerActions.map((action) => (
                          <div key={action} className="rounded-lg border border-border p-3 text-sm">
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {organizationData.membership?.role === 'admin' ? (
                  <>
                    <Link href="/admin">
                      <Button>{settingsCopy.teamAdminButton}</Button>
                    </Link>
                    <Link href="/admin/reports">
                      <Button variant="outline">{settingsCopy.teamReportsButton}</Button>
                    </Link>
                  </>
                ) : null}
                {organizationData.settings?.allow_leaderboard ? (
                  <Link href="/leaderboard">
                    <Button variant="outline">{settingsCopy.leaderboardButton}</Button>
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="organization-name">{settingsCopy.companyName}</Label>
                  <Input
                    id="organization-name"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder={settingsCopy.companyPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{settingsCopy.organizationType}</Label>
                  <Select
                    value={organizationType}
                    onValueChange={(value) => setOrganizationType(value as OrganizationType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getOrganizationSegmentLabel(type, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization-industry">{settingsCopy.industry}</Label>
                  <Input
                    id="organization-industry"
                    value={organizationIndustry}
                    onChange={(event) => setOrganizationIndustry(event.target.value)}
                    placeholder={settingsCopy.industryPlaceholder}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                  <div>
                    <p className="font-medium">{settingsCopy.segmentGuideTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getOrganizationSegmentLabel(organizationType, locale)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{activeSegmentProfile.description}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{activeSegmentProfile.onboardingHint}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {settingsCopy.defaultDomains}:{' '}
                      {formatDomainSummary(
                        getSuggestedStarterDomains(organizationType, organizationIndustry),
                        locale,
                        4,
                        organizationType,
                      )}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeExperienceProfile.noSecurityTeamHint}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{settingsCopy.examplesTitle}</p>
                      <div className="mt-2 space-y-2">
                        {activeExperienceProfile.scenarioExamples.slice(0, 3).map((example) => (
                          <div key={example} className="rounded-lg border border-border p-3 text-sm">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{settingsCopy.actionsTitle}</p>
                      <div className="mt-2 space-y-2">
                        {activeExperienceProfile.managerActions.map((action) => (
                          <div key={action} className="rounded-lg border border-border p-3 text-sm">
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {companyCopy.settings.createDescription}
              </p>
              <Button type="submit" disabled={isCreatingOrganization}>
                {isCreatingOrganization
                  ? settingsCopy.creatingOrganization
                  : settingsCopy.createOrganization}
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
          <CardTitle>{settingsCopy.trainingState}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{settingsCopy.level}</p>
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
            <p className="text-sm text-muted-foreground">{settingsCopy.attempts}</p>
            <p className="text-2xl font-bold">{profileData.trainingProfile.total_attempts ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{settingsCopy.score}</p>
            <p className="text-2xl font-bold">{profileData.trainingProfile.total_score ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
