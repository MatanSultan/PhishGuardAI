'use client'

import Link from 'next/link'
import { ArrowRight, Play, Shield, Mail, MessageSquare, Smartphone } from 'lucide-react'
import {
  SALES_WHATSAPP_DEMO_MESSAGE,
  buildSalesWhatsAppUrl,
} from '@/lib/constants'
import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'

export function Hero() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          badge: 'הפחתת סיכון אנושי לארגונים בישראל',
          title: 'תוך דקות תראו איפה הארגון שלכם חשוף לפישינג',
          subtitle:
            'PhishGuard AI מדמה הודעות שנראות אמיתיות, מאמן עובדים, ומראה למנהלים איפה הסיכון, מי צריך רענון ומה נכון לעשות עכשיו.',
          ctaPrimary: 'לתיאום דמו',
          ctaSecondary: 'התחלת תקופת ניסיון',
          trustedBy: 'מותאם לבתי ספר, רשויות מקומיות, עמותות, בתי אבות ועסקים קטנים',
          trustedMarks: ['חינוך', 'רשויות', 'עמותות', 'בתי אבות', 'SMB'],
          dashboardTitle: 'לוח מנהלים של PhishGuard AI',
          riskLabel: 'ציון סיכון ארגוני',
          riskValue: '64',
          riskMeta: 'בינוני',
          refresherLabel: 'עובדים לרענון',
          refresherValue: '12',
          refresherMeta: 'מתוך 84',
          channelLabel: 'הערוץ הכי מסוכן',
          channelValue: 'WhatsApp',
          channelMeta: '71% זיהוי',
          emailLabel: 'אימייל',
        }
      : {
          badge: 'Practical human-risk reduction for Israeli teams',
          title: 'See where your organization is exposed to phishing in minutes',
          subtitle:
            'PhishGuard AI simulates realistic phishing messages, trains employees, and shows managers where the risk is, who needs a refresher, and what to do next.',
          ctaPrimary: 'Book a demo',
          ctaSecondary: 'Start a trial',
          trustedBy: 'Built for schools, municipalities, nonprofits, care homes, and SMBs',
          trustedMarks: ['Education', 'Municipal', 'Nonprofits', 'Care', 'SMBs'],
          dashboardTitle: 'PhishGuard AI Manager Dashboard',
          riskLabel: 'Organization Risk Score',
          riskValue: '64',
          riskMeta: 'Medium',
          refresherLabel: 'Employees needing refreshers',
          refresherValue: '12',
          refresherMeta: 'out of 84',
          channelLabel: 'Most risky channel',
          channelValue: 'WhatsApp',
          channelMeta: '71% detection',
          emailLabel: 'Email',
        }

  return (
    <section className="relative overflow-hidden" dir={dir}>
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 ltr:right-0 rtl:left-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 ltr:left-0 rtl:right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 py-20 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{copy.badge}</span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground lg:text-xl">
            {copy.subtitle}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={buildSalesWhatsAppUrl(SALES_WHATSAPP_DEMO_MESSAGE)}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="lg" className="group h-12 px-8 text-base">
                {copy.ctaPrimary}
                <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
              </Button>
            </a>
            <Link href="/auth/signup">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                <Play className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {copy.ctaSecondary}
              </Button>
            </Link>
          </div>

          <p className="mt-12 text-sm text-muted-foreground">{copy.trustedBy}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-50">
            {copy.trustedMarks.map((company) => (
              <span key={company} className="text-lg font-semibold text-muted-foreground">
                {company}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl lg:mt-24">
          <div className="rounded-xl border border-border/50 bg-card/50 p-2 shadow-2xl backdrop-blur-sm">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/70" />
                  <div className="h-3 w-3 rounded-full bg-warning/70" />
                  <div className="h-3 w-3 rounded-full bg-success/70" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-sm text-muted-foreground">{copy.dashboardTitle}</span>
                </div>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{copy.riskLabel}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                      <Shield className="h-4 w-4 text-success" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{copy.riskValue}</span>
                    <span className="ltr:ml-2 rtl:mr-2 text-sm text-success">{copy.riskMeta}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{copy.refresherLabel}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{copy.refresherValue}</span>
                    <span className="ltr:ml-2 rtl:mr-2 text-sm text-muted-foreground">{copy.refresherMeta}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{copy.channelLabel}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                      <span className="text-sm">!</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{copy.channelValue}</span>
                    <span className="ltr:ml-2 rtl:mr-2 text-sm text-muted-foreground">{copy.channelMeta}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-6 py-4">
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">{copy.emailLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm font-medium">SMS</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur-2xl" />
        </div>
      </div>
    </section>
  )
}
