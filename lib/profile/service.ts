import type { SupabaseClient } from '@supabase/supabase-js'

import type { SimulationCategory, SupportedLocale } from '@/lib/constants'
import type { Database, TableRow, TableUpdate } from '@/lib/database.types'

export interface ProfileBundle {
  profile: TableRow<'profiles'>
  trainingProfile: TableRow<'user_training_profile'>
}

function resolvePreferredLanguage(value: unknown): SupportedLocale {
  return value === 'en' || value === 'he' ? value : 'he'
}

export async function getProfileBundle(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProfileBundle> {
  const [profileResult, trainingResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_training_profile').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (trainingResult.error) {
    throw trainingResult.error
  }

  let profile = profileResult.data as TableRow<'profiles'> | null

  if (!profile) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user || user.id !== userId || !user.email) {
      throw new Error('Profile not found for authenticated user.')
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name:
          typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name.trim()
            : null,
        preferred_language: resolvePreferredLanguage(user.user_metadata?.preferred_language),
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    profile = data as TableRow<'profiles'>
  }

  if (!trainingResult.data) {
    const { data, error } = await supabase
      .from('user_training_profile')
      .insert({ user_id: userId })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return {
      profile,
      trainingProfile: data as TableRow<'user_training_profile'>,
    }
  }

  return {
    profile,
    trainingProfile: trainingResult.data as TableRow<'user_training_profile'>,
  }
}

export async function updatePreferredLanguage(
  supabase: SupabaseClient<Database>,
  userId: string,
  locale: SupportedLocale,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ preferred_language: locale })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'profiles'>
}

export async function updateTrainingProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  patch: TableUpdate<'user_training_profile'>,
) {
  const { data, error } = await supabase
    .from('user_training_profile')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'user_training_profile'>
}

export async function updatePreferredDomains(
  supabase: SupabaseClient<Database>,
  userId: string,
  domains: SimulationCategory[],
) {
  return updateTrainingProfile(supabase, userId, {
    preferred_domains: domains,
  })
}
