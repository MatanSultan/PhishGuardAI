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
          subtitle: 'תשובות קצרות לשאלות שעולות לפני דמו או פיילוט',
          items: [
            {
              question: 'איך נראים התרחישים בפועל?',
              answer:
                'כמו הודעות שעובדים באמת מקבלים: חשבוניות, הודעות מהורים, ספקים, משלוחים, התראות כניסה ו-WhatsApp.',
            },
            {
              question: 'כמה מהר אפשר להתחיל?',
              answer:
                'בדרך כלל מהר. בוחרים סוג ארגון, מזמינים עובדים ורואים תמונת סיכון ראשונית בלי פרויקט כבד.',
            },
            {
              question: 'צריך צוות סייבר כדי לעבוד עם המערכת?',
              answer:
                'לא. המערכת נבנתה למנהלים שאינם אנשי סייבר, עם הסברים ודוחות בשפה פשוטה.',
            },
            {
              question: 'המערכת תומכת בעברית ובאנגלית?',
              answer:
                'כן. הממשק, הסימולציות והסיכומים זמינים בעברית ובאנגלית, עם תמיכה מלאה ב-RTL ו-LTR.',
            },
            {
              question: 'מה המנהל רואה בסוף?',
              answer:
                'ציון סיכון ארגוני, תחומים חלשים, מי צריך רענון ומה כדאי לעשות עכשיו.',
            },
          ],
        }
      : {
          title: 'Frequently asked questions',
          subtitle: 'Short answers before a demo or pilot',
          items: [
            {
              question: 'What do the scenarios actually look like?',
              answer:
                'Like the messages employees already get: invoices, parent messages, suppliers, deliveries, login warnings, and WhatsApp.',
            },
            {
              question: 'How quickly can we start?',
              answer:
                'Usually fast. Choose your organization type, invite employees, and get an initial risk picture without a heavy rollout.',
            },
            {
              question: 'Do we need a security team to run this?',
              answer:
                'No. The product is built for managers who are not security specialists, with plain-language guidance and reports.',
            },
            {
              question: 'Is the platform available in multiple languages?',
              answer:
                'Yes. The interface, simulations, and summaries are available in Hebrew and English, with full RTL and LTR support.',
            },
            {
              question: 'What does a manager see at the end?',
              answer:
                'An organization Risk Score, weak areas, who needs a refresher, and what to do next.',
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
