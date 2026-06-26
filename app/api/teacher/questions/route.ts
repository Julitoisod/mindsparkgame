import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeQuestionInput } from '@/lib/questionBank'
import { rowToQuestionDTO } from '@/types/quiz'
import type { QuizQuestionRow } from '@/types/quiz'
import type { User } from '@/types/user'

async function requireTeacher() {
  const session = await getSession()
  if (!session) return null
  const rows = await query<Pick<User, 'id' | 'role'>>(
    'SELECT id, role FROM users WHERE id = ? LIMIT 1',
    [session.userId],
  )
  if (!rows.length || rows[0].role !== 'teacher') return null
  return rows[0]
}

/**
 * GET /api/teacher/questions?level=&phase=&category=
 * Lists all questions in the shared bank (seed + teacher-authored).
 */
export async function GET(request: Request) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const conditions: string[] = []
    const params: Array<string | number> = []

    const level = Number(searchParams.get('level'))
    if (Number.isInteger(level) && level >= 1 && level <= 5) {
      conditions.push('level_number = ?')
      params.push(level)
    }
    const phase = searchParams.get('phase')
    if (phase === 'normal' || phase === 'boss') {
      conditions.push('phase = ?')
      params.push(phase)
    }
    const category = searchParams.get('category')
    if (category) {
      conditions.push('category = ?')
      params.push(category)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = await query<QuizQuestionRow>(
      `SELECT id, level_number, phase, category, prompt, options, correct_index, is_active, created_by, created_at, updated_at
       FROM quiz_questions
       ${where}
       ORDER BY level_number ASC, phase ASC, category ASC, id ASC`,
      params,
    )

    return NextResponse.json({ success: true, data: rows.map(rowToQuestionDTO) })
  } catch (error) {
    console.error('[teacher/questions] GET', error)
    return NextResponse.json({ success: false, message: 'Failed to load questions' }, { status: 500 })
  }
}

/**
 * POST /api/teacher/questions
 * Body: { levelNumber, phase, category, prompt, options[], correctIndex }
 */
export async function POST(request: Request) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    const { value, errors } = normalizeQuestionInput(body)
    if (!value) {
      return NextResponse.json({ success: false, message: 'Validation failed', data: errors }, { status: 422 })
    }

    const result = await execute(
      `INSERT INTO quiz_questions (level_number, phase, category, prompt, options, correct_index, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.levelNumber,
        value.phase,
        value.category,
        value.prompt,
        JSON.stringify(value.options),
        value.correctIndex,
        value.isActive ? 1 : 0,
        teacher.id,
      ],
    )

    const rows = await query<QuizQuestionRow>(
      `SELECT id, level_number, phase, category, prompt, options, correct_index, is_active, created_by, created_at, updated_at
       FROM quiz_questions WHERE id = ? LIMIT 1`,
      [result.insertId],
    )

    return NextResponse.json({ success: true, message: 'Question added', data: rowToQuestionDTO(rows[0]) }, { status: 201 })
  } catch (error) {
    console.error('[teacher/questions] POST', error)
    return NextResponse.json({ success: false, message: 'Failed to add question' }, { status: 500 })
  }
}
