import { z } from 'zod'

import {
  CHANNELS,
  DIFFICULTIES,
  SIMULATION_CATEGORIES,
  SUPPORTED_LOCALES,
} from '@/lib/constants'

export const startTrainingSchema = z.object({
  channel: z.enum(CHANNELS).optional(),
  preferredDifficulty: z.enum(DIFFICULTIES).optional(),
  preferredCategory: z.enum(SIMULATION_CATEGORIES).optional(),
  preferredDomains: z.array(z.enum(SIMULATION_CATEGORIES)).max(SIMULATION_CATEGORIES.length).optional(),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
})

export const submitAttemptSchema = z.object({
  simulationId: z.string().uuid(),
  userAnswer: z.boolean(),
  confidence: z.number().int().min(0).max(2).optional(),
  userReason: z.string().trim().max(1000).optional(),
  responseTimeMs: z.number().int().min(0).max(600000).optional(),
})

export type StartTrainingInput = z.infer<typeof startTrainingSchema>
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>
