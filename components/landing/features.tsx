'use client'

import {
  ShieldCheck,
  Radar,
  Sparkles,
  BarChart3,
  MessageCircle,
  HeartHandshake,
} from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

const icons = [ShieldCheck, BarChart3, Radar, Sparkles, MessageCircle, HeartHandshake]

export function Features() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'מה מקבלים בפועל',
          subtitle:
            'לא עוד מערכת שמפציצה בנתונים. תמונה ברורה למה קורה ומה צריך לעשות עכשיו.',
          items: [
            {
              title: 'ציון סיכון שקל להסביר',
              description: 'מספר אחד שמראה מה מצב הארגון ומה מושך את הסיכון למטה.',
            },
            {
              title: 'תמונה ברורה למנהל',
              description: 'רואים מי צריך רענון, אילו נושאים חלשים, ומה הפעולה הבאה שכדאי לעשות.',
            },
            {
              title: 'תרחישים שמרגישים ישראליים',
              description: 'הודעות על חשבוניות, הורים, ספקים, משלוחים, רשויות ו-WhatsApp - לא דוגמאות גנריות מחו"ל.',
            },
            {
              title: 'סיכומים פשוטים להבנה',
              description: 'סיכומי AI בעברית ובאנגלית שמדברים בשפה של מנהלים, בלי מונחים מיותרים.',
            },
            {
              title: 'אימון על מצבים אמיתיים',
              description: 'אימייל, SMS ו-WhatsApp עם מצבים יומיומיים שהעובדים שלכם כבר פוגשים.',
            },
            {
              title: 'עובד גם בלי איש סייבר',
              description: 'תהליך ברור מהקמה ראשונית ועד רענון עובדים, בלי פרויקט מורכב ובלי עומס מיותר.',
            },
          ],
        }
      : {
          title: 'What managers actually get',
          subtitle: 'Not more noise. A clear picture of what is happening and what to do next.',
          items: [
            {
              title: 'A Risk Score you can explain',
              description: 'One score that shows the current risk level and the main reasons behind it.',
            },
            {
              title: 'Manager visibility',
              description: 'See who needs a refresher, which topics are weak, and the best next action.',
            },
            {
              title: 'Local scenarios for Israel',
              description: 'Parent messages, invoices, suppliers, deliveries, municipalities, and WhatsApp impersonation.',
            },
            {
              title: 'Plain-language summaries',
              description: 'AI summaries in Hebrew or English that managers can read and use immediately.',
            },
            {
              title: 'Training on real situations',
              description: 'Email, SMS, and WhatsApp examples that look like the messages employees already get.',
            },
            {
              title: 'Works without a security team',
              description: 'A guided flow from setup to refreshers, without adding another complex project.',
            },
          ],
        }

  return (
    <section id="features" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {copy.items.map((feature, index) => {
            const Icon = icons[index]
            return (
              <div
                key={feature.title}
                className="card-hover group rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
