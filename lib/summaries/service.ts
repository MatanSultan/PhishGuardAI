import type {
  Channel,
  OrganizationType,
  SimulationCategory,
  SupportedLocale,
  WeaknessKey,
} from '@/lib/constants'
import type { TableRow } from '@/lib/database.types'
import {
  generateOrganizationSummaryWithGroq,
  generatePersonalSummaryWithGroq,
} from '@/lib/groq/service'
import { getOrganizationExperienceProfile } from '@/lib/organizations/experience'
import { getOrganizationSegmentProfile } from '@/lib/organizations/segments'
import {
  formatCategoryLabel,
  formatChannelLabel,
  formatWeaknessLabel,
} from '@/lib/presentation'
import type { AttemptWithSimulation } from '@/lib/training/repository'
import type {
  OrganizationSummaryResponse,
  PersonalSummaryResponse,
} from '@/lib/validators/ai'

interface OrganizationRecommendationInput {
  kind:
    | 'focus_category'
    | 'improve_safe_detection'
    | 'increase_phishing_exposure'
    | 'reengage_low_activity'
    | 'segment_mix'
  category?: SimulationCategory
  count?: number
  organizationType?: OrganizationType | null
  industry?: string | null
  domains?: SimulationCategory[]
}

interface OrganizationSummaryInput {
  locale: SupportedLocale
  organizationName: string
  organizationType?: OrganizationType | null
  industry?: string | null
  overview: {
    totalEmployees: number
    activeEmployees: number
    totalSimulationsCompleted: number
    phishingDetectionRate: number
    safeDetectionRate: number
  }
  weakestCategories: Array<{ category: SimulationCategory; count: number }>
  channelBreakdown: Array<{ key: Channel; attempts: number; correctRate: number }>
  lowEngagement: Array<{
    fullName: string
    email: string
    totalAttempts: number
    lastTrainedAt: string | null
    daysSinceLastActivity: number | null
  }>
  employeesNeedingSupport: Array<{
    fullName: string
    email: string
    accuracyRate: number
    totalAttempts: number
    weakestCategory: SimulationCategory | null
  }>
  attentionFlags: Array<{
    fullName: string
    email: string
    accuracyRate: number
    totalAttempts: number
    daysSinceLastActivity: number | null
    repeatedCategory: SimulationCategory | null
    repeatedIncorrectCount: number
    reasons: Array<'low_accuracy' | 'inactive' | 'repeated_category_failure'>
  }>
  companyRecommendations: OrganizationRecommendationInput[]
  riskScore: {
    value: number
    level: 'low' | 'medium' | 'high'
    explanation: string
    reasons: string[]
  }
}

interface PersonalSummaryInput {
  locale: SupportedLocale
  profile: {
    fullName: string | null
    email: string
  }
  organizationName?: string | null
  organizationType?: OrganizationType | null
  stats: {
    totalAttempts: number
    correctRate: number
    phishingDetectionRate: number
    legitDetectionRate: number
    totalScore: number
    streakCount: number
    weakestCategory: SimulationCategory | null
    strongestCategory: SimulationCategory | null
    confidenceScore: number
  }
  preferredDomains: SimulationCategory[]
  weaknesses: TableRow<'user_weaknesses'>[]
  recommendations: TableRow<'training_recommendations'>[]
  recentAttempts: AttemptWithSimulation[]
}

const SUMMARY_AI_TIMEOUT_MS = 1200

async function runFastSummaryTask<T>(task: () => Promise<T | null>, timeoutMs = SUMMARY_AI_TIMEOUT_MS) {
  try {
    return await Promise.race<T | null>([
      task(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } catch {
    return null
  }
}

function dedupe(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)))
}

function sliceNonEmpty(items: string[], limit: number) {
  return dedupe(items).slice(0, limit)
}

