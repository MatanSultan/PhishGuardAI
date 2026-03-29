import Link from 'next/link'
import { redirect } from 'next/navigation'

import UpgradePageClient from './client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth'
import { requireBillingConfig } from '@/lib/billing/config'
import { getOrganizationBillingSnapshot } from '@/lib/billing/service'
import { getCookieLocale } from '@/lib/i18n-server'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServiceSupabaseClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function UpgradePage() {
  const locale = await getCookieLocale()
  const user = await getSessionUser()

  if (!user) {
    redirect('/auth/signin?next=/upgrade')
  }

  const supabase = await createServerSupabaseClient()
  const context = await getCurrentOrganizationContext(supabase, user.id)

  if (!context) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 lg:px-8" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'he' ? 'צריך ארגון לפני שדרוג' : 'An organization is required before upgrade'}</CardTitle>
            <CardDescription>
              {locale === 'he'
                ? 'השדרוג חל על ארגון שלם. קודם צריך ליצור או להצטרף לארגון.'
                : 'Upgrades apply to an organization, so you need to create or join one first.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>{locale === 'he' ? 'חזרה למערכת' : 'Back to app'}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  let checkoutConfigured = true
  let checkoutAmount = '0.01'
  let checkoutCurrency = 'ILS'
  let targetPlanType = 'growth'
  let targetMaxMembers = 25
  const isOrganizationAdmin = context.membership.role === 'admin' && context.membership.status === 'active'

  try {
    const config = requireBillingConfig()
    checkoutAmount = config.upgradeAmount
    checkoutCurrency = config.upgradeCurrency
    targetPlanType = config.targetPlanType
    targetMaxMembers = config.targetMaxMembers
  } catch {
    checkoutConfigured = false
  }

  let latestOrder = null

  if (isOrganizationAdmin) {
    try {
      const service = getServiceSupabaseClient()
      const snapshot = await getOrganizationBillingSnapshot(service, context.organization.id)

      latestOrder = snapshot.latestOrder
        ? {
            amount: Number(snapshot.latestOrder.amount),
            currency: snapshot.latestOrder.currency,
            createdAt: snapshot.latestOrder.created_at,
            status: snapshot.latestOrder.status,
            capturedAt: snapshot.latestOrder.captured_at,
            payerEmail: snapshot.latestOrder.payer_email,
            targetPlanType: snapshot.latestOrder.target_plan_type,
            targetMaxMembers: snapshot.latestOrder.target_max_members,
            paymentStatus: snapshot.latestPayment?.status ?? null,
          }
        : null
    } catch (error) {
      console.warn('[upgrade-page] Unable to load billing snapshot.', {
        organizationId: context.organization.id,
        message: error instanceof Error ? error.message : 'Unknown billing snapshot error',
      })
    }
  }

  return (
    <UpgradePageClient
      locale={locale === 'he' ? 'he' : 'en'}
      organizationName={context.organization.name}
      currentLimit={context.organization.max_members_allowed ?? 1}
      backHref={isOrganizationAdmin ? '/admin' : '/dashboard'}
      isOrganizationAdmin={isOrganizationAdmin}
      checkoutConfigured={checkoutConfigured}
      checkoutAmount={checkoutAmount}
      checkoutCurrency={checkoutCurrency}
      targetPlanType={targetPlanType}
      targetMaxMembers={targetMaxMembers}
      latestOrder={latestOrder}
    />
  )
}
