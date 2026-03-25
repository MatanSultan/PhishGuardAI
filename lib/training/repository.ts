import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Channel,
  Difficulty,
  MemoryType,
  SimulationCategory,
  SupportedLocale,
} from '@/lib/constants'
import type { Database, TableInsert, TableRow, TableUpdate } from '@/lib/database.types'

export type AppSupabaseClient = SupabaseClient<Database>

export interface AttemptWithSimulation extends TableRow<'user_attempts'> {
  simulation: TableRow<'simulations'> | null
}

export async function getRecentAttemptsWithSimulations(
  supabase: AppSupabaseClient,
  userId: string,
  limit = 12,
) {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('*, simulation:simulations(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as AttemptWithSimulation[]
}

export async function getAllAttemptsWithSimulations(supabase: AppSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_attempts')
    .select('*, simulation:simulations(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as AttemptWithSimulation[]
}

export async function getSimulationById(supabase: AppSupabaseClient, simulationId: string) {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'simulations'>
}

export interface SimulationQueryOptions {
  locale: SupportedLocale
  channel?: Channel
  category?: SimulationCategory
  difficulty?: Difficulty
  excludeIds?: string[]
  limit?: number
}

export async function getCandidateSimulations(
  supabase: AppSupabaseClient,
  options: SimulationQueryOptions,
) {
  let query = supabase
    .from('simulations')
    .select('*')
    .eq('language', options.locale)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 24)

  if (options.channel) {
    query = query.eq('channel', options.channel)
  }

  if (options.category) {
    query = query.eq('category', options.category)
  }

  if (options.difficulty) {
    query = query.eq('difficulty', options.difficulty)
  }

  if (options.excludeIds?.length) {
    query = query.not('id', 'in', `(${options.excludeIds.map((id) => `"${id}"`).join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'simulations'>[]
}

export async function insertSimulation(
  supabase: AppSupabaseClient,
  payload: TableInsert<'simulations'>,
) {
  const { data, error } = await supabase
    .from('simulations')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'simulations'>
}

export async function insertAttempt(
  supabase: AppSupabaseClient,
  payload: TableInsert<'user_attempts'>,
) {
  const { data, error } = await supabase
    .from('user_attempts')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'user_attempts'>
}

export async function upsertWeaknesses(
  supabase: AppSupabaseClient,
  payload: TableInsert<'user_weaknesses'>[],
) {
  if (!payload.length) {
    return []
  }

  const { data, error } = await supabase
    .from('user_weaknesses')
    .upsert(payload, {
      onConflict: 'user_id,weakness_key',
      ignoreDuplicates: false,
    })
    .select('*')

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'user_weaknesses'>[]
}

export async function insertMemoryEntries(
  supabase: AppSupabaseClient,
  payload: TableInsert<'memory_entries'>[],
) {
  if (!payload.length) {
    return []
  }

  const { data, error } = await supabase
    .from('memory_entries')
    .insert(payload)
    .select('*')

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'memory_entries'>[]
}

export async function getWeaknesses(supabase: AppSupabaseClient, userId: string, limit = 8) {
  const { data, error } = await supabase
    .from('user_weaknesses')
    .select('*')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'user_weaknesses'>[]
}

export async function getWeaknessesByKeys(
  supabase: AppSupabaseClient,
  userId: string,
  weaknessKeys: string[],
) {
  if (!weaknessKeys.length) {
    return []
  }

  const { data, error } = await supabase
    .from('user_weaknesses')
    .select('*')
    .eq('user_id', userId)
    .in('weakness_key', weaknessKeys)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'user_weaknesses'>[]
}

export async function getMemoryEntries(supabase: AppSupabaseClient, userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('memory_entries')
    .select('*')
    .eq('user_id', userId)
    .order('importance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'memory_entries'>[]
}

export async function getRecommendations(
  supabase: AppSupabaseClient,
  userId: string,
  limit = 5,
) {
  const { data, error } = await supabase
    .from('training_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'training_recommendations'>[]
}

export async function insertRecommendation(
  supabase: AppSupabaseClient,
  payload: TableInsert<'training_recommendations'>,
) {
  const { data, error } = await supabase
    .from('training_recommendations')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as TableRow<'training_recommendations'>
}

export async function insertAnalyticsEvent(
  supabase: AppSupabaseClient,
  payload: TableInsert<'analytics_events'>,
) {
  const { error } = await supabase.from('analytics_events').insert(payload)

  if (error) {
    throw error
  }
}

export async function getAnalyticsEvents(
  supabase: AppSupabaseClient,
  userId: string,
  limit = 50,
) {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'analytics_events'>[]
}

export async function updateTrainingProfileRow(
  supabase: AppSupabaseClient,
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

export async function getMemoryEntriesByType(
  supabase: AppSupabaseClient,
  userId: string,
  memoryType: MemoryType,
  limit = 6,
) {
  const { data, error } = await supabase
    .from('memory_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('memory_type', memoryType)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'memory_entries'>[]
}
