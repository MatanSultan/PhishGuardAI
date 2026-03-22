export const APP_NAME = 'PhishGuard AI'

export const SUPPORTED_LOCALES = ['en', 'he'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'he'
export const LOCALE_COOKIE_NAME = 'phishguard-locale'
export const DEFAULT_APP_REDIRECT = '/dashboard'

export const CHANNELS = ['email', 'sms', 'whatsapp'] as const
export type Channel = (typeof CHANNELS)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const SIMULATION_CATEGORIES = [
  'bank',
  'delivery',
  'account_security',
  'workplace',
  'social',
  'shopping',
  'government',
] as const
export type SimulationCategory = (typeof SIMULATION_CATEGORIES)[number]

export const STARTER_DOMAIN_SUGGESTIONS = [
  'delivery',
  'account_security',
  'bank',
] as const satisfies readonly SimulationCategory[]

export const MEMORY_TYPES = ['summary', 'weakness', 'pattern', 'improvement'] as const
export type MemoryType = (typeof MEMORY_TYPES)[number]

export const ORGANIZATION_ROLES = ['member', 'admin'] as const
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]

export const ORGANIZATION_MEMBER_STATUSES = ['active', 'suspended'] as const
export type OrganizationMemberStatus = (typeof ORGANIZATION_MEMBER_STATUSES)[number]

export const TEAM_INVITE_STATUSES = ['pending', 'accepted', 'expired', 'canceled'] as const
export type TeamInviteStatus = (typeof TEAM_INVITE_STATUSES)[number]

export const WEAKNESS_KEYS = [
  'urgency_cues',
  'fake_domain_detection',
  'suspicious_sender_detection',
  'delivery_overtrust',
  'account_security_overtrust',
  'hebrew_detection_gap',
  'english_detection_gap',
  'channel_email',
  'channel_sms',
  'channel_whatsapp',
] as const
export type WeaknessKey = (typeof WEAKNESS_KEYS)[number]

export const APP_ROUTES = {
  landing: '/',
  dashboard: '/dashboard',
  training: '/training',
  memory: '/memory',
  reports: '/reports',
  leaderboard: '/leaderboard',
  settings: '/settings',
  admin: '/admin',
  adminReports: '/admin/reports',
  invite: '/invite',
  signIn: '/auth/signin',
  signUp: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  authCallback: '/auth/callback',
} as const

export const protectedRoutePrefixes = [
  APP_ROUTES.dashboard,
  APP_ROUTES.training,
  APP_ROUTES.memory,
  APP_ROUTES.reports,
  APP_ROUTES.leaderboard,
  APP_ROUTES.settings,
  APP_ROUTES.admin,
] as const

export const authRoutePrefixes = [
  '/auth',
] as const
