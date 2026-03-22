'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, dir } = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        next: searchParams.get('next') ?? undefined,
      }),
    })

    const payload = await response.json()
    setIsLoading(false)

    if (!response.ok) {
      setError(payload.error ?? t.common.error)
      return
    }

    router.replace(payload.redirectTo ?? '/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.signIn.title}</h1>
        <p className="text-muted-foreground">{t.auth.signIn.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.signIn.email}</Label>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.signIn.password}</Label>
            <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
              {t.auth.signIn.forgotPassword}
            </Link>
          </div>
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

        <div className="flex items-center gap-2">
          <Checkbox id="remember" />
          <Label htmlFor="remember" className="text-sm font-normal">
            {t.auth.signIn.rememberMe}
          </Label>
        </div>

        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t.common.loading}
            </span>
          ) : (
            t.auth.signIn.submit
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.signIn.noAccount}{' '}
        <Link href="/auth/signup" className="font-medium text-primary hover:underline">
          {t.auth.signIn.signUp}
        </Link>
      </p>
    </div>
  )
}
