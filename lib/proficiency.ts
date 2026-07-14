// Translates quiz scores into proficiency bands and teacher recommendations
// (reqs #11, #13, #14). Bands follow DepEd Order No. 31, s.2012:
//   Beginning ≤74 · Developing 75-79 · Approaching Proficiency 80-84 ·
//   Proficient 85-89 · Advanced ≥90.

export type ProficiencyBand =
  | 'Not Started'
  | 'Beginning'
  | 'Developing'
  | 'Approaching Proficiency'
  | 'Proficient'
  | 'Advanced'

export interface ProficiencyResult {
  band: ProficiencyBand
  /** Tailwind-friendly tone key used by the UI. */
  tone: 'gray' | 'red' | 'orange' | 'yellow' | 'blue' | 'green'
  accuracy: number // 0-100
}

/** Maps an accuracy percentage to a DepEd DO 31 s.2012 proficiency band. */
export function proficiencyFromAccuracy(correct: number, total: number): ProficiencyResult {
  if (total <= 0) return { band: 'Not Started', tone: 'gray', accuracy: 0 }
  const accuracy = Math.round((correct / total) * 100)
  if (accuracy >= 90) return { band: 'Advanced', tone: 'green', accuracy }
  if (accuracy >= 85) return { band: 'Proficient', tone: 'blue', accuracy }
  if (accuracy >= 80) return { band: 'Approaching Proficiency', tone: 'yellow', accuracy }
  if (accuracy >= 75) return { band: 'Developing', tone: 'orange', accuracy }
  return { band: 'Beginning', tone: 'red', accuracy }
}

export interface CategoryStat {
  category: string
  levelNumber: number
  correct: number
  total: number
  accuracy: number
}

/**
 * Builds a plain-language recommendation from the student's overall band
 * and their weakest lessons (categories with the lowest accuracy).
 */
export function buildRecommendation(overall: ProficiencyResult, weakLessons: CategoryStat[]): string {
  if (overall.band === 'Not Started') {
    return 'Has not attempted any questions yet — unlock Level 1 and encourage them to begin.'
  }

  const weakest = weakLessons
    .filter(c => c.total >= 2 && c.accuracy < 60)
    .slice(0, 2)
    .map(c => c.category)

  switch (overall.band) {
    case 'Advanced':
      return weakest.length
        ? `Excelling overall. For mastery, add a little extra practice on ${weakest.join(' and ')}.`
        : 'Excelling across all lessons — consider offering enrichment or harder challenges.'
    case 'Proficient':
      return weakest.length
        ? `On track. Targeted review of ${weakest.join(' and ')} will push them to advanced.`
        : 'On track and steady — keep reinforcing with regular practice.'
    case 'Approaching Proficiency':
      return weakest.length
        ? `Almost proficient. A focused review of ${weakest.join(' and ')} should close the gap.`
        : 'Almost proficient — consistent practice will move them up a band.'
    case 'Developing':
      return weakest.length
        ? `Needs support. Re-teach ${weakest.join(' and ')}, then have them replay those levels.`
        : 'Needs steady practice to move from developing to proficient.'
    case 'Beginning':
    default:
      return weakest.length
        ? `Needs intervention. Focus first on ${weakest.join(' and ')} with guided practice before retrying.`
        : 'Needs intervention — sit with them through a guided run and re-teach the basics.'
  }
}
