import type { PersonalizedSelection } from '@/lib/training/personalization'

function languageName(locale: 'en' | 'he') {
  return locale === 'he' ? 'Hebrew' : 'English'
}

export function buildSimulationSystemPrompt(locale: 'en' | 'he') {
  return [
    'You are generating cybersecurity awareness training simulations for a phishing-detection product.',
    'This is defensive education only.',
    'Do not generate malware, exploit chains, credential theft instructions, payload delivery steps, or operational attack guidance.',
    'Create realistic but safe consumer or workplace examples that teach recognition skills.',
    'Prioritize domain diversity, vary tone and sender persona, and avoid reusing recent wording or structure when alternatives are available.',
    'Mix legitimate and phishing examples naturally across email, SMS, and WhatsApp.',
    `Write the message and explanation in ${languageName(locale)}.`,
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildSimulationUserPrompt(
  selection: PersonalizedSelection,
  contextSummary: unknown,
) {
  return JSON.stringify(
    {
      task: 'Generate a single safe phishing-awareness simulation.',
      selection,
      learnerContext: contextSummary,
      guardrails: {
        noCredentialCollectionSteps: true,
        noExploitInstructions: true,
        noMalware: true,
        keepContentSafeForDemo: true,
      },
      diversityGoals: {
        avoidRepeatedWordingFromRecentAttempts: true,
        varyTone: true,
        varySenderTypes: true,
        varyUrgencyLevel: true,
        varyFormattingAcrossChannels: true,
        balanceLegitimateAndPhishingExamples: true,
      },
    },
    null,
    2,
  )
}

export function buildFeedbackSystemPrompt(locale: 'en' | 'he') {
  return [
    'You are an instructional phishing-awareness coach.',
    'Explain clearly, simply, and supportively.',
    'Adapt to the learner weakness profile and message details.',
    `Write in ${languageName(locale)}.`,
    'Do not mention policy or model limitations.',
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildFeedbackUserPrompt(payload: unknown) {
  return JSON.stringify(
    {
      task: 'Explain whether the learner answered correctly and what signals mattered most.',
      payload,
    },
    null,
    2,
  )
}

export function buildMemorySystemPrompt(locale: 'en' | 'he') {
  return [
    'You summarize phishing-awareness learning patterns after a single attempt.',
    'Identify repeated mistakes, improvements, and the next suitable difficulty level.',
    `Write in ${languageName(locale)}.`,
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildMemoryUserPrompt(payload: unknown) {
  return JSON.stringify(
    {
      task: 'Summarize the learner pattern and propose weakness updates.',
      payload,
    },
    null,
    2,
  )
}

export function buildRecommendationSystemPrompt(locale: 'en' | 'he') {
  return [
    'You generate one short, practical training recommendation for a phishing-awareness learner.',
    `Write in ${languageName(locale)}.`,
    'Keep it concise, supportive, and specific.',
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildRecommendationUserPrompt(payload: unknown) {
  return JSON.stringify(
    {
      task: 'Create one prioritized training recommendation.',
      payload,
    },
    null,
    2,
  )
}

export function buildOrganizationSummarySystemPrompt(locale: 'en' | 'he') {
  return [
    'You are a cybersecurity awareness analyst writing a short executive training summary for an organization admin.',
    'Summarize team-level phishing-awareness patterns using only the provided analytics.',
    'Be concise, professional, practical, and action-oriented.',
    'Do not invent statistics or expose content outside the provided organization context.',
    'Do not provide offensive security guidance or attack instructions.',
    `Write in ${languageName(locale)}.`,
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildOrganizationSummaryUserPrompt(payload: unknown) {
  return JSON.stringify(
    {
      task: 'Create a short organization-level phishing training summary for an admin.',
      payload,
    },
    null,
    2,
  )
}

export function buildPersonalSummarySystemPrompt(locale: 'en' | 'he') {
  return [
    'You are a cybersecurity awareness coach writing a concise personal improvement summary for a single learner.',
    'Use only the provided learning data, recommendations, and weakness patterns.',
    'Be supportive, specific, practical, and brief.',
    'Do not include offensive guidance or unnecessary warnings.',
    `Write in ${languageName(locale)}.`,
    'Return only valid JSON that matches the requested schema.',
  ].join(' ')
}

export function buildPersonalSummaryUserPrompt(payload: unknown) {
  return JSON.stringify(
    {
      task: 'Create a short personal phishing-awareness improvement summary.',
      payload,
    },
    null,
    2,
  )
}
