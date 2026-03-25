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
            points: [
              'חשבוניות ספקים ושינויי פרטי בנק',
              'הודעות WhatsApp שמתחזות למנהלת או לבן משפחה',
              'תיאום משלוחי תרופות, ציוד וטיפול',
            ],
          },
          education: {
            title: 'חינוך',
            points: [
              'הודעות מהורים והתחזות להנהלה',
              'אזהרות גישה ל-Google או Microsoft',
              'עדכונים שנראים כאילו הגיעו ממשרד החינוך',
            ],
          },
          nonprofit: {
            title: 'עמותות',
            points: [
              'בקשות תרומה או תשלום שנראות אמיתיות',
              'התחזות בריכוז מתנדבים והודעות דחופות',
              'פניות רשמיות כביכול מרשם העמותות או מרשות',
            ],
          },
          municipality: {
            title: 'רשויות מקומיות',
            points: [
              'הודעות רשמיות למראה, גבייה וארנונה',
              'בקשות תשלום מספקים ושינויי חשבון',
              'אישורים דחופים ממנהלים וקודי אימות',
            ],
          },
          smb: {
            title: 'SMB',
            points: [
              'חשבוניות מזויפות ושינויי פרטי ספק',
              'הודעות משלוח ועמלות טיפול ב-SMS',
              'ספק שכותב ממספר חדש ב-WhatsApp',
            ],
          },
        }
      : {
          nursing: {
            title: 'Nursing homes',
            points: [
              'Supplier invoices and bank-detail changes',
              'WhatsApp messages impersonating managers or family members',
              'Medication, equipment, and delivery coordination',
            ],
          },
          education: {
            title: 'Education networks',
            points: [
              'Parent and principal impersonation',
              'Google or Microsoft access warnings',
              'Official-looking ministry notices',
            ],
          },
          nonprofit: {
            title: 'Nonprofits',
            points: [
              'Donation and payment requests that look real',
              'Volunteer coordination scams and urgent messages',
              'Registrar or authority notices',
            ],
          },
          municipality: {
            title: 'Municipalities',
            points: [
              'Official-looking billing and arnona notices',
              'Vendor payment reroutes and bank-detail changes',
              'Urgent approvals and verification-code requests',
            ],
          },
          smb: {
            title: 'SMBs',
            points: [
              'Invoice fraud and supplier-detail changes',
              'Courier fee SMS messages',
              'Suppliers reaching out from a new WhatsApp number',
            ],
          },
        }

  return (
    <section className="border-t border-border bg-muted/20 py-20 lg:py-28" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {locale === 'he' ? 'מרגיש רלוונטי מהדקה הראשונה' : 'Relevant from the first minute'}
          </h2>
          <p className="mt-3 text-pretty text-lg text-muted-foreground">
            {locale === 'he'
              ? 'כל מגזר רואה תרחישים, סיכומים ודוחות שמדברים את היום-יום שלו.'
              : 'Each segment sees scenarios, summaries, and reports that match its daily reality.'}
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
