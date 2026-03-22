'use client'

import { Sparkles, Radio, Brain, BarChart3, History, Users } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

const icons = [Sparkles, Radio, Brain, BarChart3, History, Users]

export function Features() {
  const { t, dir } = useLocale()

  return (
    <section id="features" className="border-t border-border bg-muted/30 py-20 lg:py-32" dir={dir}>
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t.features.title}
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            {t.features.subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((feature, index) => {
            const Icon = icons[index]
            return (
              <div
                key={index}
                className="card-hover group rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