function getLowestAccuracyChannel(
  breakdown: OrganizationSummaryInput['channelBreakdown'],
) {
  return [...breakdown].sort((left, right) => left.correctRate - right.correctRate)[0] ?? null
}

function getOrganizationProfile(
  locale: SupportedLocale,
  organizationType?: OrganizationType | null,
  industry?: string | null,
) {
  return getOrganizationSegmentProfile(organizationType, industry, locale)
}

function getOrganizationExperience(
  locale: SupportedLocale,
  organizationType?: OrganizationType | null,
) {
  return getOrganizationExperienceProfile(organizationType, locale)
}

function getPersonalSupportPattern(input: PersonalSummaryInput) {
  const { phishingDetectionRate, legitDetectionRate } = input.stats

  if (phishingDetectionRate + 12 < legitDetectionRate) {
    return input.locale === 'he'
      ? 'יש נטייה לתת אמון מהר מדי בהודעות מסוכנות.'
      : 'You may be trusting risky messages too quickly.'
  }

  if (legitDetectionRate + 12 < phishingDetectionRate) {
    return input.locale === 'he'
      ? 'יש נטייה לחשוד גם בהודעות לגיטימיות.'
      : 'You may be over-suspecting legitimate messages.'
  }

  return input.locale === 'he'
    ? 'שיקול הדעת שלכם מאוזן יחסית, ועכשיו חשוב לחדד את הסימנים הקטנים.'
    : 'Your judgment is fairly balanced, and the next step is refining the smaller signals.'
}

function buildWeaknessRule(locale: SupportedLocale, weaknessKey: string) {
  const rules: Partial<Record<WeaknessKey, { en: string; he: string }>> = {
    urgency_cues: {
      en: 'Urgency is a cue to pause and verify, not to rush.',
      he: 'דחיפות היא סימן לעצור ולאמת, לא למהר.',
    },
    fake_domain_detection: {
      en: 'Check the sender domain before trusting the message.',
      he: 'בדקו את הדומיין של השולח לפני שאתם נותנים אמון בהודעה.',
    },
    suspicious_sender_detection: {
      en: 'Verify unexpected requests through a trusted channel.',
      he: 'אמתו בקשות חריגות דרך ערוץ מוכר ואמין.',
    },
    delivery_overtrust: {
      en: 'Track deliveries only through your existing account or app.',
      he: 'עקבו אחרי משלוחים רק דרך החשבון או האפליקציה המוכרים לכם.',
    },
    account_security_overtrust: {
      en: 'Confirm security alerts inside the product, not from the message link.',
      he: 'אשרו התראות אבטחה מתוך המוצר עצמו, לא דרך קישור בהודעה.',
    },
    channel_sms: {
      en: 'Treat rushed SMS links as suspicious until verified.',
      he: 'התייחסו לקישורי SMS לחוצים כחשודים עד שתאמתו אותם.',
    },
    channel_whatsapp: {
      en: 'Never share codes or sensitive data in chat threads.',
      he: 'לעולם אל תשתפו קודים או מידע רגיש בשיחות צ׳אט.',
    },
  }

  return rules[weaknessKey as WeaknessKey]?.[locale]
}

