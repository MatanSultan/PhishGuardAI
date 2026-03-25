import type { OrganizationType, SupportedLocale } from '@/lib/constants'
import { normalizeOrganizationType } from '@/lib/organizations/segments'

type LocalizedText = {
  en: string
  he: string
}

interface OrganizationExperienceConfig {
  scenarioExamples: LocalizedText[]
  managerActions: LocalizedText[]
  noSecurityTeamHint: LocalizedText
}

export interface OrganizationExperienceProfile {
  type: OrganizationType
  scenarioExamples: string[]
  managerActions: string[]
  noSecurityTeamHint: string
}

function localizeText(value: LocalizedText, locale: SupportedLocale) {
  return value[locale]
}

const ORGANIZATION_EXPERIENCE: Record<OrganizationType, OrganizationExperienceConfig> = {
  nursing_home: {
    scenarioExamples: [
      {
        en: 'A supplier invoice arrives with updated bank details and a request to pay today.',
        he: 'חשבונית מספק מגיעה עם פרטי בנק מעודכנים ובקשה לשלם עוד היום.',
      },
      {
        en: 'A WhatsApp message from a shift manager asks for an urgent transfer or verification code.',
        he: 'הודעת WhatsApp ממנהל משמרת מבקשת העברה דחופה או קוד אימות.',
      },
      {
        en: 'A courier or pharmacy coordination notice asks staff to confirm identity through a link.',
        he: 'הודעת שליח או תיאום בית מרקחת מבקשת מהצוות לאמת זהות דרך קישור.',
      },
    ],
    managerActions: [
      {
        en: 'Start with billing coordinators and operational staff. Keep the first refresher short and focused on invoices, payments, and WhatsApp impersonation.',
        he: 'התחילו עם הנהלת חשבונות וצוות תפעול. שמרו את הרענון הראשון קצר וממוקד בחשבוניות, תשלומים והתחזות ב-WhatsApp.',
      },
      {
        en: 'Ask staff to pause on payment changes, new delivery fees, or identity requests until a known person confirms them.',
        he: 'בקשו מהצוות לעצור מול שינוי פרטי תשלום, דמי משלוח חדשים או בקשות אימות זהות עד שאדם מוכר מאשר אותם.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Designed for care organizations that need very plain guidance and quick manager follow-up without a dedicated security team.',
      he: 'מיועד לארגוני סיעוד שצריכים הנחיה פשוטה מאוד ומעקב מהיר של מנהלים, בלי צוות אבטחה ייעודי.',
    },
  },
  education: {
    scenarioExamples: [
      {
        en: 'A parent message creates urgency around grades, schedules, or a form that must be opened now.',
        he: 'הודעת הורה יוצרת לחץ סביב ציונים, מערכת שעות או טופס שצריך לפתוח עכשיו.',
      },
      {
        en: 'A Google or Microsoft warning asks a teacher to reset a school account password immediately.',
        he: 'אזהרת Google או Microsoft מבקשת ממורה לאפס מיד סיסמה לחשבון בית ספרי.',
      },
      {
        en: 'A principal or ministry-style notice includes an official-looking attachment or login link.',
        he: 'הודעה בשם המנהל או בסגנון משרד החינוך כוללת קובץ מצורף או קישור כניסה שנראים רשמיים.',
      },
    ],
    managerActions: [
      {
        en: 'Give teachers and school admins short refreshers on parent impersonation, account warnings, and official-looking notices.',
        he: 'תנו למורים ולאנשי מנהלה רענונים קצרים על התחזות להורים, אזהרות חשבון והודעות שנראות רשמיות.',
      },
      {
        en: 'Keep reporting focused on who clicked quickly, which channel was used, and who needs a simple follow-up this week.',
        he: 'שמרו את הדיווח ממוקד במי פעל מהר מדי, באיזה ערוץ זה קרה ומי צריך מעקב פשוט השבוע.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Built for school managers who need practical guidance for non-technical staff, not enterprise security language.',
      he: 'נבנה עבור מנהלי בתי ספר שצריכים הנחיה מעשית לצוות לא טכני, לא שפה של אבטחת מידע ארגונית כבדה.',
    },
  },
  nonprofit: {
    scenarioExamples: [
      {
        en: 'A donation campaign email uses a new payment link that does not match the normal workflow.',
        he: 'מייל קמפיין תרומות משתמש בקישור תשלום חדש שלא תואם לזרימה הרגילה.',
      },
      {
        en: 'A volunteer coordinator message asks for an urgent spreadsheet, password reset, or file upload.',
        he: 'הודעת ריכוז מתנדבים מבקשת בדחיפות גיליון, איפוס סיסמה או העלאת קובץ.',
      },
      {
        en: 'An official-looking notice about registrations, approvals, or taxes pressures the team to respond fast.',
        he: 'הודעה שנראית רשמית על רישומים, אישורים או מיסוי לוחצת על הצוות להגיב מהר.',
      },
    ],
    managerActions: [
      {
        en: 'Prioritize finance and operations first. Run quick drills on donations, invoices, and volunteer coordination scams.',
        he: 'תעדפו קודם את הכספים והתפעול. הפעילו תרגולים קצרים על תרומות, חשבוניות והונאות בתיאום מתנדבים.',
      },
      {
        en: 'Use short weekly reminders instead of heavy programs so lean teams can keep up.',
        he: 'השתמשו בתזכורות שבועיות קצרות במקום תוכניות כבדות כדי שצוותים קטנים יוכלו לעמוד בזה.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Optimized for lean nonprofit teams that need simple admin workflows and clear next steps.',
      he: 'מותאם לצוותי עמותות רזים שצריכים תהליכי ניהול פשוטים וצעד הבא ברור.',
    },
  },
  municipality: {
    scenarioExamples: [
      {
        en: 'A vendor invoice or procurement request includes new bank details and asks for urgent approval.',
        he: 'חשבונית ספק או בקשת רכש כוללת פרטי בנק חדשים ומבקשת אישור דחוף.',
      },
      {
        en: 'A department head or municipal coordinator asks an employee to act quickly on an internal request.',
        he: 'ראש מחלקה או רכז עירוני מבקש מעובד לפעול מהר על בקשה פנימית.',
      },
      {
        en: 'An official municipal or government notice creates pressure around deadlines, attachments, or policy actions.',
        he: 'הודעה עירונית או ממשלתית רשמית יוצרת לחץ סביב דדליין, קובץ מצורף או פעולה לפי נוהל.',
      },
    ],
    managerActions: [
      {
        en: 'Keep reporting tied to approvals, vendor payments, internal impersonation, and which teams need refresher training first.',
        he: 'קשרו את הדיווח לאישורים, תשלומי ספקים, התחזות פנימית ולאילו צוותים צריך לתת רענון קודם.',
      },
      {
        en: 'Share one clear action per week for coordinators instead of a long security checklist.',
        he: 'שתפו פעולה אחת ברורה לכל שבוע לרכזים במקום רשימת אבטחה ארוכה.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Built for municipal coordinators and public-service managers who need policy-friendly reporting without enterprise overhead.',
      he: 'נבנה עבור רכזים ברשויות ומנהלי שירות ציבורי שצריכים דיווח ידידותי לנוהל, בלי מורכבות ארגונית מיותרת.',
    },
  },
  smb: {
    scenarioExamples: [
      {
        en: 'An invoice or supplier email says the payment account changed and must be updated now.',
        he: 'מייל של חשבונית או ספק טוען שחשבון התשלום השתנה וצריך לעדכן אותו עכשיו.',
      },
      {
        en: 'A courier alert asks for a small fee, address confirmation, or urgent delivery action.',
        he: 'הודעת שליח מבקשת תשלום קטן, אימות כתובת או פעולה דחופה למסירה.',
      },
      {
        en: 'A banking, login, or password-reset warning pushes the team to sign in immediately.',
        he: 'אזהרת בנק, כניסה או איפוס סיסמה דוחפת את הצוות להתחבר מיד.',
      },
    ],
    managerActions: [
      {
        en: 'Start with office managers, finance, and procurement staff. Keep the first drills around invoices, deliveries, and vendor impersonation.',
        he: 'התחילו עם מנהלי משרד, כספים ורכש. שמרו את התרגולים הראשונים סביב חשבוניות, משלוחים והתחזות לספקים.',
      },
      {
        en: 'Use short follow-up notes: verify the sender, bank details, and urgent requests outside the original message.',
        he: 'השתמשו בהודעות מעקב קצרות: לאמת שולח, פרטי בנק ובקשות דחופות מחוץ להודעה המקורית.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Designed for small businesses that need visible value, local examples, and low-friction admin controls.',
      he: 'מיועד לעסקים קטנים שצריכים ערך ברור, דוגמאות מקומיות וניהול פשוט בלי חיכוך.',
    },
  },
  other: {
    scenarioExamples: [
      {
        en: 'An invoice or payment request arrives with urgency and unfamiliar instructions.',
        he: 'בקשת חשבונית או תשלום מגיעה עם דחיפות והוראות לא מוכרות.',
      },
      {
        en: 'A delivery, login, or account warning pushes for a fast click or reset.',
        he: 'אזהרת משלוח, כניסה או חשבון דוחפת ללחיצה מהירה או לאיפוס.',
      },
      {
        en: 'An internal message asks for an unusual approval, file, or code outside the normal workflow.',
        he: 'הודעה פנימית מבקשת אישור חריג, קובץ או קוד מחוץ לזרימה הרגילה.',
      },
    ],
    managerActions: [
      {
        en: 'Start with the common business scenarios first and let the dashboard show which topics need extra focus later.',
        he: 'התחילו קודם בתרחישי העסק הנפוצים ותנו לדשבורד להראות בהמשך אילו נושאים צריכים חיזוק.',
      },
      {
        en: 'Keep the manager workflow simple: review the weakest topic, riskiest channel, and who needs a refresher.',
        he: 'שמרו את תהליך המנהל פשוט: בדקו את הנושא החלש, הערוץ המסוכן ומי צריך רענון.',
      },
    ],
    noSecurityTeamHint: {
      en: 'Built for organizations that want clear next steps and realistic local phishing examples without security jargon.',
      he: 'נבנה עבור ארגונים שרוצים צעד הבא ברור ודוגמאות פישינג מקומיות מציאותיות בלי ז׳רגון אבטחה.',
    },
  },
}

export function getOrganizationExperienceProfile(
  organizationType: string | null | undefined,
  locale: SupportedLocale,
): OrganizationExperienceProfile {
  const type = normalizeOrganizationType(organizationType)
  const config = ORGANIZATION_EXPERIENCE[type]

  return {
    type,
    scenarioExamples: config.scenarioExamples.map((item) => localizeText(item, locale)),
    managerActions: config.managerActions.map((item) => localizeText(item, locale)),
    noSecurityTeamHint: localizeText(config.noSecurityTeamHint, locale),
  }
}
