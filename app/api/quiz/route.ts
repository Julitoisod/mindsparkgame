import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sampleQuizSet } from '@/lib/questionBank'
import type { QuizQuestionRow } from '@/types/quiz'

const QUESTIONS_PER_PHASE = 5

/**
 * GET /api/quiz?level=N
 * Returns a freshly sampled quiz set for the level: 5 normal + 5 boss
 * questions, drawn one-per-category from the active pool with shuffled
 * order and shuffled answer options. Re-sampled on every request so
 * students cannot memorize a fixed sequence (reqs #6, #7, #10).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const level = Number(searchParams.get('level'))
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return NextResponse.json({ success: false, message: 'Invalid level' }, { status: 400 })
    }

    const rows = await query<QuizQuestionRow>(
      `SELECT id, level_number, phase, category, prompt, options, correct_index, is_active, created_by, created_at, updated_at
       FROM quiz_questions
       WHERE level_number = ? AND is_active = 1`,
      [level],
    )

    const normalRows = rows.filter(r => r.phase === 'normal')
    const bossRows = rows.filter(r => r.phase === 'boss')

    return NextResponse.json({
      success: true,
      data: {
        level,
        normal: sampleQuizSet(normalRows, QUESTIONS_PER_PHASE),
        boss: sampleQuizSet(bossRows, QUESTIONS_PER_PHASE),
      },
    })
  } catch (error) {
    console.error('[quiz] GET', error)
    return NextResponse.json({ success: false, message: 'Failed to load quiz' }, { status: 500 })
  }
}
