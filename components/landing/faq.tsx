'use client'

import { useLocale } from '@/lib/locale-context'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function FAQ() {
  const { locale, dir } = useLocale()
  const copy =
    locale === 'he'
      ? {
          title: 'שאלות נפוצות',
          subtitle: 'השאלות שמנהלים שואלים לפני שמתחילים',
          items: [
            {
              question: 'איך נראים התרחישים בפועל?',
              answer:
                'התרחישים מבוססים על הודעות שהעובדים באמת פוגשים: חשבוניות, הודעות מהורים, ספקים, משלוחים, התראות כניסה והודעות WhatsApp.',
            },
            {
              question: 'כמה מהר אפשר להתחיל?',
              answer:
                'בדרך כלל מהר מאוד. בוחרים סוג ארגון, מזמינים עובדים ומתחילים לראות תמונה ראשונה בלי פרויקט הטמעה כבד.',
            },
            {
              question: 'צריך צוות סייבר כדי לעבוד עם המערכת?',
              answer:
                'לא. המערכת נבנתה למנהלים שאינם אנשי סייבר, עם דוחות והמלצות בשפה פשוטה.',
            },
            {
              question: 'המערכת תומכת בעברית ובאנגלית?',
              answer:
                'כן. הממשק, הסימולציות והסיכומים עובדים בעברית ובאנגלית, עם תמיכה מלאה ב-RTL וב-LTR.',
            },
            {
              question: 'מה המנהל רואה בסוף?',
              answer:
                'ציון סיכון ארגוני, תחומים חלשים, עובדים שצריכים רענון והמלצות ברורות לצעד הבא.',
            },
          ],
        }
      : {
          title: 'Frequently asked questions',
          subtitle: 'What managers usually ask before they start',
          items: [
            {
              question: 'What do the scenarios actually look like?',
              answer:
                'They are built around everyday messages employees already get: invoices, parent messages, suppliers, deliveries, login warnings, and WhatsApp impersonation.',
            },
            {
              question: 'How quickly can we start?',
              answer:
                'Usually very quickly. You choose your organization type, invite employees, and can begin a pilot without a heavy rollout project.',
            },
            {
              question: 'Do we need a security team to run this?',
              answer:
                'No. The product is built for managers who are not security specialists, with reports and recommendations written in plain language.',
            },
            {
              question: 'Is the platform available in multiple languages?',
              answer:
                'Yes. PhishGuard AI supports both Hebrew and English, including RTL and LTR layouts.',
            },
            {
              question: 'What does a manager see at the end?',
              answer:
                'An organization Risk Score, weak topics, employees who need refreshers, and clear next-step recommendations.',
            },
          ],
        }

  return (
    <section id="faq" className="py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {copy.items.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-start text-base font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
