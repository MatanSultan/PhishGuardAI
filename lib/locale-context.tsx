'use client'

import { createContext, useContext, useState, useCallback, useEffect, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { type Locale, translations, getDirection } from './i18n'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof translations.en
  dir: 'ltr' | 'rtl'
  isChangingLocale: boolean
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children, defaultLocale = 'en' }: { children: ReactNode; defaultLocale?: Locale }) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isChangingLocale, startTransition] = useTransition()

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale === locale) {
      return
    }

    setLocaleState(newLocale)
    document.documentElement.lang = newLocale
    document.documentElement.dir = getDirection(newLocale)
    void fetch('/api/profile/language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locale: newLocale }),
    }).finally(() => {
      startTransition(() => {
        router.refresh()
      })
    })
  }, [locale, router])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getDirection(locale)
  }, [locale])

  const value: LocaleContextType = {
    locale,
    setLocale,
    t: translations[locale] as typeof translations.en,
    dir: getDirection(locale),
    isChangingLocale,
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
