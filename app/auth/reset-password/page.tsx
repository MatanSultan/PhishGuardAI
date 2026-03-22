'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { dir, locale } = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const response = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        confirmPassword,
      }),
    })

    const payload = await response.json()
    setIsLoading(false)

    if (!response.ok) {
      setError(payload.error ?? (locale === 'he' ? 'לא ניתן לעדכן את הסיסמה.' : 'Unable to update the password.'))
      return
    }

    setIsSuccess(true)
    setTimeout(() => {
      router.replace('/dashboard')
      router.refresh()
    }, 1000)
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center" dir={dir}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {locale === 'he' ? 'הסיסמה עודכנה בהצלחה' : 'Password updated successfully'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'he' ? 'מעבירים אותך חזרה למערכת.' : 'Redirecting you back into the app.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {locale === 'he' ? 'הגדירו סיסמה חדשה' : 'Set a new password'}
        </h1>
        <p className="text-muted-foreground">
          {locale === 'he'
            ? 'בחרו סיסמה חדשה כדי להשלים את תהליך השחזור.'
            : 'Choose a new password to finish the recovery flow.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{locale === 'he' ? 'סיסמה חדשה' : 'New password'}</Label>
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
          <Label htmlFor="confirmPassword">{locale === 'he' ? 'אימות סיסמה' : 'Confirm password'}</Label>
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

        {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {locale === 'he' ? 'טוען...' : 'Loading...'}
            </span>
          ) : (
            locale === 'he' ? 'עדכן סיסמה' : 'Update password'
          )}
        </Button>
      </form>
    </div>
  )
}
