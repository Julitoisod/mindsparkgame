/**
 * Splitting a student's answers into level RUNS, for the class record and the
 * teacher dashboard (panel revision, Nov 2026: "use the same best-run data for
 * the category scores, so repeated attempts don't inflate them").
 *
 * A run is one pass through a level: up to 5 quiz answers then up to 5 boss
 * answers, in order. The old rule bucketed answers into fixed 10-minute clock
 * windows, which split a run that crossed a boundary (10:09 → 10:11) in two.
 *
 * Pure and import-free so `node scripts/check-runs.mts` can test it directly.
 */

export interface RunAttempt {
  id: number
  phase: 'normal' | 'boss'
  correct: boolean
  /** epoch milliseconds */
  at: number
}

export const QUESTIONS_PER_PHASE = 5
export const QUESTIONS_PER_LEVEL = 10
/** A pause this long means the student left and later started over. */
export const RUN_GAP_MS = 20 * 60 * 1000

/**
 * Groups one student's answers on ONE level into runs, oldest first.
 * ponytail: a level abandoned mid-quiz and restarted within 20 minutes merges
 * into the next run until that run holds 5 quiz answers — the score is still
 * capped at 10 and never double counts; a per-run id from the game would fix it.
 */
export function splitRuns<T extends RunAttempt>(attempts: readonly T[]): T[][] {
  const runs: T[][] = []
  let current: T[] = []
  let quiz = 0
  let boss = 0
  let lastAt = 0

  for (const attempt of [...attempts].sort((a, b) => a.id - b.id)) {
    const startsNew =
      current.length > 0 &&
      (attempt.at - lastAt > RUN_GAP_MS ||
        (attempt.phase === 'normal' && (boss > 0 || quiz >= QUESTIONS_PER_PHASE)) ||
        (attempt.phase === 'boss' && boss >= QUESTIONS_PER_PHASE))

    if (startsNew) {
      runs.push(current)
      current = []
      quiz = 0
      boss = 0
    }
    current.push(attempt)
    if (attempt.phase === 'normal') quiz += 1
    else boss += 1
    lastAt = attempt.at
  }
  if (current.length) runs.push(current)
  return runs
}

export const runScore = (run: readonly RunAttempt[]) =>
  Math.min(QUESTIONS_PER_LEVEL, run.filter(a => a.correct).length)

/** The strongest run — most correct answers; a tie goes to the most recent. */
export function bestRun<T extends RunAttempt>(runs: readonly T[][]): T[] | null {
  let best: T[] | null = null
  let bestScore = -1
  for (const run of runs) {
    const score = runScore(run)
    if (score >= bestScore) {
      best = run
      bestScore = score
    }
  }
  return best
}
