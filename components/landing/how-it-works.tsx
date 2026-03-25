'use client'

import { Mail, Search, GraduationCap, TrendingUp } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

const stepIcons = [Mail, Search, GraduationCap, TrendingUp]

export function HowItWorks() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'איך זה עובד',
          subtitle: '4 צעדים פשוטים למנהלים ללא צוות אבטחה.',
          steps: [
            { number: '01', title: 'סימולציה', description: 'AI יוצר תרחישים מקומיים במייל, SMS או וואטסאפ.' },
            { number: '02', title: 'זיהוי', description: 'הצוות מחליט אם ההודעה בטוחה או פישינג.' },
            { number: '03', title: 'למידה', description: 'משוב AI מסביר בעברית/אנגלית את הסימנים החשובים.' },
            { number: '04', title: 'שיפור', description: 'ציון סיכון, רענון ממוקד, והמלצה לפעולה למנהלים.' },
          ],
        }
      : {
          title: 'How it works',
          subtitle: '4 simple steps for teams without a security staff.',
          steps: [
            { number: '01', title: 'Simulate', description: 'AI generates local email, SMS, or WhatsApp scenarios.' },
            { number: '02', title: 'Detect', description: 'Employees decide if it is safe or phishing.' },
            { number: '03', title: 'Learn', description: 'AI feedback explains the red flags in English or Hebrew.' },
            { number: '04', title: 'Improve', description: 'Risk Score, targeted refreshers, and manager next steps.' },
          ],
        }

  return (
    <section id="how-it-works" className="py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {copy.subtitle}
          </p>
        </div>

        <div className="relative mt-16">
          <div className="absolute top-24 hidden h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-4 lg:gap-12">
            {copy.steps.map((step, index) => {
              const Icon = stepIcons[index]
              return (
                <div key={step.number} className="relative text-center">
                  <div className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/10" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {step.number}
                    </div>
                  </div>

                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>

                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
