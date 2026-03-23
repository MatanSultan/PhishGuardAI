import type {
  Channel,
  OrganizationType,
  SimulationCategory,
  SupportedLocale,
} from '@/lib/constants'
import {
  DEFAULT_ORGANIZATION_TYPE,
  STARTER_DOMAIN_SUGGESTIONS,
} from '@/lib/constants'
import { getIndustrySuggestedDomains } from '@/lib/organizations/industry'

type LocalizedText = {
  en: string
  he: string
}

interface OrganizationSegmentConfig {
  label: LocalizedText
  description: LocalizedText
  onboardingHint: LocalizedText
  adminHint: LocalizedText
  employeeHint: LocalizedText
  focusTopics: LocalizedText[]
  priorityChannels: Channel[]
  suggestedDomains: SimulationCategory[]
  categoryLabels?: Partial<Record<SimulationCategory, LocalizedText>>
  simulationKeywords: string[]
}

export interface OrganizationSegmentProfile {
  type: OrganizationType
  label: string
  description: string
  onboardingHint: string
  adminHint: string
  employeeHint: string
  focusTopics: string[]
  priorityChannels: Channel[]
  suggestedDomains: SimulationCategory[]
}

function localizeText(value: LocalizedText, locale: SupportedLocale) {
  return value[locale]
}

