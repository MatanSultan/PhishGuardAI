'use client'

import { AlertTriangle, EyeOff, Users } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

export function Problem() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'למה הסיכון האנושי נשאר מתחת לרדאר',
          bullets: [
            {
              icon: AlertTriangle,
              title: 'הודעות מתחזות נראות אמינות',
              desc: 'חשבוניות, הודעות מהורים, ספקים או בקשות ב-WhatsApp נראות כמו עבודה רגילה.',
            },
            {
              icon: EyeOff,
              title: 'קשה לדעת איפה הסיכון',
              desc: 'בלי תמונה מסודרת קשה להבין מי נופל, באיזה ערוץ, ואיפה צריך לרענן.',
            },
            {
              icon: Users,
              title: 'אין זמן ואין צוות סייבר',
              desc: 'ברוב הארגונים מי שמטפל בזה הוא מנהל תפעול, IT או משאבי אנוש וצריך פתרון פשוט.',
            },
          ],
        }
      : {
          title: 'Why human risk stays under the radar',
          bullets: [
            {
              icon: AlertTriangle,
              title: 'Fake messages look legitimate',
              desc: 'Invoices, parent messages, vendor requests, and WhatsApp chats blend into normal work.',
            },
            {
              icon: EyeOff,
              title: 'Managers cannot see where the risk sits',
              desc: 'Without a clear view, it is hard to know who is vulnerable, by channel, and what to fix first.',
            },
            {
              icon: Users,
              title: 'Most teams do not have security staff',
              desc: 'Ops, IT, or HR managers need something simple they can actually run.',
            },
          ],
        }

  return (
    <section className="bg-card py-16 lg:py-20" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl text-center">
          {copy.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {copy.bullets.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-xl border border-border bg-muted/40 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <Icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
