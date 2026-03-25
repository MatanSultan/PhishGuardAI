'use client'

import Link from 'next/link'
import { ArrowRight, Shield } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'

export function CTA() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'מוכנים להראות ערך בפחות מ-10 דקות?',
          subtitle: 'Book a demo / התחילו פיילוט ותראו איך ציון הסיכון והסיכום למנהלים עובדים עם תרחישים מקומיים.',
          primary: 'תיאום דמו',
          secondary: 'בדיקת סיכון צוות',
        }
      : {
          title: 'Ready to show value in under 10 minutes?',
          subtitle: 'Book a demo or start a pilot to see the Risk Score and manager summary on local scenarios.',
          primary: 'Book a demo',
          secondary: 'Check your team risk',
        }

  return (
    <section className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground md:p-12 lg:p-16">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-2xl text-center">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
              <Shield className="h-8 w-8" />
            </div>

            {/* Content */}
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lg opacity-90">
              {copy.subtitle}
            </p>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="group h-12 bg-primary-foreground px-8 text-base text-primary hover:bg-primary-foreground/90"
                >
                  {copy.primary}
                  <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
                </Button>
              </Link>
              <Link href="/admin">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-primary/10 text-primary border-primary/40">
                  {copy.secondary}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
