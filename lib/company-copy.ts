import type {
  OrganizationMemberStatus,
  OrganizationRole,
  TeamInviteStatus,
} from '@/lib/constants'
import type { Locale } from '@/lib/i18n'

const companyCopy = {
  en: {
    common: {
      retry: 'Retry',
      openSettings: 'Open Settings',
      backToDashboard: 'Back to dashboard',
      cancel: 'Cancel',
      confirm: 'Confirm',
      clearFilters: 'Clear filters',
      admin: 'Admin',
      member: 'Employee',
      active: 'Active',
      suspended: 'Suspended',
      invited: 'Invited',
      pending: 'Pending',
      accepted: 'Accepted',
      expired: 'Expired',
      canceled: 'Canceled',
    },
    leaderboard: {
      loadError: 'We could not load the leaderboard.',
      disabled: 'The leaderboard is currently disabled for this organization.',
      noOrganizationTitle: 'Join or create a company workspace',
      noOrganizationDescription:
        'Create an organization or accept an invite from Settings to unlock company mode.',
      restrictedTitle: 'Leaderboard access is limited to administrators',
      restrictedDescription:
        'Employees cannot view company rankings or peer performance details.',
      title: 'Company Leaderboard',
      subtitlePrefix: 'A professional performance ranking for',
      rankingTitle: 'Performance Ranking',
      rankingDescription:
        'Ranking is based on score, accuracy, streak, and training consistency.',
      rankedEmployees: 'ranked employees',
      noRows: 'There is not enough team activity to display a leaderboard yet.',
      noRowsHint: 'Invite more employees or let the team complete a few simulations first.',
      pagePrefix: 'Page',
      pageOf: 'of',
      previous: 'Previous',
      next: 'Next',
    },
    reports: {
      loadError: 'We could not load team reports.',
      title: 'Team Reports',
      subtitlePrefix: 'Organization-level reporting for',
      noTeamDataTitle: 'No team activity yet',
      noTeamDataDescription:
        'Invite employees and complete a few simulations to unlock reporting, trends, and risk rollups.',
      noCategoryBreakdown: 'Domain accuracy will appear after team attempts are recorded.',
      noScoreTrend: 'Score trends will appear after the team starts training.',
      noChannelBreakdown:
        'Channel performance will appear after the team trains across scenarios.',
      noEmployeePerformance:
        'Employee performance rows will appear after teammates join the organization.',
      noRecentActivity: 'Recent team activity will appear here once employees start training.',
      accessTitle: 'Administrator access required',
      accessDescription:
        'Team-wide reports are only available to organization administrators.',
      filtersTitle: 'Report Filters',
      filtersDescription: 'Refine team analytics by domain, channel, date range, or employee.',
      category: 'Domain',
      channel: 'Channel',
      employee: 'Employee',
      dateFrom: 'From',
      dateTo: 'To',
      allDomains: 'All domains',
      allChannels: 'All channels',
      allEmployees: 'All employees',
      filtersApplied: 'Filters are applied to the report cards, charts, and activity table.',
      status: 'Status',
    },
    admin: {
      loadError: 'We could not load the company admin dashboard.',
      title: 'Team Admin Dashboard',
      subtitle: 'Reduce human risk with clear actions, no security jargon required.',
      accessTitle: 'Administrator access required',
      accessDescription: 'This page is only available to organization administrators.',
      nextStepTitle: 'Next step: invite your employees',
      nextStepDescription:
        'Your organization is ready. Invite a few employees to unlock comparisons, rankings, and team reports.',
      inviteTeam: 'Invite Team',
      inviteTitle: 'Invite Team Members',
      inviteDescription: 'Generate a reusable invite link to share with new employees.',
      employeeEmail: 'Employee email',
      role: 'Role',
      memberStatus: 'Status',
      createInvite: 'Create Invite Link',
      creatingInvite: 'Creating invite...',
      inviteReady: 'Invite link ready to share',
      copyLink: 'Copy link',
      copiedLink: 'Invite link copied.',
      inviteCreated: 'Invite created successfully.',
      copyFailed: 'We could not copy the invite link.',
      freePlanLabel: 'Free plan preview',
      freePlanDescription: 'You can explore alone. Upgrade to invite more teammates.',
      upgradeCta: 'Upgrade for team use',
      upgradeTrial: 'Start a trial',
      upgradeContact: 'Contact sales',
      upgradeWhatsApp: 'WhatsApp sales',
      upgradeLimitMessage: 'Invite blocked: the free plan includes one active member only.',
      upgradeBlockedMessage: 'This organization is blocked. Contact us to re-enable access.',
      inviteStatus: 'Invite status',
      inviteCanceled: 'Invite canceled successfully.',
      inviteCancelError: 'We could not cancel the invite.',
      cancelInvite: 'Cancel invite',
      invitesTitle: 'Invite Status',
      invitesDescription: 'Track pending, accepted, expired, and canceled invite links.',
      noInvites: 'No invite history is available yet.',
      noTrend: 'Team progress will appear after employees complete simulations.',
      noRecommendations:
        'Recommendations will appear after there is enough team activity to identify patterns.',
      noWeakCategories: 'Weak categories will appear once employees build training profiles.',
      noStrongCategories: 'Strong categories will appear after successful training activity.',
      noRecentActivity: 'Recent team activity will appear here once employees start training.',
      noSimulations: 'Simulation preview is temporarily unavailable.',
      noPendingInvites: 'There are no pending invites right now.',
      aiSummaryTitle: 'AI Team Summary',
      aiSummaryDescription:
        'A concise view of team risk, behavior patterns, and the next actions to reinforce.',
      aiSummarySignals: 'Observed risk signals',
      aiSummaryActions: 'Recommended next steps',
      membersTitle: 'Member Access & Roles',
      membersDescription:
        'Promote, demote, suspend, reactivate, or remove employees without leaving the current admin view.',
      membersLoadError: 'We could not load organization members.',
      noMembers: 'There are no members to manage yet.',
      currentAdminTag: 'You',
      activeMemberTag: 'Active',
      suspendedMemberTag: 'Suspended',
      promoteToAdmin: 'Promote to admin',
      makeEmployee: 'Make employee',
      suspendMember: 'Suspend access',
      reactivateMember: 'Reactivate',
      removeMember: 'Remove access',
      roleUpdated: 'Role updated successfully.',
      roleUpdateError: 'We could not update the member role.',
      memberStatusUpdated: 'Member status updated successfully.',
      memberStatusUpdateError: 'We could not update the member status.',
      memberRemoved: 'Member access removed.',
      memberRemoveError: 'We could not remove the member.',
      removeConfirmTitle: 'Remove member access?',
      removeConfirmDescription:
        'This user will lose company access immediately and continue in individual mode.',
      selfRoleGuard: 'Your own admin access cannot be changed here.',
      selfStatusGuard: 'You cannot suspend your own company access here.',
      lastAdminGuard: 'At least one active organization admin must remain.',
      teamReports: 'Team Reports',
      leaderboard: 'Leaderboard',
      pendingInvites: 'Pending Invites',
      recentActivity: 'Recent Activity',
      simulationLibrary: 'Simulation Library',
      simulationLibraryDescription:
        'A quick preview of the training content currently available.',
      openTraining: 'Open Training',
      totalEmployees: 'Total Employees',
      activeEmployees: 'Active Employees',
      completedSimulations: 'Completed Simulations',
      phishingDetection: 'Phishing Detection',
      safeDetection: 'Safe Detection',
      teamProgressTrend: 'Team Progress Trend',
      teamProgressDescription:
        'Trend line for team training volume and scoring over time.',
      leaderboardPreview: 'Leaderboard Preview',
      teamRecommendations: 'Team Recommendations',
      topWeakCategories: 'Top Weak Categories',
      topStrongCategories: 'Top Strong Categories',
      attentionFlagsTitle: 'Attention Flags',
      attentionFlagsDescription:
        'Employees who may need follow-up due to low accuracy, inactivity, or repeated failures.',
      noAttentionFlags: 'No urgent attention flags are active right now.',
      actionInProgress: 'Saving changes...',
    },
    invite: {
      title: 'Organization Invitation',
      description: 'This link will add you to a company workspace in PhishGuard AI.',
      signInPrompt:
        'To accept this invite, sign in or create an account with the email address that received the invitation.',
      acceptPrompt:
        'If your email address matches the invite, you can join the organization with one click.',
      accept: 'Accept Invite',
      accepting: 'Accepting invite...',
      accepted: 'Invite accepted',
      success: 'You joined successfully.',
      genericError: 'We could not accept the invite.',
      wrongEmail:
        'This invite was sent to a different email address. Sign in with the invited email to continue.',
      expired: 'This invite is no longer valid. Ask your admin for a fresh invite link.',
      canceled: 'This invite was canceled. Ask your admin for a new invite link.',
      alreadyUsed: 'This invite has already been used. Ask your admin for a fresh invite link.',
      alreadyMember: 'Your account already belongs to an organization.',
      upgradeRequired: 'This organization needs to upgrade before adding more people.',
    },
    settings: {
      loadError: 'We could not load your settings right now.',
      companyTitle: 'Company Mode',
      companyDescription:
        'Enable company mode for employee training, leaderboards, and team reports.',
      createDescription:
        'The creator becomes the organization admin automatically and can invite employees afterwards.',
      organizationCreated: 'Organization created. Redirecting you to team admin.',
      organizationCreateError: 'We could not create the organization.',
      domainsSaveError: 'We could not save the training domains.',
      domainsSaved: 'Training domains saved.',
    },
  },
  he: {
    common: {
      retry: 'נסו שוב',
      openSettings: 'פתחו הגדרות',
      backToDashboard: 'חזרה ללוח הבקרה',
      cancel: 'ביטול',
      confirm: 'אישור',
      clearFilters: 'ניקוי מסננים',
      admin: 'מנהל',
      member: 'עובד',
      active: 'פעיל',
      suspended: 'מושעה',
      invited: 'הוזמן',
      pending: 'ממתין',
      accepted: 'התקבל',
      expired: 'פג תוקף',
      canceled: 'בוטל',
    },
    leaderboard: {
      loadError: 'לא הצלחנו לטעון את טבלת הדירוג.',
      disabled: 'טבלת הדירוג כבויה כרגע עבור הארגון הזה.',
      noOrganizationTitle: 'הצטרפו לארגון או צרו סביבת חברה',
      noOrganizationDescription:
        'צרו ארגון או קבלו הזמנה דרך ההגדרות כדי להפעיל את מצב החברה.',
      restrictedTitle: 'טבלת הדירוג זמינה רק למנהלי ארגון',
      restrictedDescription:
        'עובדים אינם יכולים לצפות בדירוגים ארגוניים או בפרטי ביצועים של עובדים אחרים.',
      title: 'טבלת דירוג ארגונית',
      subtitlePrefix: 'דירוג מקצועי עבור',
      rankingTitle: 'דירוג ביצועים',
      rankingDescription: 'הדירוג מבוסס על ציון, דיוק, רצף ועקביות באימונים.',
      rankedEmployees: 'עובדים מדורגים',
      noRows: 'עדיין אין מספיק פעילות צוותית כדי להציג דירוג.',
      noRowsHint: 'הזמינו עובדים נוספים או תנו לצוות להשלים כמה סימולציות ראשונות.',
      pagePrefix: 'עמוד',
      pageOf: 'מתוך',
      previous: 'הקודם',
      next: 'הבא',
    },
    reports: {
      loadError: 'לא הצלחנו לטעון את דוחות הצוות.',
      title: 'דוחות צוות',
      subtitlePrefix: 'תובנות ברמת ארגון עבור',
      noTeamDataTitle: 'עדיין אין פעילות צוותית',
      noTeamDataDescription:
        'הזמינו עובדים והשלימו כמה סימולציות כדי לפתוח דוחות, מגמות ותמונת סיכון ארגונית.',
      noCategoryBreakdown: 'דיוק לפי תחום יופיע אחרי שיירשמו ניסיונות צוות.',
      noScoreTrend: 'מגמת ציונים תופיע אחרי שהצוות יתחיל להתאמן.',
      noChannelBreakdown: 'ביצועי ערוצים יופיעו אחרי אימונים בכמה סוגי תרחישים.',
      noEmployeePerformance: 'שורות ביצועי עובדים יופיעו אחרי שחברי הצוות יצטרפו לארגון.',
      noRecentActivity: 'הפעילות האחרונה של הצוות תופיע כאן ברגע שהעובדים יתחילו להתאמן.',
      accessTitle: 'נדרשת הרשאת מנהל',
      accessDescription: 'דוחות צוות זמינים רק למנהלי ארגון.',
      filtersTitle: 'מסנני דוחות',
      filtersDescription: 'מקדו את הניתוח לפי תחום, ערוץ, טווח תאריכים או עובד.',
      category: 'תחום',
      channel: 'ערוץ',
      employee: 'עובד',
      dateFrom: 'מתאריך',
      dateTo: 'עד תאריך',
      allDomains: 'כל התחומים',
      allChannels: 'כל הערוצים',
      allEmployees: 'כל העובדים',
      filtersApplied: 'המסננים חלים על כרטיסי הסיכום, הגרפים וטבלת הפעילות.',
      status: 'סטטוס',
    },
    admin: {
      loadError: 'לא הצלחנו לטעון את מרכז הניהול הארגוני.',
      title: 'דשבורד ניהול צוות',
      subtitle: 'תמונת מצב ארגונית בזמן אמת על ביצועי המודעות לפישינג.',
      accessTitle: 'נדרשת הרשאת מנהל',
      accessDescription: 'העמוד הזה זמין רק למנהלי ארגון.',
      nextStepTitle: 'השלב הבא: הזמנת עובדים',
      nextStepDescription:
        'הארגון מוכן. הזמינו כמה עובדים כדי לפתוח השוואות, דירוגים ודוחות צוות.',
      inviteTeam: 'הזמינו עובדים',
      inviteTitle: 'הזמנת חברי צוות',
      inviteDescription: 'צרו קישור הזמנה לשיתוף עם עובדים חדשים.',
      employeeEmail: 'אימייל עובד',
      role: 'תפקיד',
      memberStatus: 'סטטוס',
      createInvite: 'צרו קישור הזמנה',
      creatingInvite: 'יוצרים הזמנה...',
      inviteReady: 'קישור ההזמנה מוכן לשיתוף',
      copyLink: 'העתיקו קישור',
      copiedLink: 'קישור ההזמנה הועתק.',
      inviteCreated: 'ההזמנה נוצרה בהצלחה.',
      copyFailed: 'לא הצלחנו להעתיק את קישור ההזמנה.',
      freePlanLabel: 'מסלול היכרות',
      freePlanDescription: 'אפשר לבדוק את המערכת לבד. כדי להזמין עובדים צריך לשדרג.',
      upgradeCta: 'שדרגו לשימוש צוות',
      upgradeTrial: 'התחלת ניסיון',
      upgradeContact: 'דברו איתנו',
      upgradeWhatsApp: 'וואטסאפ למכירות',
      upgradeLimitMessage: 'ההזמנה נחסמה: במסלול החינמי יש רק משתמש אחד פעיל.',
      upgradeBlockedMessage: 'הגישה לארגון חסומה. דברו איתנו לפתיחה.',
      inviteStatus: 'סטטוס הזמנה',
      inviteCanceled: 'ההזמנה בוטלה בהצלחה.',
      inviteCancelError: 'לא הצלחנו לבטל את ההזמנה.',
      cancelInvite: 'ביטול הזמנה',
      invitesTitle: 'סטטוס הזמנות',
      invitesDescription: 'עקבו אחרי קישורי הזמנה ממתינים, שהתקבלו, שפג תוקפם או שבוטלו.',
      noInvites: 'עדיין אין היסטוריית הזמנות להצגה.',
      noTrend: 'מגמת התקדמות הצוות תופיע אחרי שהעובדים ישלימו סימולציות.',
      noRecommendations: 'המלצות יופיעו אחרי שתהיה מספיק פעילות כדי לזהות דפוסים.',
      noWeakCategories: 'קטגוריות חלשות יופיעו אחרי שהעובדים יבנו פרופילי למידה.',
      noStrongCategories: 'קטגוריות חזקות יופיעו אחרי הצלחות עקביות באימון.',
      noRecentActivity: 'הפעילות האחרונה תופיע כאן ברגע שהעובדים יתחילו להתאמן.',
      noSimulations: 'תצוגת הסימולציות אינה זמינה כרגע.',
      noPendingInvites: 'אין כרגע הזמנות ממתינות.',
      aiSummaryTitle: 'סיכום צוות מבוסס AI',
      aiSummaryDescription:
        'מבט קצר על סיכוני הצוות, דפוסי ההתנהגות והצעדים שכדאי לחזק עכשיו.',
      aiSummarySignals: 'סימני סיכון בולטים',
      aiSummaryActions: 'צעדים מומלצים להמשך',
      membersTitle: 'גישה ותפקידי עובדים',
      membersDescription:
        'קדמו, הורידו הרשאות, השעו, החזירו או הסירו גישה לעובדים בלי לצאת ממסך הניהול.',
      membersLoadError: 'לא הצלחנו לטעון את רשימת חברי הארגון.',
      noMembers: 'עדיין אין חברי ארגון לניהול.',
      currentAdminTag: 'זה אתם',
      activeMemberTag: 'פעיל',
      suspendedMemberTag: 'מושעה',
      promoteToAdmin: 'קידום למנהל',
      makeEmployee: 'הפיכה לעובד',
      suspendMember: 'השעיית גישה',
      reactivateMember: 'הפעלה מחדש',
      removeMember: 'הסרת גישה',
      roleUpdated: 'התפקיד עודכן בהצלחה.',
      roleUpdateError: 'לא הצלחנו לעדכן את תפקיד המשתמש.',
      memberStatusUpdated: 'סטטוס המשתמש עודכן בהצלחה.',
      memberStatusUpdateError: 'לא הצלחנו לעדכן את סטטוס המשתמש.',
      memberRemoved: 'הגישה של המשתמש הוסרה.',
      memberRemoveError: 'לא הצלחנו להסיר את המשתמש מהארגון.',
      removeConfirmTitle: 'להסיר את הגישה של המשתמש?',
      removeConfirmDescription:
        'המשתמש יאבד מיד את הגישה הארגונית וימשיך במצב אישי בלבד.',
      selfRoleGuard: 'לא ניתן לשנות מכאן את הרשאת הניהול של החשבון שלכם.',
      selfStatusGuard: 'לא ניתן להשעות מכאן את הגישה של החשבון שלכם.',
      lastAdminGuard: 'חייב להישאר לפחות מנהל ארגון פעיל אחד.',
      teamReports: 'דוחות צוות',
      leaderboard: 'טבלת דירוג',
      pendingInvites: 'הזמנות ממתינות',
      recentActivity: 'פעילות אחרונה',
      simulationLibrary: 'ספריית סימולציות',
      simulationLibraryDescription: 'תצוגה מהירה של תוכן האימון הזמין כרגע.',
      openTraining: 'פתיחת אימון',
      totalEmployees: 'סה״כ עובדים',
      activeEmployees: 'עובדים פעילים',
      completedSimulations: 'סימולציות שהושלמו',
      phishingDetection: 'זיהוי פישינג',
      safeDetection: 'זיהוי הודעות תקינות',
      teamProgressTrend: 'מגמת התקדמות צוותית',
      teamProgressDescription: 'מגמת היקף האימונים והציונים לאורך זמן.',
      leaderboardPreview: 'תצוגת דירוג מקדימה',
      teamRecommendations: 'המלצות לצוות',
      topWeakCategories: 'קטגוריות חלשות מובילות',
      topStrongCategories: 'קטגוריות חזקות מובילות',
      attentionFlagsTitle: 'דגלי תשומת לב',
      attentionFlagsDescription:
        'עובדים שעשויים להזדקק למעקב בגלל דיוק נמוך, חוסר פעילות או כשל חוזר באותו תחום.',
      noAttentionFlags: 'כרגע אין דגלי תשומת לב דחופים.',
      actionInProgress: 'שומרים שינויים...',
    },
    invite: {
      title: 'הזמנה להצטרפות לארגון',
      description: 'הקישור הזה יוסיף אתכם למרחב ארגוני ב-PhishGuard AI.',
      signInPrompt:
        'כדי לקבל את ההזמנה, התחברו או צרו חשבון עם כתובת האימייל שאליה נשלחה ההזמנה.',
      acceptPrompt:
        'אם כתובת האימייל שלכם תואמת להזמנה, תוכלו להצטרף בלחיצה אחת.',
      accept: 'קבלת ההזמנה',
      accepting: 'מקבלים הזמנה...',
      accepted: 'ההזמנה התקבלה',
      success: 'ההצטרפות הושלמה בהצלחה.',
      genericError: 'לא הצלחנו לקבל את ההזמנה.',
      wrongEmail:
        'ההזמנה נשלחה לכתובת אימייל אחרת. התחברו עם האימייל שהוזמן כדי להמשיך.',
      expired: 'ההזמנה כבר אינה תקפה. בקשו מהמנהל קישור חדש.',
      canceled: 'ההזמנה בוטלה על ידי הארגון. בקשו מהמנהל קישור חדש.',
      alreadyUsed: 'הקישור הזה כבר נוצל. בקשו מהמנהל קישור חדש.',
      alreadyMember: 'החשבון שלכם כבר שייך לארגון.',
      upgradeRequired: 'צריך לשדרג את הארגון לפני שמצרפים עוד אנשים.',
    },
    settings: {
      loadError: 'לא הצלחנו לטעון את ההגדרות כרגע.',
      companyTitle: 'מצב ארגוני',
      companyDescription: 'הפעילו מצב ארגוני לאימון עובדים, דירוגים ודוחות צוות.',
      createDescription:
        'יוצר הארגון יהפוך אוטומטית למנהל ויוכל להזמין עובדים לאחר מכן.',
      organizationCreated: 'הארגון נוצר. מעבירים אתכם לניהול הצוות.',
      organizationCreateError: 'לא הצלחנו ליצור את הארגון.',
      domainsSaveError: 'לא הצלחנו לשמור את תחומי האימון.',
      domainsSaved: 'תחומי האימון נשמרו.',
    },
  },
} as const

