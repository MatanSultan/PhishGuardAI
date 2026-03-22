import type { Channel, SimulationCategory, SupportedLocale, WeaknessKey } from '@/lib/constants'
import type { TableRow } from '@/lib/database.types'
import {
  generateOrganizationSummaryWithGroq,
  generatePersonalSummaryWithGroq,
} from '@/lib/groq/service'
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
    | 'industry_mix'
  category?: SimulationCategory
  count?: number
  industry?: string | null
  domains?: SimulationCategory[]
}

interface OrganizationSummaryInput {
  locale: SupportedLocale
  organizationName: string
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
}

interface PersonalSummaryInput {
  locale: SupportedLocale
  profile: {
    fullName: string | null
    email: string
  }
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
  if (recommendation.kind === 'focus_category' && recommendation.category) {
    return locale === 'he'
      ? `תעדפו אימונים ב-${formatCategoryLabel(recommendation.category, locale)} בשבוע הקרוב.`
      : `Prioritize ${formatCategoryLabel(recommendation.category, locale)} scenarios next week.`
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
    .map((domain) => formatCategoryLabel(domain, locale))
    .join(', ')

  return locale === 'he'
    ? `התאימו את תמהיל האימונים לתעשייה עם דגש על ${domainLabels}.`
    : `Use an industry-relevant training mix with emphasis on ${domainLabels}.`
}

function buildFallbackOrganizationSummary(
  input: OrganizationSummaryInput,
): OrganizationSummaryResponse {
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
          ],
          actions: [
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

  const summary =
    input.locale === 'he'
      ? `${input.organizationName} מציג צורך בחיזוק ממוקד סביב ${weakestCategory ? formatCategoryLabel(weakestCategory.category, input.locale) : 'תחומי הסיכון המרכזיים'}, עם ${lowEngagementCount} עובדים בעלי מעורבות נמוכה.`
      : `${input.organizationName} currently needs focused reinforcement around ${weakestCategory ? formatCategoryLabel(weakestCategory.category, input.locale) : 'its main risk areas'}, with ${lowEngagementCount} employees showing low engagement.`

  const riskSignals = sliceNonEmpty(
    [
      weakestCategory
        ? input.locale === 'he'
          ? `${formatCategoryLabel(weakestCategory.category, input.locale)} הוא תחום החולשה המוביל בצוות.`
          : `${formatCategoryLabel(weakestCategory.category, input.locale)} is the leading weak domain across the team.`
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
    ],
    4,
  )

  const actions = sliceNonEmpty(
    [
      ...input.companyRecommendations.map((recommendation) =>
        buildOrganizationRecommendationAction(input.locale, recommendation),
      ),
      input.locale === 'he'
        ? 'חזקו מדיניות של אימות שולח לפני לחיצה על קישורים דחופים.'
        : 'Reinforce sender-verification policy before employees act on urgent links.',
    ],
    4,
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
  if (input.stats.totalAttempts === 0) {
    const preferredDomains = input.preferredDomains.length
      ? input.preferredDomains.map((domain) => formatCategoryLabel(domain, input.locale)).join(', ')
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
          focusAreas: [`Suggested starting focus: ${preferredDomains}.`],
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
    ? formatCategoryLabel(input.stats.strongestCategory, input.locale)
    : null
  const weakestCategory = input.stats.weakestCategory
    ? formatCategoryLabel(input.stats.weakestCategory, input.locale)
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
      getPersonalSupportPattern(input),
    ],
    4,
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
      : `Your overall accuracy is ${input.stats.correctRate}%. A bit more reinforcement around ${weakestCategory ?? 'the smaller trust signals'} should improve consistency and confidence.`

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

  const groqSummary = await generateOrganizationSummaryWithGroq(input.locale, {
    organization: {
      name: input.organizationName,
      industry: input.industry ?? null,
    },
    overview: input.overview,
    weakestCategories: input.weakestCategories,
    channelBreakdown: input.channelBreakdown,
    lowEngagement: input.lowEngagement,
    employeesNeedingSupport: input.employeesNeedingSupport,
    attentionFlags: input.attentionFlags,
    companyRecommendations: input.companyRecommendations,
  }).catch(() => null)

  return groqSummary ?? fallback
}

export async function generatePersonalImprovementSummary(
  input: PersonalSummaryInput,
) {
  const fallback = buildFallbackPersonalSummary(input)

  if (input.stats.totalAttempts === 0) {
    return fallback
  }

  const groqSummary = await generatePersonalSummaryWithGroq(input.locale, {
    learner: {
      fullName: input.profile.fullName,
      email: input.profile.email,
    },
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
  }).catch(() => null)

  return groqSummary ?? fallback
}
