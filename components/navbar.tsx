'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Brain,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Swords,
  Trophy,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OrganizationRole } from '@/lib/constants'
import { SALES_WHATSAPP_DEMO_MESSAGE, buildSalesWhatsAppUrl } from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { cn } from '@/lib/utils'

interface NavbarProps {
  variant?: 'landing' | 'app'
  organizationState?: {
    name: string
    role: OrganizationRole
    allowLeaderboard: boolean
  } | null
  isPlatformOwner?: boolean
}

type NavLink = {
  href: string
  label: string
  icon?: LucideIcon
}

export function Navbar({ variant = 'landing', organizationState = null, isPlatformOwner = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const { locale, setLocale, t, dir, isChangingLocale } = useLocale()
  const switchLanguageLabel = locale === 'he' ? 'החלפת שפה' : 'Switch language'
  const toggleThemeLabel = locale === 'he' ? 'החלפת ערכת נושא' : 'Toggle theme'
  const toggleMenuLabel = locale === 'he' ? 'פתיחת תפריט' : 'Toggle menu'

  const landingLabels =
    locale === 'he'
      ? {
          features: 'יכולות',
          howItWorks: 'איך זה עובד',
          pricing: 'מחירים',
          faq: 'שאלות נפוצות',
          signIn: 'כניסה',
          cta: 'לתיאום דמו',
        }
      : {
          features: t.nav.features,
          howItWorks: t.nav.howItWorks,
          pricing: t.nav.pricing,
          faq: t.nav.faq,
          signIn: t.nav.signIn,
          cta: 'Book a demo',
        }

  const landingLinks: NavLink[] = [
    { href: '#features', label: landingLabels.features },
    { href: '#how-it-works', label: landingLabels.howItWorks },
    { href: '#pricing', label: landingLabels.pricing },
    { href: '#faq', label: landingLabels.faq },
  ]

  const appLinks: NavLink[] = [
    {
      href: '/dashboard',
      label: locale === 'he' ? 'לוח בקרה' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/training',
      label: locale === 'he' ? 'אזור אימון' : 'Training Arena',
      icon: Swords,
    },
    {
      href: '/memory',
      label: locale === 'he' ? 'פרופיל זיכרון' : 'Memory Profile',
      icon: Brain,
    },
    {
      href: '/reports',
      label: locale === 'he' ? 'דוחות' : 'Reports',
      icon: BarChart3,
    },
    ...(organizationState?.allowLeaderboard && organizationState.role === 'admin'
      ? [
          {
            href: '/leaderboard',
            label: locale === 'he' ? 'טבלת דירוג' : 'Leaderboard',
            icon: Trophy,
          },
        ]
      : []),
    ...(organizationState?.role === 'admin'
      ? [
          {
            href: '/admin',
            label: locale === 'he' ? 'ניהול צוות' : 'Team Admin',
            icon: ShieldCheck,
          },
        ]
      : []),
    ...(isPlatformOwner
      ? [
          {
            href: '/owner/organizations',
            label: locale === 'he' ? 'קונסולת בעלים' : 'Owner console',
            icon: Shield,
          },
        ]
      : []),
  ]

  const links = variant === 'landing' ? landingLinks : appLinks
  const isLinkActive = (href: string) =>
    variant === 'app' ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', {
      method: 'POST',
    })
    router.replace('/')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      dir={dir}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PhishGuard AI</span>
          {variant === 'app' && organizationState ? (
            <Badge variant="secondary" className="hidden lg:inline-flex">
              {organizationState.name}
            </Badge>
          ) : null}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = 'icon' in link && isLinkActive(link.href)
            const Icon = 'icon' in link ? link.icon : null

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
                <span className="sr-only">{switchLanguageLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              <DropdownMenuItem
                disabled={isChangingLocale}
                onClick={() => setLocale('en')}
                className={locale === 'en' ? 'bg-muted' : ''}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isChangingLocale}
                onClick={() => setLocale('he')}
                className={locale === 'he' ? 'bg-muted' : ''}
              >
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

          {variant === 'landing' ? (
            <>
              <Link href="/auth/signin" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  {landingLabels.signIn}
                </Button>
              </Link>
              <a
                href={buildSalesWhatsAppUrl(SALES_WHATSAPP_DEMO_MESSAGE)}
                target="_blank"
                rel="noreferrer"
                className="hidden md:block"
              >
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  {landingLabels.cta}
                </Button>
              </a>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t.nav.settings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t.nav.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">{toggleMenuLabel}</span>
          </Button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <div className="container mx-auto space-y-1 px-4 py-4">
            {links.map((link) => {
              const isActive = 'icon' in link && isLinkActive(link.href)
              const Icon = 'icon' in link ? link.icon : null

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {link.label}
                </Link>
              )
            })}

            {variant === 'landing' && (
              <div className="flex flex-col gap-2 pt-4">
                <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {landingLabels.signIn}
                  </Button>
                </Link>
                <a
                  href={buildSalesWhatsAppUrl(SALES_WHATSAPP_DEMO_MESSAGE)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    {landingLabels.cta}
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
