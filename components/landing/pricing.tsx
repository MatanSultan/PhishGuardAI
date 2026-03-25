'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Pricing() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'תמחור ישר לישראל',
          subtitle: 'התחילו מהר, והוסיפו שירות מנוהל רק אם צריך.',
          plans: [
            {
              name: 'Starter / SMB',
              price: 'ILS 1,200–1,800',
              period: '/חודש',
              description: 'עד ~80 עובדים, מוכן לפיילוט מהיר',
              features: [
                'סימולציות ואימונים במייל/SMS/ווטסאפ (עברית/אנגלית)',
                'ציון סיכון ארגוני ודוחות בסיס',
                'תרחישי ברירת מחדל לפי מגזר (חינוך, רשויות, עמותות, בתי אבות, SMB)',
                'תמיכה במייל',
              ],
              cta: 'התחלת פיילוט',
              popular: false,
            },
            {
              name: 'Growth / Organization',
              price: 'ILS 3,200–4,800',
              period: '/חודש',
              description: 'עד ~300 עובדים עם נראות מלאה למנהלים',
              features: [
                'סיכומי AI למנהלים ותובנות לפי ערוץ',
                'ציון סיכון עם המלצות המשך',
                'סימולציות מותאמות למגזר ישראלי',
                'תמיכת Priority והכוונת קליטה',
              ],
              cta: 'תיאום דמו',
              popular: true,
            },
            {
              name: 'Managed add-on',
              price: '+ILS 1,200–2,000',
              period: '/חודש',
              description: 'שכבה מנוהלת לצוותים בלי אנשי סייבר',
              features: [
                'רענון פישינג רבעוני וכיוונון תוכן',
                'סדנאות מנהלים ומיני וובינרים לעובדים',
                'הדגמות ליווי וביקורות רבעוניות עם הנהלה',
              ],
              cta: 'דברו איתנו',
              popular: false,
            },
          ],
        }
      : {
          title: 'Straightforward pricing for Israeli teams',
          subtitle: 'Start fast, add managed service only if you need it.',
          plans: [
            {
              name: 'Starter / SMB',
              price: 'ILS 1,200–1,800',
              period: '/mo',
              description: 'Up to ~80 employees, ready for quick pilots',
              features: [
                'Email/SMS/WhatsApp simulations in English & Hebrew',
                'Organization Risk Score + baseline reports',
                'Segment presets (schools, municipalities, nonprofits, care, SMB)',
                'Email support',
              ],
              cta: 'Start a pilot',
              popular: false,
            },
            {
              name: 'Growth / Organization',
              price: 'ILS 3,200–4,800',
              period: '/mo',
              description: 'Up to ~300 employees with full manager visibility',
              features: [
                'AI summaries for managers and channel-level insights',
                'Risk Score with next actions',
                'Organization-tuned simulations and Israeli scenarios',
                'Priority support and light onboarding assist',
              ],
              cta: 'Book a demo',
              popular: true,
            },
            {
              name: 'Managed add-on',
              price: '+ILS 1,200–2,000',
              period: '/mo',
              description: 'For teams without security staff',
              features: [
                'Quarterly phishing refresh + content tuning',
                'Manager workshops and micro employee webinars',
                'Concierge demos and quarterly stakeholder reviews',
              ],
              cta: 'Talk to us',
              popular: false,
            },
          ],
        }


  return (
    <section id="pricing" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {copy.plans.map((plan, index) => {
            const isPopular = 'popular' in plan && plan.popular
            return (
              <div
                key={index}
                className={cn(
                  "relative rounded-2xl border bg-card p-8 transition-all",
                  isPopular
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                      Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href="/auth/signup" className="block">
                  <Button
                    className={cn(
                      "w-full",
                      isPopular
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
