import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCookieLocale, resolveLocale } from '@/lib/i18n-server'
import { getDirection } from '@/lib/i18n'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PhishGuard AI - AI-Powered Phishing Awareness Training',
  description: 'Train your team to detect phishing attacks with AI-powered simulations. PhishGuard AI helps organizations build a human firewall against cyber threats.',
  keywords: ['phishing', 'security training', 'cybersecurity', 'AI', 'awareness training', 'simulation'],
  authors: [{ name: 'PhishGuard AI' }],
  creator: 'PhishGuard AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'he_IL',
    title: 'PhishGuard AI - AI-Powered Phishing Awareness Training',
    description: 'Train your team to detect phishing attacks with AI-powered simulations.',
    siteName: 'PhishGuard AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PhishGuard AI - AI-Powered Phishing Awareness Training',
    description: 'Train your team to detect phishing attacks with AI-powered simulations.',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let locale = await getCookieLocale()

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle()

      locale = resolveLocale(profile?.preferred_language, locale)
    }
  } catch {
    // Fall back to cookie locale when auth context is unavailable.
  }

  const dir = getDirection(locale)

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider defaultLocale={locale}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
