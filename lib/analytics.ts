/**
 * Learning analytics shared by the teacher Dashboard and the admin Dashboard
 * (panel revision, Nov 2026b: "kung unsa ang dashboard sa teacher mao sad sa
 * admin"). Built from class-record rows (lib/classRecord.ts), so every number
 * is the student's BEST run — the same figures Reports shows.
 *
 * Pure (only the proficiency bands) so `node scripts/check-analytics.mts`
 * can test it directly.
 */
import { proficiencyFromAccuracy, type ProficiencyBand } from './proficiency'

export const LEVELS = [1, 2, 3, 4, 5] as const
const POINTS_PER_LEVEL = 10

/** The slice of a class-record row this module reads. */
export interface AnalyticsRow {
  id: number
  sectionId?: number | null
  levels: Record<number, { score: number; attempts: number }>
  categories: Record<string, { correct: number; asked: number }>
}

export const PROFICIENCY_BANDS = ['Beginning', 'Developing', 'Approaching Proficiency', 'Proficient', 'Advanced'] as const

/** Ordinal bands → one violet ramp, light (Beginning) to dark (Advanced). */
export const BAND_COLORS: Record<string, string> = {
  Beginning: '#d9d3fb',
  Developing: '#b3a8f5',
  'Approaching Proficiency': '#8c7cee',
  Proficient: '#6255e8',
  Advanced: '#3a2fb0',
}

export interface LevelAverage { level: number; title: string; average: number | null; students: number }

const round1 = (n: number) => Math.round(n * 10) / 10
const playedLevels = (row: AnalyticsRow) => LEVELS.filter(l => (row.levels[l]?.attempts ?? 0) > 0)

/** A student's band from their best runs on the levels they played (DepEd DO 31 s.2012). */
export function studentBand(row: AnalyticsRow): ProficiencyBand {
  const played = playedLevels(row)
  const correct = played.reduce((sum, l) => sum + row.levels[l].score, 0)
  return proficiencyFromAccuracy(correct, played.length * POINTS_PER_LEVEL).band
}

/** Average best-run score per level (out of 10), counting only students who played it. */
export function levelAverages(rows: readonly AnalyticsRow[], titles: readonly string[]): LevelAverage[] {
  return LEVELS.map(level => {
    const scores = rows.filter(r => (r.levels[level]?.attempts ?? 0) > 0).map(r => r.levels[level].score)
    return {
      level,
      title: titles[level - 1] ?? `Level ${level}`,
      average: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      students: scores.length,
    }
  })
}

/** Class average as a percentage over every played level; null when nobody has played. */
export function classAverage(rows: readonly AnalyticsRow[]): number | null {
  const scores = rows.flatMap(r => playedLevels(r).map(l => r.levels[l].score))
  return scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * POINTS_PER_LEVEL) : null
}

export function proficiencyDistribution(rows: readonly AnalyticsRow[]) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const band = studentBand(row)
    counts.set(band, (counts.get(band) ?? 0) + 1)
  }
  return {
    bands: PROFICIENCY_BANDS.map(band => ({ band, count: counts.get(band) ?? 0 })),
    notStarted: counts.get('Not Started') ?? 0,
  }
}

/**
 * Learning gaps: the level with the lowest class average, and the question
 * category answered wrong most often in the students' best runs.
 */
export function learningGaps(levels: readonly LevelAverage[], rows: readonly AnalyticsRow[]) {
  const played = levels.filter(l => l.average !== null)
  const hardest = played.length ? played.reduce((low, l) => (l.average! < low.average! ? l : low)) : null

  const byCategory = new Map<string, { correct: number; asked: number }>()
  for (const row of rows) {
    for (const [category, cell] of Object.entries(row.categories)) {
      const total = byCategory.get(category) ?? { correct: 0, asked: 0 }
      byCategory.set(category, { correct: total.correct + cell.correct, asked: total.asked + cell.asked })
    }
  }
  const mistakes = [...byCategory.entries()]
    .filter(([, c]) => c.asked > 0 && c.correct < c.asked)
    .map(([category, c]) => ({ category, wrongPct: Math.round(((c.asked - c.correct) / c.asked) * 100), asked: c.asked }))
    .sort((a, b) => b.wrongPct - a.wrongPct || b.asked - a.asked)

  return { hardestLevel: hardest, commonMistake: mistakes[0] ?? null }
}

/** Everything the shared analytics panel shows, in one call. */
export function buildAnalytics(rows: readonly AnalyticsRow[], titles: readonly string[]) {
  const levels = levelAverages(rows, titles)
  return {
    classAverage: classAverage(rows),
    levelAverages: levels,
    proficiency: proficiencyDistribution(rows),
    gaps: learningGaps(levels, rows),
  }
}

export type Analytics = ReturnType<typeof buildAnalytics>
