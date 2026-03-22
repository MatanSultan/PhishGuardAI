import { cookies } from 'next/headers'

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/constants'

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as SupportedLocale))
}

export async function getCookieLocale() {
  const cookieStore = await cookies()
  const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value

  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
}

export function resolveLocale(
  preferredLanguage: string | null | undefined,
  fallback: string | null | undefined = DEFAULT_LOCALE,
) {
  if (isSupportedLocale(preferredLanguage)) {
    return preferredLanguage
  }

  if (isSupportedLocale(fallback)) {
    return fallback
  }

  return DEFAULT_LOCALE
}