function buildOrganizationRecommendationAction(
  locale: SupportedLocale,
  recommendation: OrganizationRecommendationInput,
) {
  const organizationProfile = getOrganizationProfile(
    locale,
    recommendation.organizationType,
    recommendation.industry,
  )

  if (recommendation.kind === 'focus_category' && recommendation.category) {
    return locale === 'he'
      ? `תעדפו אימונים ב-${formatCategoryLabel(
          recommendation.category,
          locale,
          recommendation.organizationType,
        )} בשבוע הקרוב.`
      : `Prioritize ${formatCategoryLabel(
          recommendation.category,
          locale,
          recommendation.organizationType,
        )} scenarios next week.`
  }

  if (recommendation.kind === 'improve_safe_detection') {
    return locale === 'he'
      ? 'חזקו זיהוי של הודעות לגיטימיות כדי לצמצם חשדנות יתר.'
      : 'Reinforce recognition of legitimate messages to reduce over-cautious behavior.'
  }

  if (recommendation.kind === 'increase_phishing_exposure') {
    return locale === 'he'
      ? 'הוסיפו יותר תרחישי פישינג ממוקדים כדי לחדד זיהוי סיכונים.'
      : 'Add more phishing-heavy drills to sharpen risk detection.'
  }

  if (recommendation.kind === 'reengage_low_activity') {
    return locale === 'he'
      ? `פנו ל-${recommendation.count ?? 0} עובדים עם מעורבות נמוכה והחזירו אותם למסלול אימון.`
      : `Follow up with ${recommendation.count ?? 0} low-engagement employees and re-start training cadence.`
  }

  const domainLabels = (recommendation.domains ?? [])
    .map((domain) =>
      formatCategoryLabel(domain, locale, recommendation.organizationType),
    )
    .join(', ')

  if (recommendation.kind === 'segment_mix') {
    return locale === 'he'
      ? `התאימו את תמהיל האימונים לארגון מסוג ${organizationProfile.label}, עם דגש על ${organizationProfile.focusTopics
          .slice(0, 2)
          .join(' ו')}.`
      : `Use a ${organizationProfile.label.toLowerCase()} training mix with emphasis on ${organizationProfile.focusTopics
          .slice(0, 2)
          .join(' and ')}.`
  }

  return locale === 'he'
    ? `התאימו את תמהיל האימונים לתעשייה עם דגש על ${domainLabels}.`
    : `Use a training mix with emphasis on ${domainLabels}.`
}

