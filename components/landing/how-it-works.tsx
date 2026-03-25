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
          subtitle: 'ארבעה צעדים פשוטים שמראים ערך מהר.',
          steps: [
            {
              number: '01',
              title: 'מדמים',
              description: 'המערכת שולחת תרחישים מציאותיים באימייל, SMS או WhatsApp לפי סוג הארגון.',
            },
            {
              number: '02',
              title: 'מזהים',
              description: 'העובדים מסמנים אם מדובר בהודעה בטוחה או בניסיון התחזות.',
            },
            {
              number: '03',
              title: 'לומדים',
              description: 'כל תשובה מקבלת הסבר קצר, ברור ורלוונטי לעבודה היומיומית.',
            },
            {
              number: '04',
              title: 'משפרים',
              description: 'המנהל רואה ציון סיכון, עובדים לרענון והמלצה ברורה לצעד הבא.',
            },
          ],
        }
      : {
          title: 'How it works',
          subtitle: 'Four simple steps that show value fast.',
          steps: [
            {
              number: '01',
              title: 'Simulate',
              description: 'The system sends realistic email, SMS, or WhatsApp scenarios based on your organization type.',
            },
            {
              number: '02',
              title: 'Detect',
              description: 'Employees decide whether the message is safe or a phishing attempt.',
            },
            {
              number: '03',
              title: 'Learn',
              description: 'Every answer gets short, practical feedback in Hebrew or English.',
            },
            {
              number: '04',
              title: 'Improve',
              description: 'Managers see the Risk Score, who needs refreshers, and the next recommended step.',
            },
          ],
        }

  return (
    <section id="how-it-works" className="py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{copy.subtitle}</p>
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