export function getCompanyCopy(locale: Locale) {
  return companyCopy[locale]
}

export function formatOrganizationRoleLabel(role: OrganizationRole, locale: Locale) {
  return getCompanyCopy(locale).common[role]
}

export function formatOrganizationMemberStatusLabel(
  status: OrganizationMemberStatus,
  locale: Locale,
) {
  return getCompanyCopy(locale).common[status]
}

export function formatInviteStatusLabel(status: TeamInviteStatus, locale: Locale) {
  if (status === 'pending') {
    return getCompanyCopy(locale).common.invited
  }

  return getCompanyCopy(locale).common[status]
}

export function mapInviteAcceptanceError(message: string | null | undefined, locale: Locale) {
  const copy = getCompanyCopy(locale).invite
  const normalized = message?.toLowerCase() ?? ''

  if (normalized.includes('different email address')) {
    return copy.wrongEmail
  }

  if (normalized.includes('canceled')) {
    return copy.canceled
  }

  if (normalized.includes('already been used') || normalized.includes('already used')) {
    return copy.alreadyUsed
  }

  if (normalized.includes('expired')) {
    return copy.expired
  }

  if (normalized.includes('no longer valid')) {
    return copy.expired
  }

  if (normalized.includes('already belong')) {
    return copy.alreadyMember
  }

  if (normalized.includes('limit') || normalized.includes('blocked') || normalized.includes('past due')) {
    return copy.upgradeRequired
  }

  if (normalized.includes('upgrade')) {
    return copy.upgradeRequired
  }

  return copy.genericError
}