function buildFallbackOrganizationSummary(
  input: OrganizationSummaryInput,
): OrganizationSummaryResponse {
  const organizationProfile = getOrganizationProfile(
    input.locale,
    input.organizationType,
    input.industry,
  )
  const organizationExperience = getOrganizationExperience(
    input.locale,
    input.organizationType,
  )

  if (input.overview.totalSimulationsCompleted === 0) {
    return input.locale === 'he'
      ? {
          summary:
            'הארגון מוכן להפעלה, אבל עדיין אין מספיק נתוני אימון כדי לזהות דפוסי סיכון צוותיים.',
          riskSignals: [
            'עדיין לא הושלמו סימולציות צוותיות ולכן אין קו בסיס אמין.',
            'יש צורך ביצירת מעורבות התחלתית כדי למדוד תחומים וערוצים חלשים.',
          ],
          actions: [
            'הזמינו עובדים והתחילו סשן בסיס ראשון בתמהיל מעורב.',
            'בדקו שוב את הדשבורד אחרי כמה ניסיונות ראשונים לכל עובד.',
          ],
        }
      : {
          summary:
            'The organization is ready, but there is not enough training data yet to identify team-level risk patterns.',
          riskSignals: [
            'No team simulations have been completed yet, so there is no reliable baseline.',
            'Initial engagement is still needed before weak domains and channels can be measured.',
            organizationExperience.noSecurityTeamHint,
          ],
          actions: [
            organizationExperience.managerActions[0],
            'Invite employees and start with a mixed baseline training session.',
            'Review the dashboard again after each employee completes several attempts.',
          ],
        }
  }

  const weakestCategory = input.weakestCategories[0]
  const riskyChannel = getLowestAccuracyChannel(input.channelBreakdown)
  const employeesNeedingSupport = input.employeesNeedingSupport
    .slice(0, 3)
    .map((employee) => employee.fullName)
  const lowEngagementCount = input.lowEngagement.length
  const flaggedEmployees = input.attentionFlags
    .slice(0, 3)
    .map((employee) => employee.fullName)
  const scenarioExample = organizationExperience.scenarioExamples[0]

  const summary =
    input.locale === 'he'
      ? `ציון הסיכון של הארגון הוא ${input.riskScore.value}/100 (${input.riskScore.level}). ${input.organizationName} צריך חיזוק סביב ${weakestCategory ? formatCategoryLabel(weakestCategory.category, input.locale, input.organizationType) : 'תחומי הסיכון המרכזיים'}, עם ${lowEngagementCount} עובדים במעורבות נמוכה.`
      : `${input.organizationName} risk score is ${input.riskScore.value}/100 (${input.riskScore.level}). Focus reinforcement on ${weakestCategory ? formatCategoryLabel(weakestCategory.category, input.locale, input.organizationType) : 'the main risk areas'}, with ${lowEngagementCount} employees showing low engagement.`

  const riskSignals = sliceNonEmpty(
    [
      input.riskScore.explanation,
      weakestCategory
        ? input.locale === 'he'
          ? `${formatCategoryLabel(weakestCategory.category, input.locale, input.organizationType)} הוא תחום החולשה המוביל בצוות.`
          : `${formatCategoryLabel(weakestCategory.category, input.locale, input.organizationType)} is the leading weak domain across the team.`
        : '',
      riskyChannel
        ? input.locale === 'he'
          ? `${formatChannelLabel(riskyChannel.key, input.locale)} הוא הערוץ המסוכן ביותר כרגע עם דיוק של ${riskyChannel.correctRate}%.`
          : `${formatChannelLabel(riskyChannel.key, input.locale)} is the riskiest channel right now at ${riskyChannel.correctRate}% accuracy.`
        : '',
      employeesNeedingSupport.length
        ? input.locale === 'he'
          ? `עובדים שדורשים חיזוק מיידי: ${employeesNeedingSupport.join(', ')}.`
          : `Employees who may need immediate reinforcement: ${employeesNeedingSupport.join(', ')}.`
        : '',
      lowEngagementCount > 0
        ? input.locale === 'he'
          ? `${lowEngagementCount} עובדים לא שמרו על קצב אימון עקבי.`
          : `${lowEngagementCount} employees are not maintaining consistent training activity.`
        : '',
      flaggedEmployees.length
        ? input.locale === 'he'
          ? `עובדים שמצריכים תשומת לב מיידית: ${flaggedEmployees.join(', ')}.`
          : `Employees currently needing close follow-up: ${flaggedEmployees.join(', ')}.`
        : '',
      scenarioExample
        ? input.locale === 'he'
          ? `בארגון מסוג זה כדאי לתרגל גם תרחישים כמו: ${scenarioExample}`
          : `For this type of organization, keep practicing scenarios such as: ${scenarioExample}`
        : '',
    ],
    5,
  )

  const actions = sliceNonEmpty(
    [
      ...input.companyRecommendations.map((recommendation) =>
        buildOrganizationRecommendationAction(input.locale, recommendation),
      ),
      ...organizationExperience.managerActions,
      organizationProfile.onboardingHint,
      input.locale === 'he'
        ? 'חזקו מדיניות של אימות שולח לפני לחיצה על קישורים דחופים.'
        : 'Reinforce sender-verification policy before employees act on urgent links.',
    ],
    5,
  )

  return {
    summary,
    riskSignals,
    actions,
  }
}

