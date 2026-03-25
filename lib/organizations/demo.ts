import type { OrganizationType, SupportedLocale } from '@/lib/constants'
import { normalizeOrganizationType } from '@/lib/organizations/segments'

type LocalizedText = {
  en: string
  he: string
}

interface OrganizationDemoPresetConfig {
  pitch: LocalizedText
  managerValue: LocalizedText
  quickSteps: LocalizedText[]
}

export interface OrganizationDemoPreset {
  type: OrganizationType
  pitch: string
  managerValue: string
  quickSteps: string[]
}

function localizeText(value: LocalizedText, locale: SupportedLocale) {
  return value[locale]
}

const DEMO_PRESETS: Record<OrganizationType, OrganizationDemoPresetConfig> = {
  nursing_home: {
    pitch: {
      en: 'Show how care managers can reduce payment and WhatsApp risk without asking staff to learn security jargon.',
      he: 'הדגימו איך מנהלי מסגרות סיעוד יכולים לצמצם סיכון של תשלומים ו-WhatsApp בלי להעמיס על הצוות שפת סייבר.',
    },
    managerValue: {
      en: 'Best value screens: supplier-payment risk, who needs a refresher, and the next manager action.',
      he: 'המסכים הכי חזקים בדמו: סיכון סביב ספקים ותשלומים, מי צריך רענון, ומה הצעד הבא של המנהל.',
    },
    quickSteps: [
      {
        en: 'Start with invoice changes, courier notices, and WhatsApp impersonation.',
        he: 'התחילו עם שינויי חשבוניות, הודעות שליח ו-התחזות ב-WhatsApp.',
      },
      {
        en: 'Point to which staff need a short refresher and which channel is riskiest.',
        he: 'הראו מי מהצוות צריך רענון קצר ואיזה ערוץ הוא המסוכן ביותר כרגע.',
      },
      {
        en: 'Open reports and show the simple next action for a non-technical manager.',
        he: 'פתחו את הדוחות והראו את הצעד הבא בשפה פשוטה למנהל לא טכני.',
      },
    ],
  },
  education: {
    pitch: {
      en: 'Show how school leaders can spot parent impersonation, login warnings, and official-looking notices quickly.',
      he: 'הדגימו איך הנהלת בית ספר יכולה לזהות מהר התחזות להורים, אזהרות התחברות והודעות שנראות רשמיות.',
    },
    managerValue: {
      en: 'Best value screens: parent-message risk, account-warning confusion, and which staff need follow-up.',
      he: 'המסכים הכי חזקים בדמו: סיכון סביב הודעות הורים, בלבול באזהרות חשבון, ואילו אנשי צוות צריכים מעקב.',
    },
    quickSteps: [
      {
        en: 'Start with parent messages, school-admin impersonation, and Google or Microsoft warnings.',
        he: 'התחילו עם הודעות הורים, התחזות להנהלת בית הספר ואזהרות Google או Microsoft.',
      },
      {
        en: 'Show that the dashboard explains risk in plain language for principals and coordinators.',
        he: 'הראו שהדשבורד מסביר סיכון בשפה פשוטה למנהלים ולרכזים.',
      },
      {
        en: 'Open the team report and point to the refresher group and next practice topic.',
        he: 'פתחו את דוח הצוות והראו את קבוצת הרענון ואת נושא התרגול הבא.',
      },
    ],
  },
  nonprofit: {
    pitch: {
      en: 'Show how lean nonprofit teams can manage donor, volunteer, and payment risk with very little admin overhead.',
      he: 'הדגימו איך עמותה רזה יכולה לנהל סיכון של תורמים, מתנדבים ותשלומים עם מעט מאוד עומס ניהולי.',
    },
    managerValue: {
      en: 'Best value screens: donation fraud, volunteer-message scams, and who needs a quick refresher this week.',
      he: 'המסכים הכי חזקים בדמו: הונאות תרומות, הודעות מתנדבים חשודות, ומי צריך רענון מהיר השבוע.',
    },
    quickSteps: [
      {
        en: 'Start with donations, volunteer coordination, invoices, and official notices.',
        he: 'התחילו עם תרומות, תיאום מתנדבים, חשבוניות והודעות רשמיות.',
      },
      {
        en: 'Show that recommendations stay short and practical for small teams.',
        he: 'הראו שההמלצות נשארות קצרות ומעשיות גם לצוותים קטנים.',
      },
      {
        en: 'Use reports to show which employees or groups need reinforcement first.',
        he: 'השתמשו בדוחות כדי להראות אילו עובדים או קבוצות צריכים חיזוק קודם.',
      },
    ],
  },
  municipality: {
    pitch: {
      en: 'Show how municipal managers can monitor official-looking notices, vendor payments, and internal impersonation without enterprise complexity.',
      he: 'הדגימו איך מנהלי רשות יכולים לעקוב אחרי הודעות רשמיות, תשלומי ספקים והתחזות פנימית בלי מורכבות ארגונית מיותרת.',
    },
    managerValue: {
      en: 'Best value screens: official-notice risk, vendor-payment pressure, and policy-friendly next steps.',
      he: 'המסכים הכי חזקים בדמו: סיכון של הודעות רשמיות, לחץ סביב תשלומי ספקים, והצעדים הבאים שמתאימים לעבודה מול נוהל.',
    },
    quickSteps: [
      {
        en: 'Start with official notices, vendor billing changes, and internal approval requests.',
        he: 'התחילו עם הודעות רשמיות, שינויי חיוב של ספקים ובקשות אישור פנימיות.',
      },
      {
        en: 'Show the riskiest channel and who needs a refresher first.',
        he: 'הראו מהו הערוץ המסוכן ביותר ומי צריך רענון קודם.',
      },
      {
        en: 'Open reports to show plain-language manager guidance rather than security jargon.',
        he: 'פתחו את הדוחות כדי להראות הנחיה למנהל בשפה פשוטה ולא בז׳רגון אבטחה.',
      },
    ],
  },
  smb: {
    pitch: {
      en: 'Show how a small business can reduce invoice, delivery, and account-alert risk with almost no setup friction.',
      he: 'הדגימו איך עסק קטן יכול לצמצם סיכון של חשבוניות, משלוחים ואזהרות חשבון כמעט בלי חיכוך הקמה.',
    },
    managerValue: {
      en: 'Best value screens: invoice fraud, delivery scams, and who needs a refresher without hiring a security team.',
      he: 'המסכים הכי חזקים בדמו: הונאות חשבוניות, הונאות משלוחים, ומי צריך רענון בלי להחזיק צוות אבטחה.',
    },
    quickSteps: [
      {
        en: 'Start with invoices, deliveries, banking alerts, and vendor impersonation.',
        he: 'התחילו עם חשבוניות, משלוחים, אזהרות בנקאיות והתחזות לספקים.',
      },
      {
        en: 'Show the manager-at-a-glance cards before drilling into detailed reports.',
        he: 'הראו קודם את כרטיסי המבט המהיר למנהל ורק אחר כך את הדוחות המפורטים.',
      },
      {
        en: 'Use the simulation preview to prove the examples match daily business workflows.',
        he: 'השתמשו בתצוגת הסימולציות כדי להראות שהדוגמאות תואמות את זרימת העבודה היומיומית.',
      },
    ],
  },
  other: {
    pitch: {
      en: 'Show how a non-mature organization can get practical phishing awareness without enterprise overhead.',
      he: 'הדגימו איך ארגון בלי בשלות סייבר יכול לקבל מודעות פרקטית לפישינג בלי עומס ארגוני.',
    },
    managerValue: {
      en: 'Best value screens: biggest current risk, who needs a refresher, and the next training topic.',
      he: 'המסכים הכי חזקים בדמו: מהו הסיכון המרכזי, מי צריך רענון, ומהו נושא האימון הבא.',
    },
    quickSteps: [
      {
        en: 'Start with invoices, delivery alerts, account warnings, and internal requests.',
        he: 'התחילו עם חשבוניות, התראות משלוח, אזהרות חשבון ובקשות פנימיות.',
      },
      {
        en: 'Use the dashboard to show the biggest risk in plain language.',
        he: 'השתמשו בדשבורד כדי להראות את הסיכון המרכזי בשפה פשוטה.',
      },
      {
        en: 'Open the report to show which group needs reinforcement first.',
        he: 'פתחו את הדוח כדי להראות איזו קבוצה צריכה חיזוק קודם.',
      },
    ],
  },
}

export function getOrganizationDemoPreset(
  organizationType: string | null | undefined,
  locale: SupportedLocale,
): OrganizationDemoPreset {
  const type = normalizeOrganizationType(organizationType)
  const config = DEMO_PRESETS[type]

  return {
    type,
    pitch: localizeText(config.pitch, locale),
    managerValue: localizeText(config.managerValue, locale),
    quickSteps: config.quickSteps.map((step) => localizeText(step, locale)),
  }
}
