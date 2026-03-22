import { CHANNELS, DIFFICULTIES, MEMORY_TYPES, SIMULATION_CATEGORIES } from '@/lib/constants'
import { hasGroqApiKey } from '@/lib/env'
import { createGroqClient, DEFAULT_GROQ_MODEL } from '@/lib/groq/client'
import {
  buildFeedbackSystemPrompt,
  buildFeedbackUserPrompt,
  buildMemorySystemPrompt,
  buildMemoryUserPrompt,
  buildOrganizationSummarySystemPrompt,
  buildOrganizationSummaryUserPrompt,
  buildPersonalSummarySystemPrompt,
  buildPersonalSummaryUserPrompt,
  buildRecommendationSystemPrompt,
  buildRecommendationUserPrompt,
  buildSimulationSystemPrompt,
  buildSimulationUserPrompt,
} from '@/lib/groq/prompts'
import type { PersonalizedSelection } from '@/lib/training/personalization'
import {
  feedbackSchema,
  memoryUpdateSchema,
  organizationSummarySchema,
  personalSummarySchema,
  recommendationSchema,
  simulationGenerationSchema,
  type FeedbackResponse,
  type MemoryUpdateResponse,
  type OrganizationSummaryResponse,
  type PersonalSummaryResponse,
  type RecommendationResponse,
  type SimulationGeneration,
} from '@/lib/validators/ai'

function readContent(content: string | null | Array<{ type?: string; text?: string }> | undefined) {
  if (!content) {
    throw new Error('Groq returned an empty response.')
  }

  if (typeof content === 'string') {
    return content
  }

  return content
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('')
}

async function requestStructuredOutput<T>({
  schemaName,
  schema,
  validator,
  systemPrompt,
  userPrompt,
}: {
  schemaName: string
  schema: Record<string, unknown>
  validator: { parse: (input: unknown) => T }
  systemPrompt: string
  userPrompt: string
}) {
  const client = createGroqClient()
  const completion = await client.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    temperature: 0.3,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    } as never,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const text = readContent(completion.choices[0]?.message?.content)
  const parsed = JSON.parse(text) as unknown
  return validator.parse(parsed)
}

const simulationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    channel: { type: 'string', enum: [...CHANNELS] },
    difficulty: { type: 'string', enum: [...DIFFICULTIES] },
    category: { type: 'string', enum: [...SIMULATION_CATEGORIES] },
    title: { type: 'string' },
    sender: { type: 'string' },
    content: { type: 'string' },
    isPhishing: { type: 'boolean' },
    explanation: { type: 'string' },
    redFlags: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 6,
    },
  },
  required: ['channel', 'difficulty', 'category', 'title', 'sender', 'content', 'isPhishing', 'explanation', 'redFlags'],
} as const

const feedbackJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    feedback: { type: 'string' },
    shortRule: { type: 'string' },
    missedSignals: { type: 'array', items: { type: 'string' } },
    didWell: { type: 'array', items: { type: 'string' } },
    recommendedFocus: { type: 'string' },
  },
  required: ['feedback', 'shortRule', 'missedSignals', 'didWell', 'recommendedFocus'],
} as const

const memoryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    memoryItems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          memoryType: { type: 'string', enum: [...MEMORY_TYPES] },
          content: { type: 'string' },
          importanceScore: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['memoryType', 'content', 'importanceScore'],
      },
    },
    weaknessUpdates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          weaknessKey: { type: 'string' },
          weaknessLabel: { type: 'string' },
          category: { type: 'string' },
          delta: { type: 'integer', minimum: -3, maximum: 3 },
        },
        required: ['weaknessKey', 'weaknessLabel', 'category', 'delta'],
      },
    },
    recommendedLevel: { type: 'string', enum: [...DIFFICULTIES] },
  },
  required: ['memoryItems', 'weaknessUpdates', 'recommendedLevel'],
} as const

const recommendationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendationText: { type: 'string' },
    reason: { type: 'string' },
    priority: { type: 'integer', minimum: 1, maximum: 5 },
  },
  required: ['recommendationText', 'reason', 'priority'],
} as const

const organizationSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    riskSignals: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
    actions: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
  },
  required: ['summary', 'riskSignals', 'actions'],
} as const

const personalSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
    focusAreas: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
    practicalRules: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
    },
  },
  required: ['summary', 'strengths', 'focusAreas', 'practicalRules'],
} as const

export async function generateSimulationWithGroq(
  locale: 'en' | 'he',
  selection: PersonalizedSelection,
  contextSummary: unknown,
) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<SimulationGeneration>({
    schemaName: 'simulation_generation',
    schema: simulationJsonSchema,
    validator: simulationGenerationSchema,
    systemPrompt: buildSimulationSystemPrompt(locale),
    userPrompt: buildSimulationUserPrompt(selection, contextSummary),
  })
}

export async function generateFeedbackWithGroq(locale: 'en' | 'he', payload: unknown) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<FeedbackResponse>({
    schemaName: 'feedback_generation',
    schema: feedbackJsonSchema,
    validator: feedbackSchema,
    systemPrompt: buildFeedbackSystemPrompt(locale),
    userPrompt: buildFeedbackUserPrompt(payload),
  })
}

export async function generateMemoryUpdateWithGroq(locale: 'en' | 'he', payload: unknown) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<MemoryUpdateResponse>({
    schemaName: 'memory_generation',
    schema: memoryJsonSchema,
    validator: memoryUpdateSchema,
    systemPrompt: buildMemorySystemPrompt(locale),
    userPrompt: buildMemoryUserPrompt(payload),
  })
}

export async function generateRecommendationWithGroq(locale: 'en' | 'he', payload: unknown) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<RecommendationResponse>({
    schemaName: 'recommendation_generation',
    schema: recommendationJsonSchema,
    validator: recommendationSchema,
    systemPrompt: buildRecommendationSystemPrompt(locale),
    userPrompt: buildRecommendationUserPrompt(payload),
  })
}

export async function generateOrganizationSummaryWithGroq(
  locale: 'en' | 'he',
  payload: unknown,
) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<OrganizationSummaryResponse>({
    schemaName: 'organization_summary',
    schema: organizationSummaryJsonSchema,
    validator: organizationSummarySchema,
    systemPrompt: buildOrganizationSummarySystemPrompt(locale),
    userPrompt: buildOrganizationSummaryUserPrompt(payload),
  })
}

export async function generatePersonalSummaryWithGroq(locale: 'en' | 'he', payload: unknown) {
  if (!hasGroqApiKey()) {
    return null
  }

  return requestStructuredOutput<PersonalSummaryResponse>({
    schemaName: 'personal_summary',
    schema: personalSummaryJsonSchema,
    validator: personalSummarySchema,
    systemPrompt: buildPersonalSummarySystemPrompt(locale),
    userPrompt: buildPersonalSummaryUserPrompt(payload),
  })
}
