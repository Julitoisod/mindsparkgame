/**
 * Level scoring rules (panel revision, Nov 2026 — revision-panel-researchers.docx).
 *
 * A level is 5 quiz questions + 5 boss questions and ALWAYS runs to the end:
 *   - every correct answer earns 1 star
 *   - a quiz answer is worth 10 points, a boss answer 20
 *   - the level's star rating comes from the combined score out of 10
 *   - the trophy depends on the boss battle only: one hit defeats the boss
 */
export const QUESTIONS_PER_PHASE = 5
export const QUESTIONS_PER_LEVEL = QUESTIONS_PER_PHASE * 2
export const QUIZ_POINTS = 10
export const BOSS_POINTS = 20
export const MAX_LEVELS = 5

/** 0 correct → 0 stars, 1–5 → 1, 6–9 → 2, 10 → 3. */
export function levelStarRating(correct: number): number {
  if (correct >= QUESTIONS_PER_LEVEL) return 3
  if (correct >= 6) return 2
  if (correct >= 1) return 1
  return 0
}

export function levelPoints(quizCorrect: number, bossCorrect: number): number {
  return quizCorrect * QUIZ_POINTS + bossCorrect * BOSS_POINTS
}

/** The trophy is decided by the boss battle alone, never the quiz. */
export function isBossDefeated(bossCorrect: number): boolean {
  return bossCorrect >= 1
}

/** Quest-flag key that records a level's trophy (one per boss defeated). */
export const trophyFlag = (level: number) => `level${level}BossDefeated`

/** Levels whose trophy is owned, read from game_progress.quest_flags. */
export function trophyLevels(questFlags: unknown): number[] {
  const flags = questFlags && typeof questFlags === 'object' ? (questFlags as Record<string, unknown>) : {}
  return Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).filter(level => flags[trophyFlag(level)] === true)
}
