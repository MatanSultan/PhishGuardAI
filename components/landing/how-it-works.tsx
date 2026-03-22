'use client'

import { Mail, Search, TrendingUp } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

const stepIcons = [Mail, Search, TrendingUp]

export function HowItWorks() {
  const { t, dir } = useLocale()

  return (
    <section id="how-it-works" className="py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t.howItWorks.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16">
          {/* Connecting Line - Desktop */}
          <div className="absolute top-24 hidden h-0.5 w-full bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
            {t.howItWorks.steps.map((step, index) => {
              const Icon = stepIcons[index]
              return (
                <div key={index} className="relative text-center">
                  {/* Step Number */}
                  <div className="relative mx-auto mb-6 flex h-12 w-12 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/10" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {step.number}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
