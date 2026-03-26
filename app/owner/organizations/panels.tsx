'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function OwnerConsoleSkeleton() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8 lg:px-8">
      <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-4 h-10 w-80 max-w-full" />
        <Skeleton className="mt-3 h-5 w-[32rem] max-w-full" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-3xl">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-3xl">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export function SummaryBadge({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'warning' | 'danger'
}) {
  const toneClassName =
    tone === 'danger'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-border/60 bg-background text-foreground'

  return (
    <div className={cn('rounded-full border px-3 py-1.5 text-sm shadow-sm', toneClassName)}>
      <span className="font-semibold">{value}</span>{' '}
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: LucideIcon
}) {
  return (
    <Card className="rounded-3xl">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-2xl bg-muted p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export function PriorityRow({
  title,
  subtitle,
  meta,
  badges,
  actionLabel,
  onAction,
}: {
  title: string
  subtitle: string
  meta: string
  badges: string[]
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="rounded-2xl border border-border/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-sm text-muted-foreground">{meta}</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge} variant="secondary">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
          <ArrowRight className="ltr:ml-2 rtl:mr-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function SimpleInfoRow({
  title,
  subtitle,
  badge,
}: {
  title: string
  subtitle: string
  badge: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="outline">{badge}</Badge>
    </div>
  )
}

export function InfoField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export function PlanMixRow({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {count} • {percentage}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function PanelEmptyState({
  title,
  description,
  compact = false,
}: {
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-border bg-muted/20 text-center',
        compact ? 'p-4' : 'p-8',
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
