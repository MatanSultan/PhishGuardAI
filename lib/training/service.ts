import {
  type Channel,
  type Difficulty,
  type OrganizationType,
  type SimulationCategory,
  type SupportedLocale,
} from '@/lib/constants'
import type { TableInsert, TableRow } from '@/lib/database.types'
import { buildDashboardSummary, buildReportsPayload, computeTrainingProfilePatch } from '@/lib/analytics/service'
import {
  generateFeedbackWithGroq,
  generateMemoryUpdateWithGroq,
  generateRecommendationWithGroq,
  generateSimulationWithGroq,
} from '@/lib/groq/service'
import {
  applyMemoryUpdate,
  buildMemoryUpdateFromRules,
  formatTrainingContext,
  getTrainingContext,
} from '@/lib/memory/service'
import { getCurrentOrganizationContext } from '@/lib/organizations/service'
import {
  getOrganizationSegmentProfile,
  getOrganizationSimulationKeywords,
} from '@/lib/organizations/segments'
import { getProfileBundle } from '@/lib/profile/service'
import { generatePersonalImprovementSummary } from '@/lib/summaries/service'
import { buildPersonalizedSelection } from '@/lib/training/personalization'
import {
  getAllAttemptsWithSimulations,
  getAnalyticsEvents,
  getCandidateSimulations,
  getRecommendations,
  getSimulationById,
  getWeaknesses,
  insertAnalyticsEvent,
  insertAttempt,
  insertRecommendation,
  insertSimulation,
  updateTrainingProfileRow,
  type AppSupabaseClient,
  type AttemptWithSimulation,
} from '@/lib/training/repository'
import type { FeedbackResponse, RecommendationResponse, SimulationGeneration } from '@/lib/validators/ai'
import type { StartTrainingInput, SubmitAttemptInput } from '@/lib/validators/training'

interface SimulationFallbackOptions {
  locale: SupportedLocale
  channel: Channel
  category: SimulationCategory
  difficulty: Difficulty
  organizationType?: OrganizationType | null
}

type GeneratedSimulationSource = 'groq' | 'fallback'

const TRAINING_AI_TIMEOUT_MS = 1200

