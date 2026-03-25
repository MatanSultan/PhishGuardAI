'use client'

import { useLocale } from '@/lib/locale-context'

type SegmentKey = 'nursing' | 'education' | 'nonprofit' | 'municipality' | 'smb'

export function Segments() {
  const { locale, dir } = useLocale()
  const copy: Record<SegmentKey, { title: string; points: string[] }> =
    locale === 'he'
      ? {
          nursing: {
            title: 'בתי אבות',
            points: ['חשבוניות ספקים ושינויי חשבון', 'בקשות וואטסאפ מדמויות מוכרות', 'תיאום משלוחים ותרופות'],
          },
          education: {
            title: 'בתי ספר',
            points: ['הורים ותרחישי התחזות הנהלה', 'אזהרות כניסה ל-Google/Microsoft', 'הודעות רשמיות ממשרד החינוך'],
          },
          nonprofit: {
            title: 'עמותות',
            points: ['תרומות ומקדמות אירועים', 'ריכוז מתנדבים ובקשות קוד', 'הודעות רשות/רשם העמותות'],
          },
          municipality: {
            title: 'רשויות מקומיות',
            points: ['מכתבים רשמיים וגבייה', 'ספקים והעברת תשלומים', 'בקשות קוד ואישורי רכש'],
          },
          smb: {
            title: 'SMB',
            points: ['חשבוניות ושינויי בנק', 'משלוחים ודמי טיפול', 'ספק חדש במספר וואטסאפ שונה'],
          },
        }
      : {
          nursing: {
            title: 'Nursing homes',
            points: ['Supplier invoices and bank changes', 'WhatsApp requests from “managers” or family', 'Delivery and medication coordination'],
          },
          education: {
            title: 'Education networks',
            points: ['Parent / principal impersonation', 'Google / Microsoft access warnings', 'Official-looking ministry notices'],
          },
          nonprofit: {
            title: 'Nonprofits',
            points: ['Donation and event prepayments', 'Volunteer coordination scams', 'Registrar / authority notices'],
          },
          municipality: {
            title: 'Municipalities',
            points: ['Official-looking billing/arnona', 'Vendor payment reroutes', 'Internal approval + code requests'],
          },
          smb: {
            title: 'SMBs',
            points: ['Invoice fraud and vendor changes', 'Courier fee SMS', 'New-number supplier on WhatsApp'],
          },
        }

  return (
    <section className="border-t border-border bg-muted/20 py-20 lg:py-28" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {locale === 'he' ? 'מותאם לסגמנטים בישראל' : 'Built for the segments you serve'}
          </h2>
          <p className="mt-3 text-pretty text-lg text-muted-foreground">
            {locale === 'he'
              ? 'תרחישים, סיכומים ודו"חות שמרגישים מקומיים ומובנים למנהלים לא טכניים.'
              : 'Scenarios, summaries, and reports that feel local and manager-friendly.'}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(copy) as SegmentKey[]).map((key) => (
            <div key={key} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold">{copy[key].title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {copy[key].points.map((point) => (
                  <li key={point} className="rounded-md bg-muted/40 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
