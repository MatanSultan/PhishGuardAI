'use client'

import { ShieldCheck, Radar, Sparkles, BarChart3, MessageCircle, HeartHandshake } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

const icons = [ShieldCheck, BarChart3, Radar, Sparkles, MessageCircle, HeartHandshake]

export function Features() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'למה מנהלים אוהבים את PhishGuard AI',
          subtitle: 'מסר מכוון ערך, לא ג׳רגון אבטחה.',
          items: [
            { title: 'ציון סיכון ברור', description: 'מדד 0–100 שמראה אם הצוות בטוח או צריך חיזוק.' },
            { title: 'שקיפות למנהלים', description: 'מי זקוק לרענון, איזה ערוץ מסוכן, ומה לעשות עכשיו.' },
            { title: 'מותאם לסגמנט הישראלי', description: 'בתי ספר, רשויות, עמותות, בתי אבות ו-SMB עם תרחישים מקומיים.' },
            { title: 'AI שמדבר פשוט', description: 'תקציר מנהלים בעברית או אנגלית בלי מונחי סייבר מיותרים.' },
            { title: 'אימונים ריאליים', description: 'אימייל, SMS ו-WhatsApp עם חשבוניות, הורים, ספקים ודליברי.' },
            { title: 'עובד גם בלי צוות אבטחה', description: 'מסלול מודרך שמסביר מה לעשות צעד-אחר-צעד.' },
          ],
        }
      : {
          title: 'Why managers pick PhishGuard AI',
          subtitle: 'Value-first messaging, not security jargon.',
          items: [
            { title: 'Clear Risk Score', description: '0–100 score that shows if the team is safe or needs reinforcement.' },
            { title: 'Manager visibility', description: 'Who needs a refresher, which channel is risky, and the best next action.' },
            { title: 'Built for Israeli segments', description: 'Schools, municipalities, nonprofits, care homes, and SMBs with local scenarios.' },
            { title: 'AI that speaks plainly', description: 'Executive summaries in English or Hebrew without buzzwords.' },
            { title: 'Real-world drills', description: 'Email, SMS, and WhatsApp with invoices, parents, vendors, and deliveries.' },
            { title: 'Works without a security team', description: 'Guided flows that explain what to do step by step.' },
          ],
        }

  return (
    <section id="features" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {copy.subtitle}
          </p>
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
