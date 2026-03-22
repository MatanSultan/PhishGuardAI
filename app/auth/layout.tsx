'use client'

import Link from 'next/link'
import { Globe, Moon, Shield, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/lib/locale-context'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, dir } = useLocale()
  const switchLanguageLabel = locale === 'he' ? 'החלפת שפה' : 'Switch language'
  const toggleThemeLabel = locale === 'he' ? 'החלפת ערכת נושא' : 'Toggle theme'

  return (
    <div className="flex min-h-screen flex-col" dir={dir}>
      <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PhishGuard AI</span>
        </Link>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
                <span className="sr-only">{switchLanguageLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              <DropdownMenuItem onClick={() => setLocale('en')} className={locale === 'en' ? 'bg-muted' : ''}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('he')} className={locale === 'he' ? 'bg-muted' : ''}>
                עברית
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{toggleThemeLabel}</span>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px] ltr:right-0 rtl:left-0" />
        <div className="absolute bottom-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-[80px] ltr:left-0 rtl:right-0" />
      </div>
    </div>
  )
}
