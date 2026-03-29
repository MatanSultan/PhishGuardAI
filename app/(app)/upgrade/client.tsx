'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LatestOrderSummary {
  amount: number
  currency: string
  createdAt: string
  status: string
  capturedAt: string | null
  payerEmail: string | null
  targetPlanType: string
  targetMaxMembers: number
  paymentStatus: string | null
}

interface UpgradePageClientProps {
  locale: 'he' | 'en'
  organizationName: string
  currentLimit: number
  backHref: string
  isOrganizationAdmin: boolean
  checkoutConfigured: boolean
  checkoutAmount: string
  checkoutCurrency: string
  targetPlanType: string
  targetMaxMembers: number
  latestOrder: LatestOrderSummary | null
}

function formatMoney(locale: 'he' | 'en', amount: string | number, currency: string) {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

export default function UpgradePageClient({
  locale,
  organizationName,
  currentLimit,
  backHref,
  isOrganizationAdmin,
  checkoutConfigured,
  checkoutAmount,
  checkoutCurrency,
  targetPlanType,
  targetMaxMembers,
  latestOrder,
}: UpgradePageClientProps) {
  const searchParams = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const copy = useMemo(
    () =>
      locale === 'he'
        ? {
            eyebrow: 'שדרוג אמיתי ומאומת',
            title: 'הפכו את הארגון למסלול פעיל בתשלום',
            subtitle:
              'התשלום נוצר ב-PayPal, מאומת בשרת, ורק אחרי אישור אמיתי המסלול של הארגון משתדרג אוטומטית.',
            adminOnlyTitle: 'רק מנהל ארגון יכול לבצע את השדרוג',
            adminOnlyDescription:
              'המסלול חל על כל הארגון, לכן רק מנהל פעיל יכול לפתוח checkout ולבצע שדרוג.',
            configMissingTitle: 'התשלום עדיין לא זמין בסביבה הזאת',
            configMissingDescription:
              'הגדרות PayPal עדיין לא הושלמו. אפשר להשלים את ה-env ולהפעיל את ה-checkout בלי לשנות קוד.',
            primary: 'המשך ל-PayPal',
            fallback: 'חזרה',
            whatYouGet: 'מה נפתח אחרי האימות',
            list: [
              `המסלול עובר ל-${targetPlanType} עם עד ${targetMaxMembers} משתמשים פעילים.`,
              'העדכון נשמר בשרת ומופיע בקונסולת הבעלים כאירוע מערכת.',
              'אין שדרוג על בסיס redirect בלבד. רק capture/verification אמיתי.',
            ],
            priceTitle: 'תשלום ניסוי',
            priceDescription: 'מחיר בדיקה קטן שאפשר להחליף אחר כך מהקונפיגורציה.',
            currentLimit: 'מגבלת המסלול הנוכחית',
            targetPlan: 'מסלול יעד',
            secureNote: 'האישור מתבצע בשרת לפני שינוי המסלול.',
            success: 'התשלום אומת והארגון שודרג בהצלחה.',
            failed: 'לא הצלחנו לאמת את התשלום. אם הכסף נגבה, בדקו את הלוגים או נסו שוב.',
            canceled: 'ה-checkout בוטל. לא בוצע שדרוג.',
            latestTitle: 'סטטוס חיוב אחרון',
            latestDescription: 'כך אפשר לראות אם כבר נפתח order, נקלט תשלום, או בוצע שדרוג.',
            latestAmount: 'סכום',
            latestStatus: 'סטטוס order',
            latestPayment: 'סטטוס payment',
            latestCaptured: 'נקלט ב',
            latestPayer: 'payer',
            noBillingYet: 'עדיין אין הזמנת חיוב קודמת עבור הארגון הזה.',
          }
        : {
            eyebrow: 'Verified upgrade flow',
            title: 'Upgrade this organization with a real payment',
            subtitle:
              'The payment is created in PayPal, verified on the server, and only then the organization is upgraded automatically.',
            adminOnlyTitle: 'Only an organization admin can upgrade the plan',
            adminOnlyDescription:
              'The subscription applies to the whole organization, so only an active org admin can open checkout.',
            configMissingTitle: 'Payments are not configured in this environment yet',
            configMissingDescription:
              'PayPal env settings still need to be added. Once they are present, checkout works without changing code.',
            primary: 'Continue to PayPal',
            fallback: 'Back',
            whatYouGet: 'What unlocks after verification',
            list: [
              `The organization moves to ${targetPlanType} with up to ${targetMaxMembers} active members.`,
              'The update is recorded on the backend and appears in the owner console as a system event.',
              'Redirect alone never upgrades the plan. Only verified capture does.',
            ],
            priceTitle: 'Experimental test payment',
            priceDescription: 'A tiny test amount that can be changed later from config.',
            currentLimit: 'Current plan limit',
            targetPlan: 'Target plan',
            secureNote: 'The plan changes only after backend verification.',
            success: 'Payment was verified and the organization was upgraded successfully.',
            failed: 'We could not verify the payment yet. If funds were captured, review the logs or try again.',
            canceled: 'Checkout was canceled. No upgrade was applied.',
            latestTitle: 'Latest billing status',
            latestDescription: 'This shows whether a checkout was created, a payment was captured, and an upgrade was applied.',
            latestAmount: 'Amount',
            latestStatus: 'Order status',
            latestPayment: 'Payment status',
            latestCaptured: 'Captured at',
            latestPayer: 'Payer',
            noBillingYet: 'No previous billing order exists for this organization yet.',
          },
    [checkoutCurrency, locale, targetMaxMembers, targetPlanType],
  )

  const checkoutStatus = searchParams.get('checkout')
  const noDataLabel = locale === 'he' ? 'אין נתון עדיין' : 'No data yet'
  const latestOrderCreatedAt = latestOrder
    ? new Date(latestOrder.createdAt).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US')
    : null
  const latestCapturedAt = latestOrder?.capturedAt
    ? new Date(latestOrder.capturedAt).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US')
    : null

  const handleCheckout = async () => {
    setCheckoutError(null)
    setIsRedirecting(true)

    try {
      const response = await fetch('/api/billing/paypal/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.approvalUrl) {
        setCheckoutError(payload?.error ?? (locale === 'he' ? 'לא הצלחנו לפתוח checkout.' : 'Unable to start checkout.'))
        setIsRedirecting(false)
        return
      }

      window.location.href = payload.approvalUrl
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : locale === 'he' ? 'לא הצלחנו לפתוח checkout.' : 'Unable to start checkout.')
      setIsRedirecting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10 lg:px-8" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="rounded-3xl border border-border/60 bg-gradient-to-b from-background to-muted/30 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              <ShieldCheck className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
              {copy.eyebrow}
            </Badge>
            <Badge variant="outline">{organizationName}</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
      </header>

      {checkoutStatus ? (
        <div
          className={cn(
            'rounded-2xl border p-4 text-sm shadow-sm',
            checkoutStatus === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : checkoutStatus === 'canceled'
                ? 'border-border/60 bg-muted/40 text-muted-foreground'
                : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {checkoutStatus === 'success'
            ? copy.success
            : checkoutStatus === 'canceled'
              ? copy.canceled
              : copy.failed}
        </div>
      ) : null}

      {checkoutError ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive shadow-sm">
          {checkoutError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{copy.whatYouGet}</CardTitle>
              <CardDescription>{copy.secureNote}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {copy.list.map((item) => (
                <div key={item} className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>{copy.latestTitle}</CardTitle>
              <CardDescription>{copy.latestDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {latestOrder ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestAmount}</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatMoney(locale, latestOrder.amount, latestOrder.currency)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{latestOrderCreatedAt}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestStatus}</p>
                    <p className="mt-2 text-lg font-semibold">{latestOrder.status}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {copy.latestPayment}: {latestOrder.paymentStatus ?? noDataLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestCaptured}</p>
                    <p className="mt-2 text-sm font-medium">{latestCapturedAt ?? noDataLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestPayer}</p>
                    <p className="mt-2 text-sm font-medium break-all">{latestOrder.payerEmail ?? noDataLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  {copy.noBillingYet}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-primary/25 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {copy.priceTitle}
              </CardTitle>
              <CardDescription>{copy.priceDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.priceTitle}</p>
                <p className="mt-2 text-3xl font-semibold">
                  {formatMoney(locale, checkoutAmount, checkoutCurrency)}
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                  <p className="text-muted-foreground">{copy.currentLimit}</p>
                  <p className="mt-1 font-semibold">{currentLimit}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
                  <p className="text-muted-foreground">{copy.targetPlan}</p>
                  <p className="mt-1 font-semibold">{targetPlanType}</p>
                </div>
              </div>

              {!isOrganizationAdmin ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
                  <p className="font-medium">{copy.adminOnlyTitle}</p>
                  <p className="mt-1 text-muted-foreground">{copy.adminOnlyDescription}</p>
                </div>
              ) : null}

              {!checkoutConfigured ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground">
                  <p className="font-medium">{copy.configMissingTitle}</p>
                  <p className="mt-1 text-muted-foreground">{copy.configMissingDescription}</p>
                </div>
              ) : null}

              <Button
                onClick={() => void handleCheckout()}
                className="w-full"
                disabled={!isOrganizationAdmin || !checkoutConfigured || isRedirecting}
              >
                {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : <ExternalLink className="h-4 w-4 ltr:mr-2 rtl:ml-2" />}
                {copy.primary}
              </Button>

              <Link href={backHref}>
                <Button variant="outline" className="w-full">
                  <ArrowRight className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {copy.fallback}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{copy.secureNote}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                <span>{locale === 'he' ? 'PayPal מחזיר חזרה רק אחרי אישור. השדרוג קורה אחרי capture מאומת.' : 'PayPal returns only after approval. The upgrade happens after verified capture.'}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{locale === 'he' ? 'אם checkout בוטל או האימות נכשל, המסלול לא משתנה.' : 'If checkout is canceled or verification fails, the plan does not change.'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
