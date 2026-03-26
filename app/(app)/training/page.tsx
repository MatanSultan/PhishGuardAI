import TrainingPageClient from './client'

import { requireSessionUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getNextTrainingSimulation } from '@/lib/training/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function TrainingPage() {
  const user = await requireSessionUser('/training')
  const supabase = await createServerSupabaseClient()

  try {
    const initialTrainingData = await getNextTrainingSimulation(supabase, user.id)

    return (
      <TrainingPageClient
        initialTrainingData={initialTrainingData}
        initialError={null}
      />
    )
  } catch (error) {
    return (
      <TrainingPageClient
        initialTrainingData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load training.'}
      />
    )
  }
}
