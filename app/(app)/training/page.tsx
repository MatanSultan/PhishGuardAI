import TrainingPageClient from './client'
import { cookies } from 'next/headers'

import { requireSessionUser } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTrainingIntroCookieName } from '@/lib/training/intro'
import { getNextTrainingSimulation } from '@/lib/training/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function TrainingPage() {
  const user = await requireSessionUser('/training')
  const supabase = await createServerSupabaseClient()
  const cookieStore = await cookies()
  const initialIntroSeen = cookieStore.get(getTrainingIntroCookieName(user.id))?.value === '1'

  try {
    const initialTrainingData = await getNextTrainingSimulation(supabase, user.id)

    return (
      <TrainingPageClient
        initialTrainingData={initialTrainingData}
        initialError={null}
        initialIntroSeen={initialIntroSeen}
        userId={user.id}
      />
    )
  } catch (error) {
    return (
      <TrainingPageClient
        initialTrainingData={null}
        initialError={error instanceof Error ? error.message : 'Unable to load training.'}
        initialIntroSeen={initialIntroSeen}
        userId={user.id}
      />
    )
  }
}
