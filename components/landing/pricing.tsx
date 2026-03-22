'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Pricing() {
  const { t, dir } = useLocale()

  return (
    <section id="pricing" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {t.pricing.plans.map((plan, index) => {
            const isPopular = 'popular' in plan && plan.popular
            return (
              <div
                key={index}
                className={cn(
                  "relative rounded-2xl border bg-card p-8 transition-all",
                  isPopular
                    ? "border-primary shadow-lg shadow-primary/10"
                    : "border-border"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 ltr:left-1/2 rtl:right-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                      Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href="/auth/signup" className="block">
                  <Button
                    className={cn(
                      "w-full",
                      isPopular
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
