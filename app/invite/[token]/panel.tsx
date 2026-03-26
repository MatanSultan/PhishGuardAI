'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, CheckCircle2, MailPlus } from 'lucide-react'

import { getCompanyCopy, mapInviteAcceptanceError } from '@/lib/company-copy'
import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePanel({
  token,
  isAuthenticated,
}: {
  token: string
  isAuthenticated: boolean
}) {
  const router = useRouter()
  const { locale, dir } = useLocale()
  const companyCopy = getCompanyCopy(locale)
  const [state, setState] = useState<'idle' | 'submitting' | 'accepted'>('idle')
  const [error, setError] = useState<string | null>(null)
  const isMismatch = error?.includes('sent to') && error?.includes('signed in')

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.replace(`/auth/signin?next=${encodeURIComponent(`/invite/${token}`)}`)
    router.refresh()
  }

  const handleAccept = async () => {
    setState('submitting')
    setError(null)

    try {
      const response = await fetch('/api/organization/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setState('idle')
        setError(mapInviteAcceptanceError(payload?.error, locale))
        return
      }

      setState('accepted')
      router.replace(payload.membership?.role === 'admin' ? '/admin' : '/dashboard')
      router.refresh()
    } catch {
      setState('idle')
      setError(companyCopy.invite.genericError)
    }
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10 lg:px-8" dir={dir}>
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-3 text-2xl">{companyCopy.invite.title}</CardTitle>
          <CardDescription>{companyCopy.invite.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <>
              <p className="text-center text-sm text-muted-foreground">{companyCopy.invite.signInPrompt}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={`/auth/signin?next=${encodeURIComponent(`/invite/${token}`)}`} className="flex-1">
                  <Button className="w-full">
                    {locale === 'he' ? 'התחברות' : 'Sign In'}
                  </Button>
                </Link>
                <Link href={`/auth/signup?next=${encodeURIComponent(`/invite/${token}`)}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <MailPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {locale === 'he' ? 'יצירת חשבון' : 'Create Account'}
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">{companyCopy.invite.acceptPrompt}</p>
              <Button
                className="w-full"
                onClick={() => void handleAccept()}
                disabled={state === 'submitting' || state === 'accepted'}
              >
                {state === 'submitting'
                  ? companyCopy.invite.accepting
                  : state === 'accepted'
                    ? companyCopy.invite.accepted
                    : companyCopy.invite.accept}
              </Button>
            </>
          )}

          {state === 'accepted' ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>{companyCopy.invite.success}</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {isMismatch ? (
                <div className="mt-3 space-y-2 text-xs text-destructive/90">
                  <p>
                    {locale === 'he'
                      ? 'התחבר/י עם המייל שקיבל את ההזמנה או בקש/י מהמנהל לשלוח הזמנה חדשה.'
                      : 'Sign in with the invited email or ask the admin to send a new invite.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void handleSignOut()}>
                      {locale === 'he' ? 'התנתקות והתחברות מחדש' : 'Sign out and switch email'}
                    </Button>
                    <Link href="/auth/signin" className="inline-flex">
                      <Button size="sm" variant="ghost">
                        {locale === 'he' ? 'מסך התחברות' : 'Back to sign in'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