async function runFastAiTask<T>(task: () => Promise<T | null>, timeoutMs = TRAINING_AI_TIMEOUT_MS) {
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

function simulationToInsert(
  simulation: SimulationGeneration,
  locale: SupportedLocale,
  source: GeneratedSimulationSource,
): TableInsert<'simulations'> {
  return {
    channel: simulation.channel,
    difficulty: simulation.difficulty,
    category: simulation.category,
    language: locale,
    title: simulation.title || null,
    sender: simulation.sender || null,
    content: simulation.content,
    is_phishing: simulation.isPhishing,
    explanation: simulation.explanation,
    red_flags: simulation.redFlags,
    source_model: source,
    created_by: source === 'groq' ? 'ai' : 'system',
  }
}

function isAlignedGeneratedSimulation(
  simulation: SimulationGeneration,
  selection: Pick<SimulationFallbackOptions, 'channel' | 'category' | 'difficulty'>,
) {
  return (
    simulation.channel === selection.channel &&
    simulation.category === selection.category &&
    simulation.difficulty === selection.difficulty
  )
}

function buildFallbackSimulation(options: SimulationFallbackOptions): SimulationGeneration {
  const messageLibrary: Record<
    SupportedLocale,
    Record<Channel, Record<SimulationCategory, Omit<SimulationGeneration, 'channel' | 'difficulty' | 'category'>>>
  > = {
    en: {
      email: {
        bank: {
          title: 'Account protection review',
          sender: 'Secure Team <review@bank-protect-alert.net>',
          content:
            'We detected unusual activity on your account. Review your details today to avoid temporary restrictions: https://bank-protect-alert.net/review',
          isPhishing: true,
          explanation:
            'The message creates urgency, uses a non-official sender domain, and pushes the recipient to click through a login-style review flow.',
          redFlags: ['Unfamiliar sender domain', 'Urgent account language', 'Requests action through a link'],
        },
        delivery: {
          title: 'Shipment status',
          sender: 'ParcelFlow <updates@parcelflow.example>',
          content:
            'Your package is scheduled for delivery tomorrow. Track it from your ParcelFlow account or mobile app if you placed an order.',
          isPhishing: false,
          explanation:
            'This looks legitimate because it stays informational, does not demand sensitive data, and points the user to a known account workflow.',
          redFlags: ['Informational tone', 'No pressure to act immediately', 'No password or code request'],
        },
        account_security: {
          title: 'Sign-in alert',
          sender: 'Identity Team <security@company-auth.example>',
          content:
            'We noticed a new sign-in to your account from a browser you recently used. If this was you, no action is required.',
          isPhishing: false,
          explanation:
            'Legitimate security notifications usually explain what happened, avoid threats, and do not ask for credentials in the message.',
          redFlags: ['No request for credentials', 'Neutral tone', 'Specific but non-urgent notice'],
        },
        workplace: {
          title: 'Quarter-end file request',
          sender: 'Finance Review <finance-review@consult-portal.net>',
          content:
            'Please upload the latest payroll export to the secure portal below before the end of the hour so audit can continue.',
          isPhishing: true,
          explanation:
            'This is suspicious because it uses deadline pressure and an unexpected external portal for sensitive internal data.',
          redFlags: ['Unexpected sensitive request', 'External portal', 'Urgent deadline'],
        },
        social: {
          title: 'Shared photos',
          sender: 'Nina <nina.share@photo-update.net>',
          content:
            'I uploaded the photos from last night here. The album expires today, so open it now to keep access.',
          isPhishing: true,
          explanation:
            'The message leans on curiosity and urgency while hiding behind an unfamiliar domain.',
          redFlags: ['Curiosity bait', 'Expiry pressure', 'Unknown link source'],
        },
        shopping: {
          title: 'Order receipt available',
          sender: 'StoreLine <orders@storeline.co.il>',
          content:
            'Your receipt for order SL-20314 is ready in your account dashboard. No action is required if you already viewed it.',
          isPhishing: false,
          explanation:
            'This message is low-pressure and references a plausible account workflow instead of asking for credentials or immediate payment.',
          redFlags: ['Informational wording', 'No threat', 'No sensitive data request'],
        },
        government: {
          title: 'Tax portal notice',
          sender: 'Public Services <alerts@citizen-tax-gov.net>',
          content:
            'Your annual tax record could not be finalized. Review the attached notice today to avoid a processing hold: https://citizen-tax-gov.net/review',
          isPhishing: true,
          explanation:
            'This message imitates an official notice, uses deadline pressure, and sends the user to an unofficial government-style domain.',
          redFlags: ['Unofficial government-style domain', 'Pressure tied to official processing', 'Pushes review through a link'],
        },
      },
      sms: {
        bank: {
          title: '',
          sender: 'SecureBank',
          content: 'Suspicious transfer blocked. Confirm within 15 minutes: https://secure-bank-review.co',
          isPhishing: true,
          explanation: 'Banks rarely ask customers to verify transfers through a text link, and the domain is suspicious.',
          redFlags: ['Bank warning by SMS link', 'Short deadline', 'Unofficial domain'],
        },
        delivery: {
          title: '',
          sender: 'ParcelTrack',
          content: 'Your parcel is delayed. Open your official carrier app to review the updated delivery window.',
          isPhishing: false,
          explanation: 'This message does not pressure for credentials or link clicks and directs the user to a known app workflow.',
          redFlags: ['No suspicious link', 'No sensitive request', 'Informational wording'],
        },
        account_security: {
          title: '',
          sender: 'Cloud ID',
          content: 'Verify your account now or it will be disabled tonight: https://cloudid-reset.help',
          isPhishing: true,
          explanation: 'Threat-based language and a suspicious domain are classic phishing signals.',
          redFlags: ['Account shutdown threat', 'Suspicious domain', 'Forced immediate action'],
        },
        workplace: {
          title: '',
          sender: 'Ops Team',
          content: 'Reminder: the office access system will be offline for maintenance from 8 PM to 9 PM.',
          isPhishing: false,
          explanation: 'This is a routine workplace notice without any request for secrets, links, or rushed verification.',
          redFlags: ['Routine notice', 'No action requested', 'No sensitive content'],
        },
        social: {
          title: '',
          sender: 'Friend',
          content: 'It is me on a new number. I need the code you just got so I can restore my account.',
          isPhishing: true,
          explanation: 'Requests for one-time codes over text are a strong social-engineering signal.',
          redFlags: ['Requests one-time code', 'Identity claim without proof', 'Urgent social pressure'],
        },
        shopping: {
          title: '',
          sender: 'ShopLine',
          content: 'Order 18273 has shipped. Track it from your existing account or order page.',
          isPhishing: false,
          explanation: 'It stays informational and does not ask for a link-based login or sensitive data.',
          redFlags: ['Account-based workflow', 'No urgent threat', 'No secret request'],
        },
        government: {
          title: '',
          sender: 'City Update',
          content: 'Your municipal payment is overdue. Pay in the next 30 minutes to avoid enforcement: https://city-billing-help.net',
          isPhishing: true,
          explanation: 'Official agencies rarely force payment through a rushed SMS link, and the sender domain is suspicious.',
          redFlags: ['Urgent official-payment demand', 'Suspicious billing domain', 'Short SMS deadline'],
        },
      },
      whatsapp: {
        bank: {
          title: '',
          sender: 'Support',
          content: 'We need you to confirm your debit card PIN through this chat to stop suspicious charges.',
          isPhishing: true,
          explanation: 'Legitimate banks do not ask for PINs over chat.',
          redFlags: ['Requests a PIN', 'Sensitive request via chat', 'Pressure around suspicious charges'],
        },
        delivery: {
          title: '',
          sender: 'Courier Desk',
          content: 'Your delivery is waiting at the pickup point. Bring your ID and order number when you arrive.',
          isPhishing: false,
          explanation: 'This is informational, contains no suspicious link, and does not request credentials.',
          redFlags: ['No suspicious link', 'No secrets requested', 'Pickup instructions only'],
        },
        account_security: {
          title: '',
          sender: 'IT Helpdesk',
          content: 'Please send your MFA backup code here so we can keep your account active.',
          isPhishing: true,
          explanation: 'IT should never collect MFA backup codes in chat.',
          redFlags: ['Requests MFA code', 'Sensitive request in chat', 'False urgency'],
        },
        workplace: {
          title: '',
          sender: 'People Ops',
          content: 'Open enrollment starts Monday. Details will be available in the HR portal.',
          isPhishing: false,
          explanation: 'This message announces a process without asking for secrets or pushing the user to a risky action.',
          redFlags: ['Portal reference without urgent demand', 'No credentials requested', 'Routine internal notice'],
        },
        social: {
          title: '',
          sender: 'Daniel',
          content: 'Can you buy two gift cards and send the codes here before our meeting?',
          isPhishing: true,
          explanation: 'Gift-card requests over chat are a frequent impersonation tactic.',
          redFlags: ['Gift card request', 'Pressure before a meeting', 'Unverified identity'],
        },
        shopping: {
          title: '',
          sender: 'StoreLine',
          content: 'Your return was approved. The refund will appear on your original payment method within five business days.',
          isPhishing: false,
          explanation: 'It is a low-pressure status update with no credential request or risky link.',
          redFlags: ['Informational refund notice', 'No urgent action', 'No sensitive data request'],
        },
        government: {
          title: '',
          sender: 'Gov Services',
          content: 'Please send your national ID photo in this chat so we can release your digital certificate today.',
          isPhishing: true,
          explanation: 'Government services do not request identity documents through chat, especially with same-day pressure.',
          redFlags: ['Requests identity document in chat', 'Claims official urgency', 'Unverified sender channel'],
        },
      },
    },
    he: {
      email: {
        bank: {
          title: 'בדיקת אבטחה לחשבון',
          sender: 'צוות מאובטח <review@bank-safe-alert.net>',
          content:
            'זיהינו פעילות חריגה בחשבון שלך. אשרו את הפרטים עוד היום כדי למנוע הגבלות זמניות: https://bank-safe-alert.net/review',
          isPhishing: true,
          explanation:
            'ההודעה משתמשת בדחיפות, שולחת מדומיין לא רשמי, ומבקשת לבצע פעולה דרך קישור חיצוני.',
          redFlags: ['דומיין לא רשמי', 'שפה לחוצה', 'בקשה לפעול דרך קישור'],
        },
        delivery: {
          title: 'סטטוס משלוח',
          sender: 'ParcelFlow <updates@parcelflow.example>',
          content:
            'החבילה שלך צפויה להגיע מחר. אפשר לעקוב אחריה מתוך החשבון או האפליקציה הרשמית אם ביצעת הזמנה.',
          isPhishing: false,
          explanation:
            'זו הודעה לגיטימית כי היא אינפורמטיבית, לא מבקשת מידע רגיש, ומפנה לזרימה רגילה מתוך חשבון מוכר.',
          redFlags: ['טון אינפורמטיבי', 'אין לחץ לפעול מיד', 'אין בקשה לסיסמה או לקוד'],
        },
        account_security: {
          title: 'התראת התחברות',
          sender: 'Identity Team <security@company-auth.example>',
          content:
            'זיהינו התחברות חדשה לחשבון שלך מדפדפן שבו השתמשת לאחרונה. אם זו הייתה את/ה, אין צורך בפעולה נוספת.',
          isPhishing: false,
          explanation:
            'התראות אבטחה לגיטימיות מסבירות מה קרה, לא מאיימות, ולא מבקשות סיסמה מתוך ההודעה.',
          redFlags: ['אין בקשה לפרטי הזדהות', 'טון רגוע', 'תיאור אירוע ספציפי'],
        },
        workplace: {
          title: 'בקשת קובץ לסוף רבעון',
          sender: 'Finance Review <finance-review@consult-portal.net>',
          content:
            'נא להעלות את קובץ השכר העדכני לפורטל המאובטח הבא עד סוף השעה כדי שהביקורת תוכל להמשיך.',
          isPhishing: true,
          explanation:
            'זה חשוד כי יש לחץ זמנים וגם שימוש בפורטל חיצוני לא צפוי עבור מידע פנימי רגיש.',
          redFlags: ['בקשה למידע רגיש', 'פורטל חיצוני', 'דדליין לחוץ'],
        },
        social: {
          title: 'אלבום תמונות משותף',
          sender: 'נינה <nina.share@photo-update.net>',
          content:
            'העליתי את התמונות מאתמול לכאן. האלבום יפוג היום, אז כדאי לפתוח עכשיו כדי לשמור גישה.',
          isPhishing: true,
          explanation:
            'ההודעה מנצלת סקרנות ודחיפות תוך שימוש בדומיין לא מוכר.',
          redFlags: ['פיתיון של סקרנות', 'לחץ סביב תפוגה', 'מקור קישור לא מוכר'],
        },
        shopping: {
          title: 'קבלה על הזמנה זמינה',
          sender: 'StoreLine <orders@storeline.co.il>',
          content:
            'הקבלה עבור הזמנה SL-20314 זמינה באזור האישי שלך. אין צורך בפעולה נוספת אם כבר צפית בה.',
          isPhishing: false,
          explanation:
            'ההודעה לא לוחצת, מתאימה לזרימת חשבון רגילה, ולא מבקשת מידע רגיש.',
          redFlags: ['ניסוח רגוע', 'אין איום', 'אין בקשה לפרטים סודיים'],
        },
        government: {
          title: 'עדכון מרשות המסים',
          sender: 'שירותים ממשלתיים <alerts@citizen-tax-gov.net>',
          content:
            'נדרש לעדכן את רישום המס השנתי שלך עוד היום כדי למנוע עיכוב בטיפול: https://citizen-tax-gov.net/review',
          isPhishing: true,
          explanation:
            'ההודעה מחקה שפה רשמית, מפעילה לחץ זמן, ומפנה לדומיין שנראה ממשלתי אך אינו רשמי.',
          redFlags: ['דומיין שנראה רשמי אך אינו ממשלתי', 'לחץ סביב טיפול רשמי', 'בקשה להשלמת פעולה דרך קישור'],
        },
      },
      sms: {
        bank: {
          title: '',
          sender: 'SecureBank',
          content: 'חסמנו העברה חשודה. אשרו בתוך 15 דקות: https://secure-bank-review.co',
          isPhishing: true,
          explanation: 'בנקים בדרך כלל לא מבקשים אישור דרך קישור ב-SMS, והדומיין חשוד.',
          redFlags: ['אזהרת בנק דרך קישור', 'דדליין קצר', 'דומיין לא רשמי'],
        },
        delivery: {
          title: '',
          sender: 'ParcelTrack',
          content: 'המשלוח שלך מתעכב. פתחו את אפליקציית המשלוחים הרשמית כדי לראות חלון מסירה מעודכן.',
          isPhishing: false,
          explanation: 'אין כאן לחץ, קישור חשוד או בקשה למידע רגיש.',
          redFlags: ['אין קישור חשוד', 'אין בקשה למידע סודי', 'ניסוח אינפורמטיבי'],
        },
        account_security: {
          title: '',
          sender: 'Cloud ID',
          content: 'אשרו את החשבון עכשיו או שהוא יושבת הלילה: https://cloudid-reset.help',
          isPhishing: true,
          explanation: 'שפה מאיימת יחד עם דומיין חשוד הם סימנים קלאסיים לפישינג.',
          redFlags: ['איום בהשבתת חשבון', 'דומיין חשוד', 'לחץ לפעול מיידית'],
        },
        workplace: {
          title: '',
          sender: 'Ops Team',
          content: 'תזכורת: מערכת הכניסה למשרד תהיה בתחזוקה בין 20:00 ל-21:00.',
          isPhishing: false,
          explanation: 'זו הודעה פנימית רגילה ללא בקשה לסוד, קישור או אימות חפוז.',
          redFlags: ['הודעה שגרתית', 'אין בקשה לפעולה', 'אין מידע רגיש'],
        },
        social: {
          title: '',
          sender: 'Friend',
          content: 'זה אני ממספר חדש. אני צריכ/ה את הקוד שקיבלת עכשיו כדי לשחזר את החשבון.',
          isPhishing: true,
          explanation: 'בקשות לקוד חד-פעמי ב-SMS הן סימן חזק להנדסה חברתית.',
          redFlags: ['בקשה לקוד חד-פעמי', 'טענה לזהות בלי אימות', 'לחץ חברתי דחוף'],
        },
        shopping: {
          title: '',
          sender: 'ShopLine',
          content: 'הזמנה 18273 נשלחה. אפשר לעקוב אחריה מתוך החשבון או עמוד ההזמנה שלך.',
          isPhishing: false,
          explanation: 'זו הודעת סטטוס רגילה שלא מבקשת התחברות דרך קישור או מידע רגיש.',
          redFlags: ['זרימת חשבון רגילה', 'אין איום דחוף', 'אין בקשה לפרטים סודיים'],
        },
        government: {
          title: '',
          sender: 'עדכון עירוני',
          content: 'יש חוב ארנונה פתוח. שלמו בתוך 30 דקות כדי למנוע הליך אכיפה: https://city-billing-help.net',
          isPhishing: true,
          explanation: 'רשויות אינן נוהגות לדרוש תשלום דחוף דרך קישור ב-SMS, במיוחד מדומיין לא מוכר.',
          redFlags: ['דרישת תשלום דחופה בשם רשות', 'דומיין חיוב חשוד', 'דדליין קצר ב-SMS'],
        },
      },
      whatsapp: {
        bank: {
          title: '',
          sender: 'Support',
          content: 'כדי לעצור חיובים חשודים אנחנו צריכים שתשלח/י כאן את קוד ה-PIN של הכרטיס.',
          isPhishing: true,
          explanation: 'בנק לגיטימי לא יבקש קוד PIN דרך צ׳אט.',
          redFlags: ['בקשה ל-PIN', 'מידע רגיש בצ׳אט', 'לחץ סביב חיוב חשוד'],
        },
        delivery: {
          title: '',
          sender: 'Courier Desk',
          content: 'המשלוח שלך מחכה בנקודת האיסוף. יש להגיע עם תעודה ומספר הזמנה.',
          isPhishing: false,
          explanation: 'זו הודעה אינפורמטיבית בלי קישור חשוד ובלי בקשה לפרטים סודיים.',
          redFlags: ['אין קישור חשוד', 'אין בקשה לסיסמה', 'רק הנחיות איסוף'],
        },
        account_security: {
          title: '',
          sender: 'IT Helpdesk',
          content: 'שלח/י כאן את קוד הגיבוי של MFA כדי שנוכל להשאיר את החשבון פעיל.',
          isPhishing: true,
          explanation: 'מחלקת IT לא אמורה לבקש קודי גיבוי של MFA בצ׳אט.',
          redFlags: ['בקשה לקוד MFA', 'מידע רגיש בצ׳אט', 'דחיפות מזויפת'],
        },
        workplace: {
          title: '',
          sender: 'People Ops',
          content: 'הרישום לבחירת ההטבות נפתח ביום שני. כל הפרטים יופיעו בפורטל משאבי האנוש.',
          isPhishing: false,
          explanation: 'זו הודעה תהליכית ללא בקשה למידע סודי או פעולה מסוכנת.',
          redFlags: ['הפניה לפורטל רגיל', 'אין דרישה דחופה', 'אין בקשה לפרטים'],
        },
        social: {
          title: '',
          sender: 'דניאל',
          content: 'אפשר לקנות שני גיפט קארדס ולשלוח לי כאן את הקודים לפני הפגישה?',
          isPhishing: true,
          explanation: 'בקשות לגיפט קארד דרך צ׳אט הן טקטיקה נפוצה של התחזות.',
          redFlags: ['בקשה לגיפט קארד', 'לחץ לפני פגישה', 'זהות לא מאומתת'],
        },
        shopping: {
          title: '',
          sender: 'StoreLine',
          content: 'ההחזרה שלך אושרה. הזיכוי יופיע באמצעי התשלום המקורי בתוך חמישה ימי עסקים.',
          isPhishing: false,
          explanation: 'זו הודעת סטטוס רגועה ללא קישור מסוכן או בקשה למידע רגיש.',
          redFlags: ['עדכון סטטוס רגיל', 'אין לחץ', 'אין בקשה למידע סודי'],
        },
        government: {
          title: '',
          sender: 'שירות ממשלתי',
          content: 'שלחו כאן צילום תעודת זהות כדי שנוכל לשחרר עוד היום את האישור הדיגיטלי שלכם.',
          isPhishing: true,
          explanation: 'שירות ממשלתי לגיטימי לא יבקש מסמכי זיהוי דרך צ׳אט עם לחץ של אותו יום.',
          redFlags: ['בקשה למסמך מזהה בצ׳אט', 'דחיפות בשם גוף רשמי', 'ערוץ לא מאומת'],
        },
      },
    },
  }

  const segmentOverrides: Partial<
    Record<
      OrganizationType,
      Partial<
        Record<
          Channel,
          Partial<Record<SimulationCategory, Omit<SimulationGeneration, 'channel' | 'difficulty' | 'category'>>>
        >
      >
    >
  > = {
    nursing_home: {
      email: {
        bank: {
          title: 'Updated supplier bank details',
          sender: 'Sharon Medical Supplies <billing@sharon-medical.co.il>',
          content:
            'Hi, for invoice 49281 the bank account was updated this morning. Please transfer today so tomorrow’s medication delivery won’t be delayed. New details in the attached PDF.',
          isPhishing: true,
          explanation:
            'Invoice pressure plus a bank change from an unfamiliar domain. Call the known supplier contact before paying.',
          redFlags: ['Bank change via email', 'Delivery urgency', 'Sender domain mismatch'],
        },
        delivery: {
          title: 'Medication courier update',
          sender: 'Duty Pharmacy <updates@duty-pharma.co.il>',
          content:
            'Medication for resident Ruth Cohen will arrive 14:00–16:00. No payment or login needed. For courier changes call the known pharmacy only.',
          isPhishing: false,
          explanation: 'Routine delivery notice with no links, no payment ask, and a known process.',
          redFlags: ['No sensitive request', 'Matches routine process', 'No external link'],
        },
      },
      whatsapp: {
        social: {
          title: '',
          sender: 'רבקה | מנהלת משמרת',
          content:
            'בוקר טוב, אני עם המשפחה של אחד הדיירים. תשלחי לי כאן את קוד האימות שהגיע כדי לסגור את תשלום הספק הדחוף.',
          isPhishing: true,
          explanation: 'Code request + payment pressure over WhatsApp is a classic impersonation.',
          redFlags: ['בקשת קוד בוואטסאפ', 'לחץ תשלום', 'זהות מוכרת ללא אימות'],
        },
      },
    },
    education: {
      email: {
        social: {
          title: 'Parent message about urgent form',
          sender: 'Yael Cohen <parent.forms@outlook-reset.net>',
          content:
            'Hello teacher, the principal said every parent must open this attendance form before noon or the child will be marked absent. Please confirm here: https://school-parent-form.net/open',
          isPhishing: true,
          explanation: 'Parent impersonation plus urgency and an unknown form domain.',
          redFlags: ['Unfamiliar domain', 'Attendance threat', 'Parent impersonation'],
        },
        account_security: {
          title: 'School account reset alert',
          sender: 'Microsoft School Access <security@ms-school-verify.co>',
          content:
            'Unusual sign-in detected to your school account. Reset password within 30 minutes to avoid lockout: https://ms-school-verify.co/reset',
          isPhishing: true,
          explanation: 'Non-Microsoft domain and rushed reset link. Reset only via the official portal.',
          redFlags: ['Non-official domain', 'Time pressure', 'Reset link in email'],
        },
      },
    },
    nonprofit: {
      email: {
        bank: {
          title: 'Donation settlement update',
          sender: 'Annual Giving Desk <donations@giving-flow-help.org>',
          content:
            'Our processor changed the settlement account for this week only. Please transfer the donor payout balance before 16:00 so receipts can be issued on time.',
          isPhishing: true,
          explanation: 'One-off bank change + urgency on donations. Verify by phone with finance.',
          redFlags: ['Temporary bank change', 'Urgent transfer', 'External domain'],
        },
      },
      whatsapp: {
        social: {
          title: '',
          sender: 'ליטל | רכזת מתנדבים',
          content:
            'היי, אני צריכה בדחיפות את קובץ המתנדבים של מחר כולל טלפונים וגם את קוד הכניסה שקיבלת עכשיו כדי לפתוח את הקבוצה החדשה.',
          isPhishing: true,
          explanation: 'Asks for volunteer data + access code in chat — handle as impersonation.',
          redFlags: ['בקשה למידע אישי', 'בקשת קוד גישה', 'לחץ בזירת צ׳אט'],
        },
      },
    },
    municipality: {
      email: {
        government: {
          title: 'Property tax collection update',
          sender: 'City Billing <billing@arnona-city-update.net>',
          content:
            'A discrepancy was found in your municipal collection details. Review the attached notice and sign in today to prevent delays.',
          isPhishing: true,
          explanation: 'Government-lookalike domain and rushed login request.',
          redFlags: ['Fake gov domain', 'Urgent login', 'Attachment + link combo'],
        },
      },
      whatsapp: {
        workplace: {
          title: '',
          sender: 'Municipal Director',
          content:
            'I’m heading into a meeting. Approve the attached purchase summary and send me the code you received so finance can release the vendor payment before noon.',
          isPhishing: true,
          explanation: 'Authority pressure with a code request via WhatsApp.',
          redFlags: ['Authority impersonation', 'Code in chat', 'Payment urgency'],
        },
      },
    },
    smb: {
      email: {
        bank: {
          title: 'Invoice payment reroute',
          sender: 'Office Supplies <billing@office-pay-support.co>',
          content:
            'Attached is the invoice for your office order. Note: bank details were updated — please pay today to avoid delivery delay.',
          isPhishing: true,
          explanation: 'Bank change + same-day payment via unfamiliar domain.',
          redFlags: ['Bank details changed', 'Same-day payment pressure', 'Domain mismatch'],
        },
      },
      sms: {
        delivery: {
          title: '',
          sender: 'Courier IL',
          content: 'Business parcel is waiting for customs release. Pay the handling fee in the next hour: https://courier-il-fee.net/pay',
          isPhishing: true,
          explanation: 'Courier-fee SMS with unknown domain and one-hour deadline.',
          redFlags: ['Unknown payment link', 'One-hour deadline', 'Fee by SMS'],
        },
      },
    },
  }

  const baseTemplate =
    messageLibrary[options.locale][options.channel][options.category] ??
    messageLibrary[options.locale].email.delivery

  const override =
    options.organizationType &&
    segmentOverrides[options.organizationType]?.[options.channel]?.[options.category]

  const template = override ?? baseTemplate

  return {
    channel: options.channel,
    difficulty: options.difficulty,
    category: options.category,
    ...template,
  }
}

function extractRedFlags(simulation: TableRow<'simulations'>) {
  if (!Array.isArray(simulation.red_flags)) {
    return []
  }

  return simulation.red_flags.filter((flag): flag is string => typeof flag === 'string')
}

function buildFallbackFeedback(
  locale: SupportedLocale,
  simulation: TableRow<'simulations'>,
  isCorrect: boolean,
): FeedbackResponse {
  if (locale === 'he') {
    return {
      feedback: isCorrect
        ? 'זיהית נכון את אופי ההודעה והתמקדת בסימנים החשובים.'
        : 'כדאי להתעכב יותר על מקור ההודעה, רמת הדחיפות, והאם מבקשים ממך פעולה חריגה.',
      shortRule: simulation.is_phishing
        ? 'אם יש לחץ, קישור לא מוכר, או בקשה לפרטים סודיים, עצרו ובדקו שוב.'
        : 'לא כל הודעת אבטחה או סטטוס היא הונאה. בדקו אם היא תואמת לזרימת עבודה מוכרת.',
      missedSignals: isCorrect ? [] : extractRedFlags(simulation).slice(0, 3),
      didWell: isCorrect
        ? ['התמקדת בתוכן ההודעה', 'זיהית את כוונת ההודעה']
        : ['הגבת והסברת את הבחירה שלך'],
      recommendedFocus:
        simulation.category === 'delivery'
          ? 'תרגלו זיהוי של הודעות משלוח לחוצות וקישורים לא מוכרים.'
          : 'התמקדו בזיהוי דחיפות, דומיינים חשודים, ובקשות חריגות.',
    }
  }

  return {
    feedback: isCorrect
      ? 'You classified the message correctly and focused on the important trust signals.'
      : 'Spend more time checking the sender, urgency level, and whether the requested action fits normal workflow.',
    shortRule: simulation.is_phishing
      ? 'Pause when a message combines urgency, unfamiliar links, or requests for sensitive data.'
      : 'Not every security or status update is malicious. Check whether it matches a known workflow.',
    missedSignals: isCorrect ? [] : extractRedFlags(simulation).slice(0, 3),
    didWell: isCorrect
      ? ['You evaluated the message intent', 'You recognized the overall trust pattern']
      : ['You committed to an answer', 'You provided a response instead of guessing passively'],
    recommendedFocus:
      simulation.category === 'delivery'
        ? 'Practice spotting urgency tactics and unknown links in delivery-themed messages.'
        : 'Focus on urgency cues, suspicious domains, and unusual requests.',
  }
}

function buildFallbackRecommendation(
  locale: SupportedLocale,
  simulation: TableRow<'simulations'>,
  feedback: FeedbackResponse,
): RecommendationResponse {
  return locale === 'he'
    ? {
        recommendationText:
          simulation.category === 'delivery'
            ? 'בצעו עוד שני תרגולים סביב הודעות משלוחים עם לחץ וקישורים חיצוניים.'
            : 'בצעו תרגול נוסף שמתמקד בדחיפות, דומיינים חשודים, ואימות שולח.',
        reason: feedback.recommendedFocus,
        priority: 3,
      }
    : {
        recommendationText:
          simulation.category === 'delivery'
            ? 'Run two more delivery-themed drills that include urgency and external links.'
            : 'Take another drill focused on urgency, suspicious domains, and sender verification.',
        reason: feedback.recommendedFocus,
        priority: 3,
      }
}

function chooseCandidateSimulation(
  candidates: TableRow<'simulations'>[],
  recentAttempts: AttemptWithSimulation[],
  organizationType?: string | null,
) {
  const recentIds = new Set(recentAttempts.map((attempt) => attempt.simulation_id))
  const candidatePool = candidates.filter((candidate) => !recentIds.has(candidate.id))

  if (!candidatePool.length) {
    return candidates[0] ?? null
  }

  if (!organizationType) {
    return candidatePool[0] ?? null
  }

  const keywords = getOrganizationSimulationKeywords(organizationType)

  return (
    [...candidatePool].sort((left, right) => {
      const leftText = [left.title, left.sender, left.content, left.explanation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const rightText = [right.title, right.sender, right.content, right.explanation]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const leftScore = keywords.reduce(
        (score, keyword) => score + (leftText.includes(keyword) ? 1 : 0),
        0,
      )
      const rightScore = keywords.reduce(
        (score, keyword) => score + (rightText.includes(keyword) ? 1 : 0),
        0,
      )

      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      return right.created_at.localeCompare(left.created_at)
    })[0] ?? null
  )
}

export async function getNextTrainingSimulation(
  supabase: AppSupabaseClient,
  userId: string,
  input: StartTrainingInput = {},
) {
  const [bundle, organizationContext] = await Promise.all([
    getProfileBundle(supabase, userId),
    getCurrentOrganizationContext(supabase, userId),
  ])
  const organizationProfile = organizationContext
    ? getOrganizationSegmentProfile(
        organizationContext.organization.organization_type,
        organizationContext.organization.industry,
        bundle.profile.preferred_language,
      )
    : null
  const context = await getTrainingContext(supabase, userId, bundle)
  const personalized = buildPersonalizedSelection({
    bundle,
    recentAttempts: context.recentAttempts,
    weaknesses: context.weaknesses,
    organizationType: organizationContext?.organization.organization_type ?? null,
    organizationIndustry: organizationContext?.organization.industry ?? null,
    preferredDomains: input.preferredDomains,
  })
  const trainingContext = {
    ...context,
    organizationProfile,
  }

  const selection = {
    ...personalized,
    channel: input.channel ?? personalized.channel,
    difficulty: input.preferredDifficulty ?? personalized.difficulty,
    category: input.preferredCategory ?? personalized.category,
    locale: input.locale ?? personalized.locale,
    organizationType: organizationContext?.organization.organization_type ?? null,
  }

  const exactCandidates = await getCandidateSimulations(supabase, {
    locale: selection.locale,
    channel: selection.channel,
    category: selection.category,
    difficulty: selection.difficulty,
    excludeIds: context.recentAttempts.map((attempt) => attempt.simulation_id),
  })

  const reusableCandidate = chooseCandidateSimulation(
    exactCandidates,
    context.recentAttempts,
    organizationContext?.organization.organization_type,
  )
  const shouldGenerateFreshSimulation = !reusableCandidate || exactCandidates.length < 2

  let simulation = reusableCandidate

  if (shouldGenerateFreshSimulation) {
    const generatedSimulation = await runFastAiTask(() =>
      generateSimulationWithGroq(
        selection.locale,
        selection,
        formatTrainingContext(trainingContext),
      ),
    )
    const groqSimulation =
      generatedSimulation && isAlignedGeneratedSimulation(generatedSimulation, selection)
        ? generatedSimulation
        : null

    const nextSimulation = groqSimulation ?? buildFallbackSimulation(selection)
    simulation = reusableCandidate

    if (!reusableCandidate || groqSimulation) {
      simulation = await insertSimulation(
        supabase,
        simulationToInsert(nextSimulation, selection.locale, groqSimulation ? 'groq' : 'fallback'),
      )
    }
  }

  await insertAnalyticsEvent(supabase, {
    user_id: userId,
    event_name: 'training_started',
    payload: {
      simulation_id: simulation.id,
      channel: simulation.channel,
      category: simulation.category,
      difficulty: simulation.difficulty,
      locale: simulation.language,
    },
  })

  return {
    simulation,
    context: {
      profile: bundle.profile,
      trainingProfile: bundle.trainingProfile,
      weaknesses: context.weaknesses,
      recommendations: context.recommendations,
      organization: organizationContext?.organization ?? null,
      selection,
    },
  }
}

export async function submitTrainingAttempt(
  supabase: AppSupabaseClient,
  userId: string,
  input: SubmitAttemptInput,
) {
  const [bundle, organizationContext] = await Promise.all([
    getProfileBundle(supabase, userId),
    getCurrentOrganizationContext(supabase, userId),
  ])
  const organizationProfile = organizationContext
    ? getOrganizationSegmentProfile(
        organizationContext.organization.organization_type,
        organizationContext.organization.industry,
        bundle.profile.preferred_language,
      )
    : null
  const simulation = await getSimulationById(supabase, input.simulationId)
  const isCorrect = input.userAnswer === simulation.is_phishing
  const context = await getTrainingContext(supabase, userId, bundle)
  const trainingContext = {
    ...context,
    organizationProfile,
  }
  const formattedTrainingContext = formatTrainingContext(trainingContext)

  const feedbackPayload = {
    locale: bundle.profile.preferred_language,
    simulation,
    userAnswer: input.userAnswer,
    isCorrect,
    userReason: input.userReason ?? '',
    context: formattedTrainingContext,
  }

  const memoryPayload = {
    locale: bundle.profile.preferred_language,
    simulation,
    attempt: {
      userAnswer: input.userAnswer,
      isCorrect,
      confidence: input.confidence ?? null,
      userReason: input.userReason ?? '',
    },
    context: formattedTrainingContext,
  }

  const [generatedFeedback, generatedMemoryUpdate] = await Promise.all([
    runFastAiTask(() =>
      generateFeedbackWithGroq(bundle.profile.preferred_language, feedbackPayload),
    ),
    runFastAiTask(() =>
      generateMemoryUpdateWithGroq(bundle.profile.preferred_language, memoryPayload),
    ),
  ])

  const feedback =
    generatedFeedback ??
    buildFallbackFeedback(bundle.profile.preferred_language, simulation, isCorrect)

  const attempt = await insertAttempt(supabase, {
    user_id: userId,
    simulation_id: simulation.id,
    user_answer: input.userAnswer,
    is_correct: isCorrect,
    confidence: input.confidence ?? null,
    user_reason: input.userReason ?? null,
    ai_feedback: feedback.feedback,
    response_time_ms: input.responseTimeMs ?? null,
  })

  const memoryUpdate =
    generatedMemoryUpdate ??
    (await buildMemoryUpdateFromRules(context, simulation, input.userAnswer, isCorrect))

  await applyMemoryUpdate(supabase, userId, simulation.category, memoryUpdate)

  const recommendation =
    (await runFastAiTask(() =>
      generateRecommendationWithGroq(bundle.profile.preferred_language, {
        simulation,
        feedback,
        memoryUpdate,
        context: formattedTrainingContext,
      }),
    )) ??
    buildFallbackRecommendation(bundle.profile.preferred_language, simulation, feedback)

  await insertRecommendation(supabase, {
    user_id: userId,
    recommendation_text: recommendation.recommendationText,
    reason: recommendation.reason,
    priority: recommendation.priority,
  })

  const attempts = await getAllAttemptsWithSimulations(supabase, userId)
  const trainingProfilePatch = computeTrainingProfilePatch(attempts, memoryUpdate.recommendedLevel)
  const updatedTrainingProfile = await updateTrainingProfileRow(supabase, userId, trainingProfilePatch)

  await insertAnalyticsEvent(supabase, {
    user_id: userId,
    event_name: 'attempt_submitted',
    payload: {
      simulation_id: simulation.id,
      correct: isCorrect,
      channel: simulation.channel,
      category: simulation.category,
      difficulty: simulation.difficulty,
    },
  })

  return {
    attempt,
    result: {
      simulation,
      isCorrect,
      feedback,
      recommendation,
      memoryUpdate,
      trainingProfile: updatedTrainingProfile,
    },
  }
}

export async function getDashboardData(supabase: AppSupabaseClient, userId: string) {
  const [bundle, organizationContext] = await Promise.all([
    getProfileBundle(supabase, userId),
    getCurrentOrganizationContext(supabase, userId),
  ])
  const [attempts, recommendations, weaknesses] = await Promise.all([
    getAllAttemptsWithSimulations(supabase, userId),
    getRecommendations(supabase, userId, 5),
    getWeaknesses(supabase, userId, 6),
  ])
  const summary = buildDashboardSummary(bundle, attempts, recommendations, weaknesses)
  const aiSummary = await generatePersonalImprovementSummary({
    locale: bundle.profile.preferred_language,
    profile: {
      fullName: bundle.profile.full_name,
      email: bundle.profile.email,
    },
    organizationName: organizationContext?.organization.name ?? null,
    organizationType: organizationContext?.organization.organization_type ?? null,
    stats: summary.stats,
    preferredDomains: bundle.trainingProfile.preferred_domains ?? [],
    weaknesses,
    recommendations,
    recentAttempts: attempts,
  })

  return {
    ...summary,
    organization: organizationContext?.organization ?? null,
    aiSummary,
  }
}

export async function getReportsData(supabase: AppSupabaseClient, userId: string) {
  const bundle = await getProfileBundle(supabase, userId)
  const [attempts, recommendations, analyticsEvents] = await Promise.all([
    getAllAttemptsWithSimulations(supabase, userId),
    getRecommendations(supabase, userId, 8),
    getAnalyticsEvents(supabase, userId, 40),
  ])

  return buildReportsPayload(bundle, attempts, recommendations, analyticsEvents)
}