function buildFallbackPersonalSummary(
  input: PersonalSummaryInput,
): PersonalSummaryResponse {
  const organizationProfile = getOrganizationProfile(
    input.locale,
    input.organizationType,
    null,
  )
  const organizationExperience = getOrganizationExperience(
    input.locale,
    input.organizationType,
  )

  if (input.stats.totalAttempts === 0) {
    const preferredDomains = input.preferredDomains.length
      ? input.preferredDomains
          .map((domain) =>
            formatCategoryLabel(domain, input.locale, input.organizationType),
          )
          .join(', ')
      : input.locale === 'he'
        ? 'מסלול מעורב'
        : 'mixed mode'

    return input.locale === 'he'
      ? {
          summary: 'הפרופיל שלכם מוכן. עכשיו צריך לבנות קו בסיס אישי דרך כמה ניסיונות ראשונים.',
          strengths: ['החשבון פעיל ומוכן לאימון אישי.', 'אפשר להתחיל עם תחומים מועדפים או מסלול מעורב.'],
          focusAreas: [`תחומי ההתחלה המומלצים: ${preferredDomains}.`],
          practicalRules: [
            'בדקו את השולח לפני לחיצה על קישורים.',
            'עצרו כשיש דחיפות חריגה או בקשה למידע רגיש.',
          ],
        }
      : {
          summary: 'Your profile is ready. The next step is building a personal baseline with a few first attempts.',
          strengths: ['Your account is set up for personal training.', 'You can start with preferred domains or mixed mode.'],
          focusAreas: [
            `Suggested starting focus: ${preferredDomains}.`,
            organizationProfile.employeeHint,
            organizationExperience.scenarioExamples[0]
              ? `A realistic first scenario for your work context: ${organizationExperience.scenarioExamples[0]}`
              : '',
          ],
          practicalRules: [
            'Check the sender before clicking links.',
            'Pause when a message adds unusual urgency or asks for sensitive data.',
          ],
        }
  }

  const topWeaknesses = input.weaknesses
    .slice(0, 3)
    .map((weakness) => formatWeaknessLabel(weakness.weakness_key, weakness.weakness_label, input.locale))
  const strongestCategory = input.stats.strongestCategory
    ? formatCategoryLabel(
        input.stats.strongestCategory,
        input.locale,
        input.organizationType,
      )
    : null
  const weakestCategory = input.stats.weakestCategory
    ? formatCategoryLabel(
        input.stats.weakestCategory,
        input.locale,
        input.organizationType,
      )
    : null

  const strengths = sliceNonEmpty(
    [
      strongestCategory
        ? input.locale === 'he'
          ? `אתם מציגים ביצועים טובים במיוחד ב-${strongestCategory}.`
          : `You are performing well in ${strongestCategory}.`
        : '',
      input.stats.phishingDetectionRate >= 75
        ? input.locale === 'he'
          ? 'אתם מזהים טוב סימני פישינג ברוב התרחישים.'
          : 'You are identifying phishing cues well in most scenarios.'
        : '',
      input.stats.legitDetectionRate >= 75
        ? input.locale === 'he'
          ? 'אתם שומרים על איזון טוב מול הודעות לגיטימיות.'
          : 'You are staying measured with legitimate messages.'
        : '',
      input.stats.streakCount >= 2
        ? input.locale === 'he'
          ? 'אתם שומרים על רצף אימון עקבי.'
          : 'You are maintaining a consistent training rhythm.'
        : '',
      input.locale === 'he'
        ? 'כל ניסיון מוסיף זיכרון לימודי מדויק יותר להמשך.'
        : 'Each attempt is helping the platform personalize your next drills more accurately.',
    ],
    4,
  )

  const focusAreas = sliceNonEmpty(
    [
      weakestCategory
        ? input.locale === 'he'
          ? `מומלץ להתמקד כרגע ב-${weakestCategory}.`
          : `Your main focus area right now is ${weakestCategory}.`
        : '',
      ...topWeaknesses.map((weakness) =>
        input.locale === 'he'
          ? `חולשה חוזרת שזוהתה: ${weakness}.`
          : `Recurring challenge identified: ${weakness}.`,
      ),
      ...input.recommendations
        .slice(0, 2)
        .map((recommendation) => recommendation.recommendation_text),
      organizationProfile.employeeHint,
      organizationExperience.scenarioExamples[0]
        ? input.locale === 'he'
          ? `דוגמה רלוונטית לעבודה שלכם: ${organizationExperience.scenarioExamples[0]}`
          : `Relevant scenario for your work context: ${organizationExperience.scenarioExamples[0]}`
        : '',
      getPersonalSupportPattern(input),
    ],
    5,
  )

  const practicalRules = sliceNonEmpty(
    [
      ...input.weaknesses
        .slice(0, 3)
        .map((weakness) => buildWeaknessRule(input.locale, weakness.weakness_key) ?? ''),
      input.locale === 'he'
        ? 'אם משהו מרגיש חריג, אמתו אותו בערוץ שאתם כבר סומכים עליו.'
        : 'If a message feels off, verify it through a channel you already trust.',
    ],
    3,
  )

  const summary =
    input.locale === 'he'
      ? `הדיוק הכולל שלכם עומד על ${input.stats.correctRate}%. המשך חיזוק סביב ${weakestCategory ?? 'הסימנים הקטנים'} יעזור לשפר את היציבות ואת הביטחון בהחלטות.`
      : `Your overall accuracy is ${input.stats.correctRate}%. A bit more reinforcement around ${weakestCategory ?? organizationProfile.focusTopics[0] ?? 'the smaller trust signals'} should improve consistency and confidence.`

  return {
    summary,
    strengths,
    focusAreas,
    practicalRules,
  }
}