const ORGANIZATION_SEGMENTS: Record<OrganizationType, OrganizationSegmentConfig> = {
  nursing_home: {
    label: {
      en: 'Nursing Home / Elder Care',
      he: 'בית אבות / ארגון סיעודי',
    },
    description: {
      en: 'Built for care managers, billing coordinators, operational staff, and teams with low technical confidence.',
      he: 'מיועד למנהלי מסגרות סיעוד, צוותי תפעול, הנהלת חשבונות ועובדים שצריכים הדרכה פשוטה וברורה.',
    },
    onboardingHint: {
      en: 'Start with supplier invoices, WhatsApp coordination, courier notices, and payment-request drills.',
      he: 'כדאי להתחיל עם חשבוניות ספקים, תיאומים ב-WhatsApp, הודעות שליחים ובקשות תשלום.',
    },
    adminHint: {
      en: 'Keep manager guidance practical: supplier fraud, WhatsApp impersonation, payment requests, and who needs a short refresher.',
      he: 'למנהלים חשוב לראות תובנות מעשיות: הונאות ספקים, התחזות ב-WhatsApp, בקשות תשלום ומי צריך רענון קצר.',
    },
    employeeHint: {
      en: 'Use plain language around invoices, deliveries, identity checks, and messages that ask for money or codes.',
      he: 'ההדרכה לעובדים צריכה להתמקד בשפה פשוטה סביב חשבוניות, משלוחים, אימות זהות והודעות שמבקשות כסף או קודים.',
    },
    focusTopics: [
      {
        en: 'Supplier invoices and urgent payment changes',
        he: 'חשבוניות ספקים ושינויי תשלום דחופים',
      },
      {
        en: 'WhatsApp requests that impersonate managers, suppliers, or family contacts',
        he: 'בקשות ב-WhatsApp שמתחזות למנהלים, ספקים או בני משפחה',
      },
      {
        en: 'Courier, pharmacy, and healthcare coordination messages',
        he: 'הודעות שליחים, תרופות ותיאומי טיפול',
      },
    ],
    priorityChannels: ['whatsapp', 'email', 'sms'],
    suggestedDomains: ['bank', 'social', 'delivery', 'workplace', 'government'],
    categoryLabels: {
      bank: {
        en: 'Invoices & Supplier Payments',
        he: 'חשבוניות ותשלומי ספקים',
      },
      workplace: {
        en: 'Care Coordination & Internal Requests',
        he: 'תיאום טיפול ובקשות פנימיות',
      },
      social: {
        en: 'WhatsApp & Identity Impersonation',
        he: 'WhatsApp והתחזות לזהות מוכרת',
      },
      government: {
        en: 'Health & Official Notices',
        he: 'הודעות בריאות ורשמיות',
      },
    },
    simulationKeywords: [
      'supplier',
      'invoice',
      'payment',
      'pharmacy',
      'medical',
      'care',
      'courier',
      'delivery',
      'whatsapp',
      'resident',
      'family',
      'חשבונית',
      'ספק',
      'תשלום',
      'שליח',
      'ווטסאפ',
      'תרופות',
      'סיעוד',
      'מנהל משמרת',
    ],
  },
  education: {
    label: {
      en: 'Education / School Network',
      he: 'רשת חינוך / מוסד לימודי',
    },
    description: {
      en: 'Designed for principals, school admins, teachers, and staff who need clear training without technical jargon.',
      he: 'מיועד למנהלי בתי ספר, צוותי הנהלה, מורים ועובדים שצריכים חוויית שימוש נגישה ולא טכנית.',
    },
    onboardingHint: {
      en: 'Start with parent impersonation, Google or Microsoft account warnings, and ministry-style notices.',
      he: 'כדאי להתחיל עם התחזות להורים, אזהרות Google או Microsoft והודעות בסגנון משרד החינוך.',
    },
    adminHint: {
      en: 'Highlight parent-message scams, school admin impersonation, login warnings, and staff who need a short refresher.',
      he: 'למנהלים חשוב לראות התחזות להורים, הודעות בשם הנהלת בית הספר, אזהרות התחברות ומי צריך רענון קצר.',
    },
    employeeHint: {
      en: 'Focus advice on parent communication, school coordination, account warnings, and official-looking notices.',
      he: 'כדאי לכוון את ההדרכה לתקשורת עם הורים, תיאומי צוות, אזהרות חשבון והודעות שנראות רשמיות.',
    },
    focusTopics: [
      {
        en: 'Parent or student messages that create urgency',
        he: 'הודעות הורה או תלמיד שיוצרות לחץ ודחיפות',
      },
      {
        en: 'Google or Microsoft sign-in and password reset warnings',
        he: 'אזהרות התחברות ואיפוס סיסמה של Google או Microsoft',
      },
      {
        en: 'School admin or ministry notices that look official',
        he: 'הודעות בשם הנהלת בית הספר או משרד החינוך שנראות רשמיות',
      },
    ],
    priorityChannels: ['email', 'whatsapp', 'sms'],
    suggestedDomains: ['account_security', 'social', 'workplace', 'government'],
    categoryLabels: {
      account_security: {
        en: 'Google / Microsoft Access',
        he: 'גישה ל-Google / Microsoft',
      },
      workplace: {
        en: 'Staff & School Coordination',
        he: 'תיאום צוות ותקשורת בית ספרית',
      },
      social: {
        en: 'Parent & Messaging',
        he: 'הורים והודעות מיידיות',
      },
      government: {
        en: 'Ministry & Official Notices',
        he: 'משרד החינוך והודעות רשמיות',
      },
    },
    simulationKeywords: [
      'parent',
      'student',
      'teacher',
      'principal',
      'ministry',
      'classroom',
      'google',
      'microsoft',
      'password reset',
      'school',
      'הורה',
      'תלמיד',
      'מורה',
      'מנהל בית ספר',
      'משרד החינוך',
      'גוגל',
      'מיקרוסופט',
      'כיתה',
      'מערכת שעות',
    ],
  },
  nonprofit: {
    label: {
      en: 'Nonprofit / NGO / Association',
      he: 'עמותה / ארגון ללא כוונת רווח',
    },
    description: {
      en: 'Tailored for lean teams that coordinate donors, volunteers, invoices, and official notices without a dedicated security function.',
      he: 'מתאים לצוותים קטנים שמתאמים תורמים, מתנדבים, חשבוניות והודעות רשמיות בלי צוות סייבר ייעודי.',
    },
    onboardingHint: {
      en: 'Start with donation requests, volunteer coordination, invoice fraud, and official-notice scenarios.',
      he: 'כדאי להתחיל עם בקשות תרומה, תיאום מתנדבים, הונאות חשבונית והודעות שנראות רשמיות.',
    },
    adminHint: {
      en: 'Keep reporting simple: donation fraud, volunteer-message scams, payment requests, and staff who need a refresher.',
      he: 'בדוחות כדאי להתמקד בהונאות תרומה, הודעות מתנדבים חשודות, בקשות תשלום ומי צריך רענון.',
    },
    employeeHint: {
      en: 'Use practical examples around donors, volunteers, invoices, and official notices.',
      he: 'הדוגמאות לעובדים צריכות להתמקד בתורמים, מתנדבים, חשבוניות והודעות רשמיות.',
    },
    focusTopics: [
      {
        en: 'Donation links and payment details that do not match normal workflows',
        he: 'קישורי תרומה ופרטי תשלום שלא תואמים לזרימה הרגילה',
      },
      {
        en: 'Volunteer coordination messages that ask for urgent action or data',
        he: 'הודעות תיאום מתנדבים שמבקשות פעולה דחופה או מידע',
      },
      {
        en: 'Invoice requests and official notices sent to busy operations staff',
        he: 'חשבוניות והודעות רשמיות שנשלחות לצוות תפעול עמוס',
      },
    ],
    priorityChannels: ['email', 'whatsapp', 'sms'],
    suggestedDomains: ['bank', 'social', 'shopping', 'government'],
    categoryLabels: {
      bank: {
        en: 'Donations & Payments',
        he: 'תרומות ותשלומים',
      },
      social: {
        en: 'Volunteer & Messaging',
        he: 'מתנדבים והודעות מיידיות',
      },
      shopping: {
        en: 'Vendors & Event Services',
        he: 'ספקים ושירותי אירועים',
      },
      workplace: {
        en: 'Internal Coordination',
        he: 'תיאום פנימי',
      },
    },
    simulationKeywords: [
      'donation',
      'donor',
      'volunteer',
      'association',
      'ngo',
      'invoice',
      'payment',
      'event',
      'עמותה',
      'תרומה',
      'תורם',
      'מתנדב',
      'חשבונית',
      'תשלום',
      'אירוע',
      'אישור עמותות',
    ],
  },
  municipality: {
    label: {
      en: 'Municipality / Local Public Organization',
      he: 'רשות מקומית / ארגון ציבורי מקומי',
    },
    description: {
      en: 'Optimized for municipal managers, coordinators, finance teams, and public-service operations staff.',
      he: 'מותאם למנהלי רשויות, רכזים, צוותי כספים ועובדי שירות ציבורי מקומי.',
    },
    onboardingHint: {
      en: 'Start with municipal notices, vendor payments, internal department requests, and manager impersonation.',
      he: 'כדאי להתחיל עם הודעות עירוניות, תשלומי ספקים, בקשות בין מחלקות והתחזות למנהלים.',
    },
    adminHint: {
      en: 'Report in plain language: official-looking notices, vendor or billing fraud, internal impersonation, and who needs reinforcement.',
      he: 'בדוחות חשוב לדבר בשפה פשוטה על הודעות רשמיות, הונאות ספקים או חיוב, התחזות פנימית ומי צריך חיזוק.',
    },
    employeeHint: {
      en: 'Focus advice on official-looking notices, department requests, vendor payments, and fast approvals.',
      he: 'ההדרכה צריכה להתמקד בהודעות רשמיות, בקשות בין מחלקות, תשלומי ספקים ואישורים מהירים.',
    },
    focusTopics: [
      {
        en: 'Official-looking municipal or government notices',
        he: 'הודעות עירוניות או ממשלתיות שנראות רשמיות',
      },
      {
        en: 'Vendor invoices, billing changes, and urgent approvals',
        he: 'חשבוניות ספקים, שינויי חיוב ובקשות לאישור דחוף',
      },
      {
        en: 'Messages that impersonate department heads or internal teams',
        he: 'הודעות שמתחזות לראשי מחלקות או לצוותים פנימיים',
      },
    ],
    priorityChannels: ['email', 'sms', 'whatsapp'],
    suggestedDomains: ['government', 'workplace', 'bank', 'shopping'],
    categoryLabels: {
      bank: {
        en: 'Vendor Payments & Billing',
        he: 'תשלומי ספקים וחיובים',
      },
      workplace: {
        en: 'Internal Department Requests',
        he: 'בקשות בין מחלקות',
      },
      shopping: {
        en: 'Suppliers & Procurement',
        he: 'ספקים ורכש',
      },
      government: {
        en: 'Municipal & Official Notices',
        he: 'הודעות עירוניות ורשמיות',
      },
    },
    simulationKeywords: [
      'municipal',
      'municipality',
      'public services',
      'vendor',
      'billing',
      'department',
      'arnona',
      'official notice',
      'רשות',
      'עירייה',
      'ארנונה',
      'מחלקה',
      'ספק',
      'חיוב',
      'הודעה רשמית',
      'מכרז',
    ],
  },
  smb: {
    label: {
      en: 'SMB / Small Business',
      he: 'SMB / עסק קטן או בינוני',
    },
    description: {
      en: 'A straightforward setup for owners, office managers, finance staff, and small teams without security specialists.',
      he: 'הגדרה פשוטה לבעלי עסקים, מנהלי משרד, הנהלת חשבונות וצוותים קטנים בלי מומחה סייבר פנימי.',
    },
    onboardingHint: {
      en: 'Start with invoice fraud, courier alerts, account-security warnings, and vendor impersonation.',
      he: 'כדאי להתחיל עם הונאות חשבוניות, הודעות שליחים, אזהרות אבטחת חשבון והתחזות לספקים.',
    },
    adminHint: {
      en: 'Keep the manager view focused on invoices, deliveries, account alerts, and the employees who need quick follow-up.',
      he: 'למנהלים חשוב לראות תמונה פשוטה סביב חשבוניות, משלוחים, אזהרות חשבון ומי צריך מעקב קצר.',
    },
    employeeHint: {
      en: 'Use examples around invoices, deliveries, login warnings, procurement, and supplier impersonation.',
      he: 'הדוגמאות לעובדים צריכות להתמקד בחשבוניות, משלוחים, אזהרות התחברות, רכש והתחזות לספקים.',
    },
    focusTopics: [
      {
        en: 'Invoice fraud and payment-change messages',
        he: 'הונאות חשבונית והודעות על שינוי פרטי תשלום',
      },
      {
        en: 'Courier or delivery alerts that push to urgent action',
        he: 'הודעות שליח או משלוח שלוחצות לפעולה מהירה',
      },
      {
        en: 'Banking or account-security warnings that ask for logins or resets',
        he: 'אזהרות בנק או אבטחת חשבון שמבקשות התחברות או איפוס',
      },
    ],
    priorityChannels: ['email', 'sms', 'whatsapp'],
    suggestedDomains: ['bank', 'delivery', 'account_security', 'shopping'],
    categoryLabels: {
      bank: {
        en: 'Invoices & Payments',
        he: 'חשבוניות ותשלומים',
      },
      shopping: {
        en: 'Procurement & Vendors',
        he: 'רכש וספקים',
      },
      social: {
        en: 'WhatsApp & Quick Requests',
        he: 'WhatsApp ובקשות מהירות',
      },
    },
    simulationKeywords: [
      'invoice',
      'vendor',
      'payment',
      'courier',
      'delivery',
      'bank',
      'account',
      'password reset',
      'procurement',
      'חשבונית',
      'ספק',
      'תשלום',
      'שליח',
      'משלוח',
      'בנק',
      'רכש',
      'איפוס סיסמה',
    ],
  },
  other: {
    label: {
      en: 'Other Organization',
      he: 'ארגון אחר',
    },
    description: {
      en: 'A balanced setup for organizations that want practical phishing-awareness training without enterprise overhead.',
      he: 'הגדרה מאוזנת לארגונים שרוצים מודעות לפישינג בלי עומס ארגוני מיותר.',
    },
    onboardingHint: {
      en: 'Start with invoices, account security, delivery alerts, and internal requests.',
      he: 'כדאי להתחיל עם חשבוניות, אבטחת חשבון, הודעות משלוח ובקשות פנימיות.',
    },
    adminHint: {
      en: 'Use the manager view to spot risky channels, repeated topic gaps, and employees who need a refresher.',
      he: 'השתמשו בתצוגת המנהלים כדי לזהות ערוצים מסוכנים, פערים חוזרים ומי צריך רענון.',
    },
    employeeHint: {
      en: 'Keep guidance clear around invoices, delivery alerts, account warnings, and unusual requests.',
      he: 'כדאי לשמור על הדרכה ברורה סביב חשבוניות, הודעות משלוח, אזהרות חשבון ובקשות חריגות.',
    },
    focusTopics: [
      {
        en: 'Invoices, payments, and urgent finance requests',
        he: 'חשבוניות, תשלומים ובקשות כספיות דחופות',
      },
      {
        en: 'Account-security warnings and password resets',
        he: 'אזהרות אבטחת חשבון ואיפוסי סיסמה',
      },
      {
        en: 'Delivery notices, internal messages, and quick approvals',
        he: 'הודעות משלוח, הודעות פנימיות ואישורים מהירים',
      },
    ],
    priorityChannels: ['email', 'sms', 'whatsapp'],
    suggestedDomains: [...STARTER_DOMAIN_SUGGESTIONS],
    simulationKeywords: [
      'invoice',
      'payment',
      'delivery',
      'account',
      'security',
      'internal',
      'חשבונית',
      'תשלום',
      'משלוח',
      'חשבון',
      'אבטחה',
      'פנימי',
    ],
  },
}

