import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCookieLocale } from '@/lib/i18n-server'
import {
  SALES_CONTACT_EMAIL,
  SALES_WHATSAPP_DEMO_MESSAGE,
  SALES_WHATSAPP_TRIAL_MESSAGE,
  SALES_WHATSAPP_UPGRADE_MESSAGE,
  buildSalesWhatsAppUrl,
} from '@/lib/constants'

export default async function UpgradePage() {
  const locale = await getCookieLocale()
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin?next=/upgrade')
  }

  const supabase = await createServerSupabaseClient()
  const context = await getCurrentOrganizationContext(supabase, user.id)

  const orgName =
    context?.organization.name ?? (locale === 'he' ? 'הארגון שלכם' : 'Your organization')
  const currentLimit = context?.organization.max_members_allowed ?? 1
  const planStatus = context?.organization.plan_status ?? 'free'
  const accessBlocked = Boolean(context?.organization.access_blocked)
  const backHref = context?.membership.role === 'admin' ? '/admin' : '/dashboard'

  const copy =
    locale === 'he'
      ? {
          headline:
            planStatus === 'past_due'
              ? 'ההזמנות נעצרו עד להסדרת החשבון'
              : accessBlocked || planStatus === 'blocked'
                ? 'הגישה לשימוש צוותי חסומה כרגע'
                : 'הארגון שלכם כרגע במסלול היכרות',
          description:
            planStatus === 'past_due'
              ? 'ברגע שמסדירים את החשבון, אפשר לחזור להזמין עובדים ולהמשיך לעבוד כרגיל.'
              : accessBlocked || planStatus === 'blocked'
                ? 'אחרי פתיחה מחדש תוכלו להוסיף עובדים, להפעיל שימוש צוותי ולהמשיך מאותה נקודה.'
                : `אפשר להמשיך לבד. כדי להוסיף עובדים, לפתוח שימוש צוותי מלא ולקבל דוחות מנהלים, צריך לשדרג. כרגע המגבלה היא ${currentLimit} משתמש${currentLimit === 1 ? ' פעיל אחד' : 'ים פעילים'}.`,
          supportTitle: 'מה נפתח אחרי השדרוג',
          supportItems: [
            'הזמנת עובדים נוספים בלחיצה אחת',
            'תרגול צוותי ודוחות מנהלים מלאים',
            'ליווי פשוט להתחלה מהירה או לפיילוט',
          ],
          nextStepTitle: 'השלב הבא פשוט',
          nextStepText:
            'אפשר להתחיל תקופת ניסיון, לתאם דמו קצר או לשלוח לנו הודעה ב-WhatsApp.',
          primary: 'שיחה ב-WhatsApp',
          secondary: 'תיאום דמו',
          tertiary: 'התחלת תקופת ניסיון',
          back: backHref === '/admin' ? 'חזרה לניהול' : 'חזרה למערכת',
          contextLabel: 'סטטוס נוכחי',
          contextValue:
            planStatus === 'past_due'
              ? 'חיוב בעיכוב'
              : accessBlocked || planStatus === 'blocked'
                ? 'גישה חסומה'
                : 'מסלול היכרות',
        }
      : {
          headline:
            planStatus === 'past_due'
              ? 'Team invites are paused until billing is settled'
              : accessBlocked || planStatus === 'blocked'
                ? 'Team access is currently blocked'
                : 'Your organization is currently on the free exploration plan',
          description:
            planStatus === 'past_due'
              ? 'Once billing is settled, you can invite employees again and continue normally.'
              : accessBlocked || planStatus === 'blocked'
                ? 'After access is restored, you can add employees, unlock full team use, and continue from the same point.'
                : `You can keep exploring alone. To add employees, unlock full team use, and get full manager reporting, you need to upgrade. The current limit is ${currentLimit} active member${currentLimit === 1 ? '' : 's'}.`,
          supportTitle: 'What opens after upgrade',
          supportItems: [
            'Invite more employees right away',
            'Unlock team training and full manager reports',
            'Get a simple path into a pilot or live rollout',
          ],
          nextStepTitle: 'The next step is simple',
          nextStepText:
            'Start a trial, book a short demo, or send us a WhatsApp message.',
          primary: 'WhatsApp',
          secondary: 'Book a demo',
          tertiary: 'Start a trial',
          back: backHref === '/admin' ? 'Back to admin' : 'Back to app',
          contextLabel: 'Current status',
          contextValue:
            planStatus === 'past_due'
              ? 'Past due'
              : accessBlocked || planStatus === 'blocked'
                ? 'Blocked'
                : 'Free exploration',
        }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 lg:px-8" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className="space-y-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>
              {copy.contextLabel}: {copy.contextValue}
            </span>
          </div>
          <div>
            <CardTitle className="text-2xl">{copy.headline}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {orgName}. {copy.description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <p className="font-semibold">{copy.supportTitle}</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {copy.supportItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">{copy.nextStepTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.nextStepText}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildSalesWhatsAppUrl(SALES_WHATSAPP_UPGRADE_MESSAGE)}
              target="_blank"
              rel="noreferrer"
            >
              <Button>
                <MessageCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {copy.primary}
              </Button>
            </a>
            <a
              href={buildSalesWhatsAppUrl(SALES_WHATSAPP_DEMO_MESSAGE)}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline">{copy.secondary}</Button>
            </a>
            <a
              href={buildSalesWhatsAppUrl(SALES_WHATSAPP_TRIAL_MESSAGE)}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline">{copy.tertiary}</Button>
            </a>
            <a href={`mailto:${SALES_CONTACT_EMAIL}?subject=${encodeURIComponent('PhishGuard AI upgrade request')}`}>
              <Button variant="ghost">
                {locale === 'he' ? 'מייל למכירות' : 'Email sales'}
              </Button>
            </a>
          </div>

          <Link href={backHref} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="ltr:order-last ltr:ml-2 rtl:mr-2 h-4 w-4" />
            {copy.back}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