export async function generateOrganizationRiskSummary(
  input: OrganizationSummaryInput,
) {
  const fallback = buildFallbackOrganizationSummary(input)

  if (input.overview.totalSimulationsCompleted === 0) {
    return fallback
  }

  const groqSummary = await runFastSummaryTask(() =>
    generateOrganizationSummaryWithGroq(input.locale, {
      organization: {
        name: input.organizationName,
        type: input.organizationType ?? null,
        industry: input.industry ?? null,
        segmentProfile: getOrganizationProfile(input.locale, input.organizationType, input.industry),
        segmentExperience: getOrganizationExperience(input.locale, input.organizationType),
      },
      overview: input.overview,
      weakestCategories: input.weakestCategories,
      channelBreakdown: input.channelBreakdown,
      lowEngagement: input.lowEngagement,
      employeesNeedingSupport: input.employeesNeedingSupport,
      attentionFlags: input.attentionFlags,
      companyRecommendations: input.companyRecommendations,
      riskScore: input.riskScore,
    }),
  )

  return groqSummary ?? fallback
}

export async function generatePersonalImprovementSummary(
  input: PersonalSummaryInput,
) {
  const fallback = buildFallbackPersonalSummary(input)

  if (input.stats.totalAttempts === 0) {
    return fallback
  }

  const groqSummary = await runFastSummaryTask(() =>
    generatePersonalSummaryWithGroq(input.locale, {
      learner: {
        fullName: input.profile.fullName,
        email: input.profile.email,
      },
      organization: input.organizationType
        ? {
            name: input.organizationName ?? null,
            type: input.organizationType,
            segmentProfile: getOrganizationProfile(
              input.locale,
              input.organizationType,
              null,
            ),
            segmentExperience: getOrganizationExperience(
              input.locale,
              input.organizationType,
            ),
          }
        : null,
      stats: input.stats,
      preferredDomains: input.preferredDomains,
      topWeaknesses: input.weaknesses.slice(0, 5).map((weakness) => ({
        key: weakness.weakness_key,
        label: weakness.weakness_label,
        category: weakness.category,
        score: weakness.score,
      })),
      recentRecommendations: input.recommendations.slice(0, 4).map((recommendation) => ({
        text: recommendation.recommendation_text,
        reason: recommendation.reason,
        priority: recommendation.priority,
      })),
      recentAttempts: input.recentAttempts.slice(0, 6).map((attempt) => ({
        createdAt: attempt.created_at,
        isCorrect: attempt.is_correct,
        channel: attempt.simulation?.channel ?? null,
        category: attempt.simulation?.category ?? null,
        isPhishing: attempt.simulation?.is_phishing ?? null,
        title: attempt.simulation?.title ?? null,
      })),
    }),
  )

  return groqSummary ?? fallback
}
