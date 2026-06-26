import type { QuizPhase, QuizQuestionDTO, QuizQuestionRow } from '@/types/quiz'
import { MAX_OPTIONS, MAX_QUIZ_LEVELS, MIN_OPTIONS, rowToQuestionDTO } from '@/types/quiz'

export interface NormalizedQuestionInput {
  levelNumber: number
  phase: QuizPhase
  category: string
  prompt: string
  options: string[]
  correctIndex: number
  isActive: boolean
}

/** Render guard: any literal "blank" placeholder becomes "____" (req #8). */
export function normalizePromptBlanks(prompt: string): string {
  return prompt.replace(/\bblank\b/gi, '____')
}

/**
 * Validates and normalizes a teacher-submitted question payload.
 * Returns either { value } or { errors }.
 */
export function normalizeQuestionInput(
  body: Record<string, unknown>,
): { value?: NormalizedQuestionInput; errors?: Record<string, string> } {
  const errors: Record<string, string> = {}

  const levelNumber = Number(body.levelNumber)
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > MAX_QUIZ_LEVELS) {
    errors.levelNumber = `Level must be between 1 and ${MAX_QUIZ_LEVELS}.`
  }

  const phase = String(body.phase ?? 'normal') as QuizPhase
  if (phase !== 'normal' && phase !== 'boss') {
    errors.phase = 'Phase must be "normal" or "boss".'
  }

  const category = String(body.category ?? '').trim()
  if (category.length < 1 || category.length > 40) {
    errors.category = 'Category is required (max 40 characters).'
  }

  const prompt = normalizePromptBlanks(String(body.prompt ?? '').trim())
  if (prompt.length < 3) {
    errors.prompt = 'Question text is required.'
  }

  const rawOptions = Array.isArray(body.options) ? body.options : []
  const options = rawOptions.map(o => String(o).trim()).filter(o => o.length > 0)
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    errors.options = `Provide between ${MIN_OPTIONS} and ${MAX_OPTIONS} answer choices.`
  }

  const correctIndex = Number(body.correctIndex)
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    errors.correctIndex = 'Select which answer is correct.'
  }

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  if (Object.keys(errors).length > 0) return { errors }
  return { value: { levelNumber, phase, category, prompt, options, correctIndex, isActive } }
}

// ─── Sampling (shuffle + one-per-category + backup pool) ──────────────────────

function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Shuffle a question's options and remap the correct index. */
function shuffleOptions(question: QuizQuestionDTO): QuizQuestionDTO {
  const correctValue = question.options[question.correctIndex]
  const options = shuffle(question.options)
  const correctIndex = options.findIndex(o => o === correctValue)
  return { ...question, options, correctIndex: correctIndex >= 0 ? correctIndex : 0 }
}

/**
 * Builds a fresh quiz set from the active pool:
 *  - one question per category (req #10),
 *  - randomly drawn from the backup pool so repeats are unlikely (req #7),
 *  - question order and answer order shuffled (req #6).
 * Falls back to filling from the remaining pool when there are fewer
 * categories than `count`.
 */
export function sampleQuizSet(rows: QuizQuestionRow[], count: number): QuizQuestionDTO[] {
  const active = rows.filter(r => r.is_active).map(rowToQuestionDTO)
  if (active.length === 0) return []

  // Group by category
  const byCategory = new Map<string, QuizQuestionDTO[]>()
  for (const q of active) {
    const list = byCategory.get(q.category) ?? []
    list.push(q)
    byCategory.set(q.category, list)
  }

  const picked: QuizQuestionDTO[] = []
  const usedIds = new Set<number>()

  // One per category (categories visited in random order)
  for (const category of shuffle([...byCategory.keys()])) {
    if (picked.length >= count) break
    const pool = byCategory.get(category)!
    const choice = shuffle(pool)[0]
    picked.push(choice)
    usedIds.add(choice.id)
  }

  // Fill remaining slots from leftover questions (no repeats)
  if (picked.length < count) {
    const leftovers = shuffle(active.filter(q => !usedIds.has(q.id)))
    for (const q of leftovers) {
      if (picked.length >= count) break
      picked.push(q)
      usedIds.add(q.id)
    }
  }

  return shuffle(picked).slice(0, count).map(shuffleOptions)
}
