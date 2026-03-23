'use client'

import type { OrganizationType, SimulationCategory } from '@/lib/constants'
import type { Locale } from '@/lib/i18n'
import { formatCategoryLabel, formatMixedDomainLabel } from '@/lib/presentation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DomainSelectorProps {
  locale: Locale
  availableDomains: SimulationCategory[]
  selectedDomains: SimulationCategory[]
  onChange: (domains: SimulationCategory[]) => void
  organizationType?: OrganizationType | null
  disabled?: boolean
}

export function DomainSelector({
  locale,
  availableDomains,
  selectedDomains,
  onChange,
  organizationType,
  disabled = false,
}: DomainSelectorProps) {
  const handleMixed = () => {
    if (disabled) {
      return
    }

    onChange([])
  }

  const handleToggle = (domain: SimulationCategory) => {
    if (disabled) {
      return
    }

    const nextDomains = selectedDomains.includes(domain)
      ? selectedDomains.filter((item) => item !== domain)
      : [...selectedDomains, domain]

    onChange(nextDomains)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={selectedDomains.length === 0 ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        onClick={handleMixed}
      >
        {formatMixedDomainLabel(locale)}
      </Button>
      {availableDomains.map((domain) => {
        const isActive = selectedDomains.includes(domain)

        return (
          <Button
            key={domain}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            onClick={() => handleToggle(domain)}
            className={cn(isActive && 'shadow-sm')}
          >
            {formatCategoryLabel(domain, locale, organizationType)}
          </Button>
        )
      })}
    </div>
  )
}
