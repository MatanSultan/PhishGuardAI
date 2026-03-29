export const TRAINING_INTRO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export function getTrainingIntroCookieName(userId: string) {
  return `pg_training_intro_seen_${userId}`
}
