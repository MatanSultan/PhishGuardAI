'use client'

import { AlertTriangle, EyeOff, Users } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

export function Problem() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'למה צריך פתרון עכשיו',
          bullets: [
            { icon: AlertTriangle, title: 'הודעות פישינג מתרבות', desc: 'חשבוניות, הודעות הורים, ספקים ווואטסאפ נראות אמיתיות.' },
            { icon: EyeOff, title: 'למנהלים אין שקיפות', desc: 'קשה לדעת מי חלש ובאיזה ערוץ עד שזה מאוחר מדי.' },
            { icon: Users, title: 'אין צוות סייבר', desc: 'מנהלי IT/תפעול צריכים מסלול מודרך ולא עוד פלטפורמה מורכבת.' },
          ],
        }
      : {
          title: 'Why teams still get phished',
          bullets: [
            { icon: AlertTriangle, title: 'Phishing keeps rising', desc: 'Invoices, parent messages, vendors, and WhatsApp look real.' },
            { icon: EyeOff, title: 'Managers lack visibility', desc: 'Hard to see who is weak and which channel is risky until it hurts.' },
            { icon: Users, title: 'No security team on staff', desc: 'Ops and IT leads need a guided path, not another complex tool.' },
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
