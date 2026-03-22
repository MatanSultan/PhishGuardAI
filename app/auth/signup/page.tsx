'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Building } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, dir, locale } = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        organization,
        email,
        password,
        confirmPassword,
        preferredLanguage: locale,
        next: searchParams.get('next') ?? undefined,
      }),
    })

    const payload = await response.json()
    setIsLoading(false)

    if (!response.ok) {
      setError(payload.error ?? t.common.error)
      return
    }

    if (payload.needsEmailVerification) {
      setSuccess(
        locale === 'he'
          ? 'החשבון נוצר. בדקו את האימייל כדי לאשר את ההרשמה.'
          : 'Account created. Check your email to confirm the signup.',
      )
      return
    }

    router.replace(payload.redirectTo ?? '/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.signUp.title}</h1>
        <p className="text-muted-foreground">{t.auth.signUp.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t.auth.signUp.fullName}</Label>
          <div className="relative">
            <User className="absolute ltr:left-3 rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Doe"
              className="ltr:pl-10 rtl:pr-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization">{t.auth.signUp.organization}</Label>
          <div className="relative">
            <Building className="absolute ltr:left-3 rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="organization"
              type="text"
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Acme Inc."
              className="ltr:pl-10 rtl:pr-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.signUp.email}</Label>
          <div className="relative">
            <Mail className="absolute ltr:left-3 rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="ltr:pl-10 rtl:pr-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.signUp.password}</Label>
          <div className="relative">
            <Lock className="absolute ltr:left-3 rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="ltr:pl-10 ltr:pr-10 rtl:pr-10 rtl:pl-10"
              required
            />
            <button
              type="button"
              className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t.auth.signUp.confirmPassword}</Label>
          <div className="relative">
            <Lock className="absolute ltr:left-3 rtl:right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="ltr:pl-10 ltr:pr-10 rtl:pr-10 rtl:pl-10"
              required
            />
            <button
              type="button"
              className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t.auth.signUp.terms}{' '}
          <Link href="#" className="text-primary hover:underline">
            {t.auth.signUp.termsLink}
          </Link>{' '}
          {t.auth.signUp.and}{' '}
          <Link href="#" className="text-primary hover:underline">
            {t.auth.signUp.privacyLink}
          </Link>
        </p>

        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {success ? <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">{success}</div> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t.common.loading}
            </span>
          ) : (
            t.auth.signUp.submit
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.signUp.hasAccount}{' '}
        <Link href="/auth/signin" className="font-medium text-primary hover:underline">
          {t.auth.signUp.signIn}
        </Link>
      </p>
    </div>
  )
}
