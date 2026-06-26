import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeQuestionInput } from '@/lib/questionBank'
import { rowToQuestionDTO } from '@/types/quiz'
import type { QuizQuestionRow } from '@/types/quiz'
import type { User } from '@/types/user'

interface RouteContext {
  params: Promise<{ id: string }>
}

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
 * PATCH /api/teacher/questions/[id]
 * Full update of a question, or a lightweight { isActive } toggle.
 */
export async function PATCH(request: Request, ctx: RouteContext) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { id } = await ctx.params
    const questionId = Number(id)
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid question ID' }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
    }

    // Lightweight active toggle (no full validation required)
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0] === 'isActive') {
      await execute('UPDATE quiz_questions SET is_active = ? WHERE id = ?', [body.isActive ? 1 : 0, questionId])
    } else {
      const { value, errors } = normalizeQuestionInput(body)
      if (!value) {
        return NextResponse.json({ success: false, message: 'Validation failed', data: errors }, { status: 422 })
      }
      await execute(
        `UPDATE quiz_questions
         SET level_number = ?, phase = ?, category = ?, prompt = ?, options = ?, correct_index = ?, is_active = ?
         WHERE id = ?`,
        [
          value.levelNumber,
          value.phase,
          value.category,
          value.prompt,
          JSON.stringify(value.options),
          value.correctIndex,
          value.isActive ? 1 : 0,
          questionId,
        ],
      )
    }

    const rows = await query<QuizQuestionRow>(
      `SELECT id, level_number, phase, category, prompt, options, correct_index, is_active, created_by, created_at, updated_at
       FROM quiz_questions WHERE id = ? LIMIT 1`,
      [questionId],
    )
    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Question updated', data: rowToQuestionDTO(rows[0]) })
  } catch (error) {
    console.error('[teacher/questions/[id]] PATCH', error)
    return NextResponse.json({ success: false, message: 'Failed to update question' }, { status: 500 })
  }
}

/**
 * DELETE /api/teacher/questions/[id]
 * Permanently removes a question from the bank.
 */
export async function DELETE(_request: Request, ctx: RouteContext) {
  try {
    const teacher = await requireTeacher()
    if (!teacher) return NextResponse.json({ success: false, message: 'Teacher access required' }, { status: 403 })

    const { id } = await ctx.params
    const questionId = Number(id)
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid question ID' }, { status: 400 })
    }

    const result = await execute('DELETE FROM quiz_questions WHERE id = ?', [questionId])
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, message: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Question deleted' })
  } catch (error) {
    console.error('[teacher/questions/[id]] DELETE', error)
    return NextResponse.json({ success: false, message: 'Failed to delete question' }, { status: 500 })
  }
}
