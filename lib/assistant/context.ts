import type { OrganizationRole } from '@/lib/constants'

export type AssistantRole = OrganizationRole | 'individual'

export type AssistantMode = 'organization' | 'individual'

export interface PageHelpContext {
  page: string
  summary: string
  allowedTopics: string[]
  actions: string[]
  starterPrompts: {
    admin: string[]
    employee: string[]
  }
  notes?: string[]
}

const riskScoreNotes = [
  'Risk Score is 0–100: lower is safer. Low (≥75), Medium (50–74), High (<50).',
  'It is based on detection rate, safe-message accuracy, inactivity, repeated misses, and weak domains/channels.',
]

export const PAGE_HELP_REGISTRY: Record<string, PageHelpContext> = {
  dashboard: {
    page: 'dashboard',
    summary: 'Manager/employee dashboard with scores, recent activity, and next steps.',
    allowedTopics: ['cards', 'scores', 'next steps', 'navigation', 'training start'],
    actions: ['View personal summary', 'Start or continue training', 'Open detailed reports'],
    starterPrompts: {
      admin: ['את מי צריך לרענן?', 'מה אומר Risk Score?', 'מה לעשות עכשיו?'],
      employee: ['איך מתחילים אימון?', 'מה המשמעות של הציון שלי?', 'איך אני משתפר?'],
    },
    notes: riskScoreNotes,
  },
  training: {
    page: 'training',
    summary: 'Employee training flow to decide if a message is safe or phishing.',
    allowedTopics: ['how to answer', 'what happens after responding', 'training tips'],
    actions: ['Open the next simulation', 'Mark as safe or phishing', 'Read feedback'],
    starterPrompts: {
      admin: ['איך עובד האימון לעובדים?', 'מה קורה אחרי סימולציה?', 'איך להסביר לעובדים מה לעשות?'],
      employee: ['איך עונים לשאלה?', 'מה יקרה אחרי שאבחר?', 'איך אני משתפר?'],
    },
  },
  memory: {
    page: 'memory',
    summary: 'Personal memory/insights showing patterns, strengths, and focus areas.',
    allowedTopics: ['memory items', 'focus areas', 'strengths', 'next steps'],
    actions: ['Review personal focus areas', 'Start a refresher', 'Read practical rules'],
    starterPrompts: {
      admin: ['איך לקרוא את פרופיל הזיכרון?', 'איך לעזור לעובדים לשפר את הפוקוס?', 'מה המשמעות של חולשה חוזרת?'],
      employee: ['מה המשמעות של הפוקוס שלי?', 'איך לשפר אזור חלש?', 'איפה רואים את החוזקות?'],
    },
  },
  reports: {
    page: 'reports',
    summary: 'User-facing reports with attempts, accuracy, and feedback history.',
    allowedTopics: ['filters', 'attempt history', 'feedback meaning'],
    actions: ['Filter by time', 'Open an attempt and read feedback', 'Start a refresher'],
    starterPrompts: {
      admin: ['איך לקרוא את הדוח הזה?', 'איפה רואים התחזקות או ירידה?', 'איך להוציא תובנות לקבוצה?'],
      employee: ['מה אומר כל ניסיון?', 'איך למצוא משוב ישן?', 'איך להתחיל רענון מכאן?'],
    },
  },
  admin: {
    page: 'admin',
    summary: 'Admin overview for managing simulations and content.',
    allowedTopics: ['navigation', 'simulations list', 'filters', 'statuses'],
    actions: ['View simulations', 'Filter by status', 'Create a new simulation'],
    starterPrompts: {
      admin: ['איך לסנן סימולציות?', 'מה מצב טיוטה אומר?', 'איך ליצור סימולציה חדשה?'],
      employee: ['למה אין לי גישה לדף הזה?'],
    },
  },
  'admin/reports': {
    page: 'admin/reports',
    summary: 'Org-wide reports with risk signals, channels, and refresher needs.',
    allowedTopics: ['risk score meaning', 'filters', 'segments', 'refresher guidance'],
    actions: ['Filter by segment or channel', 'See who needs refresher', 'Download or view summaries'],
    starterPrompts: {
      admin: ['מה אומר Risk Score?', 'את מי לרענן קודם?', 'מה לעשות עכשיו?'],
      employee: ['למה אין לי גישה לדוחי מנהלים?'],
    },
    notes: riskScoreNotes,
  },
  'admin/invites': {
    page: 'admin/invites',
    summary: 'Invite management for adding or canceling organization members.',
    allowedTopics: ['how to invite', 'invite status meanings', 'canceling invites'],
    actions: ['Create a new invite', 'Copy invite link', 'Cancel pending invite'],
    starterPrompts: {
      admin: ['איך מזמינים עובדים?', 'מה אומר מצב Pending?', 'איך מבטלים הזמנה?'],
      employee: ['איך מצטרפים בעזרת הזמנה שקיבלתי?'],
    },
  },
  leaderboard: {
    page: 'leaderboard',
    summary: 'Leaderboard available to admins when enabled.',
    allowedTopics: ['leaderboard visibility', 'how ranking works', 'access issues'],
    actions: ['View ranking', 'Filter if available'],
    starterPrompts: {
      admin: ['למה אני לא רואה מישהו בדירוג?', 'איך הדירוג מחושב?', 'איך להשבית את הדירוג?'],
      employee: ['למה אין לי גישה לדירוג?'],
    },
  },
  settings: {
    page: 'settings',
    summary: 'User settings for profile, language, and preferences.',
    allowedTopics: ['language change', 'profile details', 'preferences'],
    actions: ['Change language', 'Update profile', 'Adjust training preferences'],
    starterPrompts: {
      admin: ['איך לשנות שפת ברירת מחדל?', 'איך לעדכן פרטים?', 'איך לבחור נושאי אימון מועדפים?'],
      employee: ['איך מחליפים שפה?', 'איפה משנים אימייל?', 'איך לבחור נושאי אימון?'],
    },
  },
}

export function resolvePageHelpContext(
  page: string | null | undefined,
  role: AssistantRole,
): PageHelpContext {
  if (page) {
    const normalized = page.replace(/^\/+|\/+$/g, '')
    if (normalized && PAGE_HELP_REGISTRY[normalized]) {
      return PAGE_HELP_REGISTRY[normalized]
    }
  }

  // Fallback context
  return {
    page: 'generic',
    summary: 'PhishGuard AI in-product help for navigation and understanding screens.',
    allowedTopics: ['navigation', 'screen explanations', 'risk score meaning', 'next actions'],
    actions: ['Ask what this page means', 'Ask where to start training', 'Ask how to read reports'],
    starterPrompts:
      role === 'admin'
        ? { admin: ['מה לעשות עכשיו כמנהל?', 'איפה מזמינים עובדים?'], employee: [] }
        : { admin: [], employee: ['איך להתחיל אימון?', 'איפה רואים את הדוח שלי?'] },
    notes: riskScoreNotes,
  }
}
