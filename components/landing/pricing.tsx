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
          title: 'תמחור פשוט שמתחבר לערך',
          subtitle: 'קל להבין מה מקבלים, וקל להתחיל בפיילוט או בהטמעה רחבה יותר.',
          popularBadge: 'המסלול המומלץ',
          plans: [
            {
              name: 'Starter / SMB',
              price: 'ILS 1,200-1,800',
              period: '/חודש',
              description: 'לעסקים קטנים וארגונים עד כ-80 עובדים',
              features: [
                'סימולציות באימייל, SMS ו-WhatsApp בעברית ובאנגלית',
                'ציון סיכון ארגוני ודוחות בסיס למנהל',
                'תרחישים מותאמים למגזר ולשימוש מהיר בפיילוט',
                'תמיכה במייל והקמה מהירה',
              ],
              cta: 'התחלת פיילוט',
              popular: false,
            },
            {
              name: 'Growth / Organization',
              price: 'ILS 3,200-4,800',
              period: '/חודש',
              description: 'לארגונים עד כ-300 עובדים שצריכים תמונת מצב מלאה',
              features: [
                'סיכומי מנהלים עם המלצות פעולה פשוטות',
                'תובנות לפי ערוץ, נושא וקבוצות עובדים',
                'תרחישים מותאמים לחינוך, רשויות, עמותות, בתי אבות ו-SMB',
                'תמיכה מועדפת וליווי עליה לאוויר',
              ],
              cta: 'לתיאום דמו',
              popular: true,
            },
            {
              name: 'Managed add-on',
              price: '+ILS 1,200-2,000',
              period: '/חודש',
              description: 'לארגונים בלי איש סייבר פנימי',
              features: [
                'רענון תכנים רבעוני ועדכון תרחישים',
                'מפגשי מנהלים והדרכות קצרות לעובדים',
                'ליווי שוטף לדמו, הטמעה וביקורת רבעונית',
              ],
              cta: 'לדבר איתנו',
              popular: false,
            },
          ],
        }
      : {
          title: 'Pricing that is easy to explain',
          subtitle: 'Clear plans, clear value, and a simple path to pilot or rollout.',
          popularBadge: 'Most popular',
          plans: [
            {
              name: 'Starter / SMB',
              price: 'ILS 1,200-1,800',
              period: '/mo',
              description: 'For small teams and organizations up to about 80 employees',
              features: [
                'Email, SMS, and WhatsApp simulations in Hebrew and English',
                'Organization Risk Score and baseline manager reports',
                'Segment-aware scenarios for a fast pilot launch',
                'Email support and quick setup',
              ],
              cta: 'Start a pilot',
              popular: false,
            },
            {
              name: 'Growth / Organization',
              price: 'ILS 3,200-4,800',
              period: '/mo',
              description: 'For organizations up to about 300 employees that need full manager visibility',
              features: [
                'Manager summaries with practical next actions',
                'Insights by channel, topic, and employee group',
                'Organization-tuned simulations for Israeli segments',
                'Priority support and light onboarding help',
              ],
              cta: 'Book a demo',
              popular: true,
            },
            {
              name: 'Managed add-on',
              price: '+ILS 1,200-2,000',
              period: '/mo',
              description: 'For teams without in-house security staff',
              features: [
                'Quarterly scenario refresh and content tuning',
                'Manager workshops and short employee sessions',
                'Ongoing support for demos, rollout, and quarterly reviews',
              ],
              cta: 'Talk to us',
              popular: false,
            },
          ],
        }

  return (
    <section id="pricing" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {copy.plans.map((plan, index) => {
            const isPopular = 'popular' in plan && plan.popular
            return (
              <div
                key={index}
                className={cn(
                  'relative rounded-2xl border bg-card p-8 transition-all',
                  isPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border',
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                      {copy.popularBadge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

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

                <Link href="/auth/signup" className="block">
                  <Button
                    className={cn(
                      'w-full',
                      isPopular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
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
