import { z } from 'zod'

import { CHANNELS, DIFFICULTIES, MEMORY_TYPES, SIMULATION_CATEGORIES } from '@/lib/constants'

const nonEmptyText = z.string().trim().min(1)

export const simulationGenerationSchema = z.object({
  channel: z.enum(CHANNELS),
  difficulty: z.enum(DIFFICULTIES),
  category: z.enum(SIMULATION_CATEGORIES),
  title: z.string().trim().default(''),
  sender: z.string().trim().default(''),
  content: nonEmptyText,
  isPhishing: z.boolean(),
  explanation: nonEmptyText,
  redFlags: z.array(nonEmptyText).min(2).max(6),
})

export const feedbackSchema = z.object({
  feedback: nonEmptyText,
  shortRule: nonEmptyText,
  missedSignals: z.array(nonEmptyText).max(6),
  didWell: z.array(nonEmptyText).max(6),
  recommendedFocus: nonEmptyText,
})

export const memoryUpdateSchema = z.object({
  memoryItems: z.array(
    z.object({
      memoryType: z.enum(MEMORY_TYPES),
      content: nonEmptyText,
      importanceScore: z.number().int().min(1).max(5),
    }),
  ),
  weaknessUpdates: z.array(
    z.object({
      weaknessKey: nonEmptyText,
      weaknessLabel: nonEmptyText,
      category: z.string().trim().min(1).optional().default(''),
      delta: z.number().int().min(-3).max(3),
    }),
  ),
  recommendedLevel: z.enum(DIFFICULTIES),
})

export const recommendationSchema = z.object({
  recommendationText: nonEmptyText,
  reason: nonEmptyText,
  priority: z.number().int().min(1).max(5),
})

export const organizationSummarySchema = z.object({
  summary: nonEmptyText,
  riskSignals: z.array(nonEmptyText).max(5),
  actions: z.array(nonEmptyText).max(5),
})

export const personalSummarySchema = z.object({
  summary: nonEmptyText,
  strengths: z.array(nonEmptyText).max(5),
  focusAreas: z.array(nonEmptyText).max(5),
  practicalRules: z.array(nonEmptyText).max(5),
})

export type SimulationGeneration = z.infer<typeof simulationGenerationSchema>
export type FeedbackResponse = z.infer<typeof feedbackSchema>
export type MemoryUpdateResponse = z.infer<typeof memoryUpdateSchema>
export type RecommendationResponse = z.infer<typeof recommendationSchema>
export type OrganizationSummaryResponse = z.infer<typeof organizationSummarySchema>
export type PersonalSummaryResponse = z.infer<typeof personalSummarySchema>
