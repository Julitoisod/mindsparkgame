// ─── Quiz Question Bank Types ─────────────────────────────────────────────────

export type QuizPhase = 'normal' | 'boss'

/** Raw row shape from the quiz_questions table. */
export interface QuizQuestionRow {
  id: number
  level_number: number
  phase: QuizPhase
  category: string
  prompt: string
  options: string // JSON array string
  correct_index: number
  is_active: number
  created_by: number | null
  created_at: string
  updated_at: string
}

/** Client-facing question shape (options parsed). */
export interface QuizQuestionDTO {
  id: number
  levelNumber: number
  phase: QuizPhase
  category: string
  prompt: string
  options: string[]
  correctIndex: number
  isActive: boolean
  isSeed: boolean
}

export const MAX_QUIZ_LEVELS = 5
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 4

export function safeParseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(o => String(o))
  } catch {
    /* fall through */
  }
  return []
}

export function rowToQuestionDTO(row: QuizQuestionRow): QuizQuestionDTO {
  return {
    id: row.id,
    levelNumber: row.level_number,
    phase: row.phase,
    category: row.category,
    prompt: row.prompt,
    options: safeParseOptions(row.options),
    correctIndex: row.correct_index,
    isActive: Boolean(row.is_active),
    isSeed: row.created_by === null,
  }
}
