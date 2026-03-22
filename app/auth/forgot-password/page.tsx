'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const { t, dir } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const payload = await response.json()
    setIsLoading(false)

    if (!response.ok) {
      setError(payload.error ?? t.common.error)
      return
    }

    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center" dir={dir}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.forgotPassword.success}</h1>
          <p className="text-muted-foreground">
            {dir === 'rtl'
              ? 'בדקו את תיבת הדואר שלכם עבור קישור לאיפוס הסיסמה.'
              : 'Check your inbox for a link to reset your password.'}
          </p>
        </div>
        <Link href="/auth/signin">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="ltr:mr-2 rtl:ml-2 rtl:rotate-180 h-4 w-4" />
            {t.auth.forgotPassword.backToSignIn}
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.forgotPassword.title}</h1>
        <p className="text-muted-foreground">{t.auth.forgotPassword.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.forgotPassword.email}</Label>
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

        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t.common.loading}
            </span>
          ) : (
            t.auth.forgotPassword.submit
          )}
        </Button>
      </form>

      <Link href="/auth/signin" className="block">
        <Button variant="ghost" className="w-full">
          <ArrowLeft className="ltr:mr-2 rtl:ml-2 rtl:rotate-180 h-4 w-4" />
          {t.auth.forgotPassword.backToSignIn}
        </Button>
      </Link>
    </div>
  )
}