export function normalizeOrganizationType(value: string | null | undefined): OrganizationType {
  if (!value) {
    return DEFAULT_ORGANIZATION_TYPE
  }

  return value in ORGANIZATION_SEGMENTS
    ? (value as OrganizationType)
    : DEFAULT_ORGANIZATION_TYPE
}

export function getOrganizationSegmentLabel(
  value: string | null | undefined,
  locale: SupportedLocale,
) {
  return localizeText(ORGANIZATION_SEGMENTS[normalizeOrganizationType(value)].label, locale)
}

export function getOrganizationSegmentProfile(
  organizationType: string | null | undefined,
  industry: string | null | undefined,
  locale: SupportedLocale,
): OrganizationSegmentProfile {
  const type = normalizeOrganizationType(organizationType)
  const config = ORGANIZATION_SEGMENTS[type]
  const industryFallback =
    type === 'other' ? getIndustrySuggestedDomains(industry) : []
  const suggestedDomains = config.suggestedDomains.length
    ? config.suggestedDomains
    : industryFallback.length
      ? industryFallback
      : [...STARTER_DOMAIN_SUGGESTIONS]

  return {
    type,
    label: localizeText(config.label, locale),
    description: localizeText(config.description, locale),
    onboardingHint: localizeText(config.onboardingHint, locale),
    adminHint: localizeText(config.adminHint, locale),
    employeeHint: localizeText(config.employeeHint, locale),
    focusTopics: config.focusTopics.map((topic) => localizeText(topic, locale)),
    priorityChannels: [...config.priorityChannels],
    suggestedDomains,
  }
}

export function getOrganizationSuggestedDomains(
  organizationType: string | null | undefined,
  industry: string | null | undefined,
) {
  const type = normalizeOrganizationType(organizationType)
  const configured = ORGANIZATION_SEGMENTS[type].suggestedDomains

  if (configured.length) {
    return [...configured]
  }

  const industrySuggested = getIndustrySuggestedDomains(industry)
  return industrySuggested.length ? industrySuggested : [...STARTER_DOMAIN_SUGGESTIONS]
}

export function getOrganizationCategoryLabelOverride(
  organizationType: string | null | undefined,
  category: SimulationCategory,
  locale: SupportedLocale,
) {
  const type = normalizeOrganizationType(organizationType)
  return ORGANIZATION_SEGMENTS[type].categoryLabels?.[category]?.[locale] ?? null
}

export function getOrganizationSimulationKeywords(
  organizationType: string | null | undefined,
) {
  const type = normalizeOrganizationType(organizationType)
  return [...ORGANIZATION_SEGMENTS[type].simulationKeywords]
}

